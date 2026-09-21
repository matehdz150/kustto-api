import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

/** Lo que se congela en el pedido sobre cómo viaja. */
export type EnvioElegido = {
	cotizacionId: string;
	tarifaId: string;
	paqueteria: string;
	servicio: string;
	precio: number;
	diasEstimados: number | null;
};

type Tarifa = {
	id: string;
	paqueteria: string;
	servicio: string;
	precio: number;
	dias?: number | null;
};

/**
 * La parte de envíos que el checkout necesita, y nada más.
 *
 * ESTO NO ES EL MÓDULO DE ENVÍOS todavía: cotizar contra la paquetería —con su
 * límite de 2 peticiones por segundo, sus ~5 s de espera y el webhook de
 * rastreo— son otras 650 líneas que van aparte. Aquí sólo está lo que el
 * checkout tiene que poder hacer: mirar una cotización ya guardada y quedarse
 * con la tarifa que el comprador eligió.
 *
 * Y HAY UN CAMBIO RESPECTO A LA LAMBDA. Allí esto volvía a preguntarle a
 * Skydropx por la cotización en mitad del checkout: una llamada a un tercero
 * dentro de la petición que espera quien está pagando, contra un servicio con
 * límite de dos por segundo. Aquí la cotización se guarda cuando se pide y se
 * lee de nuestra base. El efecto es el mismo —el precio sale de nuestro lado,
 * nunca del cuerpo— sin atar el cobro a que un tercero conteste.
 */
@Injectable()
export class EnviosService {
	constructor(@Inject(DB) private readonly db: Db) {}

	/**
	 * La tarifa elegida, leída de la cotización guardada.
	 *
	 * EL PRECIO NO VIENE DEL CUERPO. Del navegador sólo se aceptan dos ids; el
	 * importe sale de aquí. Es la misma regla que con el producto: lo que
	 * decide cuánto se cobra no lo manda quien paga.
	 */
	async envioDelPedido(valor: unknown): Promise<EnvioElegido> {
		const v = (valor ?? {}) as Record<string, unknown>;
		const cotizacionId = String(v.cotizacionId ?? "").trim();
		const tarifaId = String(v.tarifaId ?? "").trim();

		if (!cotizacionId || !tarifaId) {
			throw new BadRequestException("Falta elegir cómo se envía");
		}

		const [cotizacion] = await this.db
			.select()
			.from(e.cotizacionesDeEnvio)
			.where(
				and(
					eq(e.cotizacionesDeEnvio.id, cotizacionId),
					/* Caducada es lo mismo que inexistente: un precio de hace una
					   semana no es un precio. */
					gt(e.cotizacionesDeEnvio.expiraEn, new Date()),
				),
			)
			.limit(1);

		const tarifas = (cotizacion?.respuesta as { tarifas?: Tarifa[] } | null)
			?.tarifas;
		const tarifa = tarifas?.find((t) => t.id === tarifaId);

		/* Cobrar un precio que ya no existe es peor que pedir un clic más. */
		if (!tarifa) {
			throw new BadRequestException(
				"Esa opción de envío ya no está disponible. Vuelve a elegirla.",
			);
		}

		return {
			cotizacionId,
			tarifaId,
			paqueteria: tarifa.paqueteria,
			servicio: tarifa.servicio,
			precio: Number(tarifa.precio),
			diasEstimados: tarifa.dias ?? null,
		};
	}
}
