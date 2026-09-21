import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";
import { DB, type Db } from "../db/db.module";

/**
 * Si esto contesta, el contenedor sirve.
 *
 * COMPRUEBA POSTGRES Y REDIS de verdad, no devuelve `{ok:true}` a secas: el
 * healthcheck de Docker decide si el contenedor entra al balanceador, y uno
 * que contesta 200 con la base caída manda tráfico a un agujero.
 */
@Controller("salud")
export class SaludController {
	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(REDIS) private readonly redis: IORedis,
	) {}

	@Get()
	async revisar() {
		const [postgres, redis] = await Promise.all([
			this.db.execute(sql`select 1`).then(
				() => true,
				() => false,
			),
			this.redis.ping().then(
				() => true,
				() => false,
			),
		]);

		return { ok: postgres && redis, postgres, redis };
	}
}
