import { Inject, Injectable, Logger } from "@nestjs/common";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";

export type AvisoAlTaller =
	| { tipo: "pedido-nuevo"; pedidoId: string; folio: string }
	| { tipo: "pedido-movido"; pedidoId: string; estado: string };

/**
 * Avisar al panel del taller de que pasó algo, sin que recargue.
 *
 * SE MANDA UN AVISO CORTO, NO EL PEDIDO. El navegador lo recibe y recarga su
 * lista por la API de siempre. Mandar los datos por aquí duplicaría las reglas
 * de qué ve cada taller en un segundo camino, y dos caminos con las mismas
 * reglas es como acaban divergiendo.
 *
 * SE PUBLICA EN REDIS y no se escribe a una conexión directamente. En AWS esto
 * era una API Gateway WebSocket con una tabla de conexiones; aquí el gateway
 * de Nest se suscribe a este canal. Con varias instancias de la API, la que
 * atiende el checkout casi nunca es la que tiene abierta la conexión del
 * taller, así que escribir directo sólo funcionaría con una sola instancia.
 *
 * NUNCA LANZA. Corre después de que el pedido ya está escrito: si el aviso no
 * sale, el taller se entera al recargar, y eso no puede tumbar una compra
 * cobrada.
 */
@Injectable()
export class AvisosService {
	private readonly log = new Logger(AvisosService.name);

	constructor(@Inject(REDIS) private readonly redis: IORedis) {}

	async alTaller(tallerId: string, aviso: AvisoAlTaller) {
		try {
			await this.redis.publish(
				`taller:${tallerId}`,
				JSON.stringify({ ...aviso, en: new Date().toISOString() }),
			);
		} catch (error) {
			this.log.warn(
				`No se pudo avisar al taller ${tallerId}: ${(error as Error).message}`,
			);
		}
	}
}
