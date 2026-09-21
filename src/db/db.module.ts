import {
	Global,
	Inject,
	Module,
	type OnApplicationShutdown,
} from "@nestjs/common";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import * as esquema from "./esquema";

export const DB = Symbol("DB");
export const POOL = Symbol("POOL");

export type Db = NodePgDatabase<typeof esquema>;

@Global()
@Module({
	providers: [
		{
			provide: POOL,
			inject: [ENTORNO],
			useFactory: (env: Entorno) =>
				new Pool({
					connectionString: env.DATABASE_URL,
					/**
					 * El tope de conexiones es POR PROCESO, y la imagen corre la API y
					 * los workers por separado. Con varias réplicas esto se multiplica:
					 * Postgres por defecto admite 100, así que 10 aquí deja sitio para
					 * ~8 procesos antes de tener que poner un pgbouncer delante.
					 */
					max: 10,
					idleTimeoutMillis: 30_000,
				}),
		},
		{
			provide: DB,
			inject: [POOL],
			useFactory: (pool: Pool) =>
				drizzle(pool, { schema: esquema, casing: "snake_case" }),
		},
	],
	exports: [DB, POOL],
})
export class DbModule implements OnApplicationShutdown {
	constructor(@Inject(POOL) private readonly pool: Pool) {}

	/**
	 * Cerrar el pool a mano.
	 *
	 * Sin esto el contenedor no termina de morir hasta que caducan las
	 * conexiones ociosas, y Docker acaba mandándole un SIGKILL a los 10 s. En
	 * un despliegue eso son peticiones cortadas a media respuesta.
	 */
	async onApplicationShutdown() {
		await this.pool.end();
	}
}
