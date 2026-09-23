import {
	Global,
	Inject,
	Module,
	type OnApplicationShutdown,
} from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { COLAS, type NombreDeCola } from "./colas";

export const REDIS = Symbol("REDIS");
export const COLA = (nombre: NombreDeCola) => `COLA_${nombre}`;

/**
 * BullMQ para TODO el sistema, incluido el bordado.
 *
 * El worker de bordado es Python (Ink/Stitch) y BullMQ es de TypeScript, así
 * que lo consume un proceso TS que invoca al binario dentro de la misma
 * imagen. La alternativa —una Redis Stream con contrato propio para Python—
 * obligaba a mantener reintentos, backoff y cola de muertos dos veces.
 */
@Global()
@Module({
	providers: [
		{
			provide: REDIS,
			inject: [ENTORNO],
			useFactory: (env: Entorno) =>
				new IORedis(env.REDIS_URL, {
					/* BullMQ lo exige: con un tope, un bloqueo de lectura que agota
					   los reintentos mata al worker en vez de esperar al siguiente
					   trabajo. */
					maxRetriesPerRequest: null,
				}),
		},
		...Object.values(COLAS).map((nombre) => ({
			provide: COLA(nombre),
			inject: [REDIS],
			useFactory: (conexion: IORedis) =>
				new Queue(nombre, {
					connection: conexion,
					defaultJobOptions: {
						attempts: 5,
						backoff: { type: "exponential" as const, delay: 2_000 },
						/* Se conservan unos pocos para poder mirar qué pasó, no todos:
						   Redis es memoria y una cola que nunca se vacía la llena. */
						removeOnComplete: { count: 100 },
						removeOnFail: { count: 1_000 },
					},
				}),
		})),
	],
	exports: [REDIS, ...Object.values(COLAS).map((n) => COLA(n))],
})
export class ColasModule implements OnApplicationShutdown {
	constructor(@Inject(REDIS) private readonly conexion: IORedis) {}

	/** Igual que el pool de Postgres: sin esto el contenedor muere por SIGKILL. */
	async onApplicationShutdown() {
		await this.conexion.quit();
	}
}
