import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { AvisosService } from "../avisos/avisos.service";
import { COLAS } from "../colas/colas";
import { COLA } from "../colas/colas.module";
import type { Correo } from "../correo/correo.service";
import {
	pedidoEntregado,
	pedidoEnviado,
	pedidoListo,
} from "../correo/plantillas";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { ajustarExistencias } from "./existencias";
import { PedidosService } from "./pedidos.service";
import { paraTaller } from "./vistas";

type Estado = (typeof e.estadoPedido.enumValues)[number];

/**
 * A dónde puede ir cada estado.
 *
 * SE DECLARA EN VEZ DE ACEPTAR CUALQUIER SALTO para que la bitácora signifique
 * algo: sin esto, un pedido podría aparecer "entregado" sin haber pasado por
 * producción, y el historial dejaría de contar lo que de verdad ocurrió.
 *
 * Volver atrás no está permitido a propósito — si un taller se equivoca, la
 * corrección la hace el admin y queda anotada.
 */
const TRANSICIONES: Record<Estado, Estado[]> = {
	/* Cancelar SÓLO desde `nuevo`, o sea antes de que el taller lo empiece.
	   Antes se podía desde `produccion` y no debía: ahí la prenda ya se está
	   fabricando y las existencias ya se consumieron, así que anularlo no es
	   cancelar sino devolver, que es otro flujo con sus propias reglas. */
	nuevo: ["produccion", "cancelado"],
	produccion: ["listo"],
	/* De `listo` se sale por donde diga la entrega, y eso no cabe en esta
	   tabla: lo afina `permitidos()`. */
	listo: ["enviado", "entregado"],
	enviado: ["entregado"],
	entregado: [],
	cancelado: [],
};

/**
 * Los destinos válidos para ESTE pedido.
 *
 * La tabla sola no basta porque el camino depende de cómo se entrega:
 *
 * - Con **envío**, saltar de `listo` a `entregado` se saltaría el hecho de que
 *   el paquete viajó, y `entregado` acabaría siendo la palabra del taller
 *   sobre algo que sabe la paquetería.
 * - Con **recoger**, `enviado` no significa nada: nadie lo envía.
 */
function permitidos(metodoEntrega: string, actual: Estado): Estado[] {
	const destinos = TRANSICIONES[actual] ?? [];
	if (actual !== "listo") return destinos;

	return metodoEntrega === "recoger"
		? destinos.filter((x) => x !== "enviado")
		: destinos.filter((x) => x !== "entregado");
}

@Injectable()
export class PedidosTallerService {
	private readonly log = new Logger(PedidosTallerService.name);

	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly pedidos: PedidosService,
		private readonly avisos: AvisosService,
		@Inject(COLA(COLAS.correo)) private readonly correo: Queue<Correo>,
	) {}

	/** Su bandeja: sus pedidos, del más nuevo al más viejo. */
	async listar(tallerId: string) {
		const filas = await this.db
			.select()
			.from(e.pedidos)
			.where(eq(e.pedidos.tallerId, tallerId))
			.orderBy(desc(e.pedidos.creadoEn));

		return (await this.pedidos.conPartidas(filas)).map(paraTaller);
	}

	async obtener(tallerId: string, id: string) {
		return paraTaller(await this.suyoOFalla(tallerId, id));
	}

	/**
	 * Mueve el pedido y deja constancia.
	 *
	 * LA CONDICIÓN SOBRE EL ESTADO ANTERIOR NO ES DECORATIVA: dos personas del
	 * mismo taller con el panel abierto pueden apretar a la vez, y sin ella la
	 * segunda pisaría a la primera y la bitácora contaría una historia falsa.
	 *
	 * En DynamoDB era una `ConditionExpression`; aquí es el `WHERE estado =
	 * :actual` del UPDATE. Si no devuelve fila, alguien se adelantó.
	 */
	async cambiarEstado(
		tallerId: string,
		id: string,
		cuerpo: Record<string, any>,
	) {
		const destino = String(cuerpo?.estado ?? "") as Estado;
		const nota = String(cuerpo?.nota ?? "").trim() || null;

		const pedido = await this.suyoOFalla(tallerId, id);
		const actual = pedido.estado;

		const destinos = permitidos(pedido.metodoEntrega, actual);

		if (!destinos.includes(destino)) {
			throw new BadRequestException(
				destinos.length === 0
					? `Un pedido ${actual} ya no se mueve`
					: `De ${actual} sólo puede pasar a ${destinos.join(" o ")}`,
			);
		}

		const movido = await this.db.transaction(async (tx) => {
			const [fila] = await tx
				.update(e.pedidos)
				.set({ estado: destino, actualizadoEn: new Date() })
				.where(and(eq(e.pedidos.id, id), eq(e.pedidos.estado, actual)))
				.returning();

			/* Nadie actualizó: alguien movió el pedido entre que lo leímos y
			   ahora. La transacción se deshace entera. */
			if (!fila) return null;

			await tx.insert(e.pedidoBitacora).values({
				pedidoId: id,
				estado: destino,
				autor: "taller",
				nota,
			});

			/* Dentro de la MISMA transacción que el cambio de estado, no después:
			   si se devolviera fuera y el proceso muriera en medio, el pedido
			   quedaría cancelado sin haber devuelto las prendas. En DynamoDB esto
			   iba después porque no cabía en la transacción del pedido. */
			if (destino === "cancelado") {
				await this.devolverExistencias(tx, pedido);
			}

			return fila;
		});

		if (!movido) {
			throw new ConflictException(
				"Alguien movió este pedido mientras lo mirabas. Recárgalo.",
			);
		}

		/* Los avisos van DESPUÉS de que la transacción cerró bien: si dos
		   personas del taller le dan a la vez, sólo una llega aquí y sale un
		   solo aviso. No pueden tumbar el cambio de estado. */
		await this.avisos.alTaller(tallerId, {
			tipo: "pedido-movido",
			pedidoId: id,
			estado: destino,
		});

		const [completo] = await this.pedidos.conPartidas([movido]);
		await this.avisarAlComprador(tallerId, completo, destino);

		return paraTaller(completo);
	}

	/**
	 * Los correos que se le mandan al comprador cuando el taller mueve el pedido.
	 *
	 * VAN DESPUÉS DEL UPDATE CON SU CONDICIÓN: si dos personas del taller le dan
	 * a la vez, sólo una llega hasta aquí y sale UN correo.
	 *
	 * DE `produccion` NO SE AVISA A PROPÓSITO: entre que entra el pedido y que
	 * está hecho no hay nada que el comprador pueda hacer, y un correo que no
	 * pide nada enseña a ignorar los que sí importan.
	 */
	private async avisarAlComprador(
		tallerId: string,
		pedido: Awaited<ReturnType<PedidosService["conPartidas"]>>[number],
		destino: Estado,
	) {
		if (!pedido.correo) return;

		const producto = pedido.lineas[0]?.nombre ?? "Tu pedido";
		const nombre = pedido.nombre ?? "";

		try {
			if (destino === "listo") {
				/* Con `recoger` ÉSTE es el correo del pedido: sin él, quien compró no
				   tiene forma de enterarse de que puede ir por su prenda, porque
				   después de esto ya no hay más estados que le avisen de nada. Por
				   eso lleva la dirección del taller y su WhatsApp.

				   Con envío se manda igual, pero es sólo informativo: el que importa
				   es el de "va en camino", que trae el rastreo. */
				const taller =
					pedido.metodoEntrega === "recoger"
						? (
								await this.db
									.select()
									.from(e.talleres)
									.where(eq(e.talleres.id, tallerId))
									.limit(1)
							)[0]
						: undefined;

				const r = taller?.recoleccion as Record<string, any> | null;

				await this.correo.add(
					"pedido-listo",
					pedidoListo({
						para: pedido.correo,
						nombre,
						folio: pedido.folio,
						producto,
						piezas: pedido.piezas,
						metodo: pedido.metodoEntrega,
						taller: taller ? (taller.nombrePublico ?? taller.nombre) : null,
						direccion: r?.cp
							? [r.calle, r.numero, r.colonia, r.ciudad, r.estado, r.cp]
									.filter(Boolean)
									.join(", ")
							: null,
						whatsapp: taller?.whatsapp ?? null,
					}),
				);
			}

			if (destino === "enviado") {
				const guia = pedido.guia as Record<string, any> | null;

				/* SIN NÚMERO DE RASTREO NO SE MANDA: un "va en camino" sin nada que
				   rastrear no le sirve a nadie. El mismo correo lo manda el webhook
				   de la paquetería cuando es ella quien mueve el pedido. */
				if (guia?.rastreo) {
					await this.correo.add(
						"pedido-enviado",
						pedidoEnviado({
							para: pedido.correo,
							nombre,
							folio: pedido.folio,
							paqueteria: guia.paqueteria ?? "la paquetería",
							rastreo: String(guia.rastreo),
							rastreoUrl: guia.rastreoUrl ?? null,
						}),
					);
				}
			}

			/* Sólo llega aquí lo que se RECOGIÓ en el taller: con envío,
			   `entregado` lo pone la paquetería por webhook y `permitidos()`
			   cierra este camino. */
			if (destino === "entregado") {
				await this.correo.add(
					"pedido-entregado",
					pedidoEntregado({
						para: pedido.correo,
						nombre,
						folio: pedido.folio,
						producto,
						metodo: pedido.metodoEntrega,
					}),
				);
			}
		} catch (error) {
			/* El pedido YA se movió y el taller ya lo vio moverse. Un correo que
			   no se pudo encolar no puede deshacer eso. */
			this.log.error(
				`No pude encolar el aviso de ${pedido.folio}: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Devuelve al inventario lo que el pedido había descontado.
	 *
	 * SÓLO AL CANCELAR. Un pedido entregado no devuelve nada: esas prendas se
	 * fueron.
	 *
	 * SE DEVUELVE CONTRA EL PRODUCTO ACTUAL, no contra el de la compra. Si el
	 * taller cambió las tallas desde entonces, la variante puede ya no existir;
	 * `ON CONFLICT DO UPDATE` la crea con lo devuelto, que es más útil que
	 * perderlo.
	 */
	private async devolverExistencias(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		pedido: Awaited<ReturnType<PedidosTallerService["suyoOFalla"]>>,
	) {
		for (const linea of pedido.lineas) {
			if (!linea.productoId) continue;

			for (const talla of linea.tallas) {
				await ajustarExistencias(tx, {
					productoId: linea.productoId,
					color: linea.color,
					talla: talla.size,
					delta: talla.piezas,
				});
			}
		}
	}

	/**
	 * Trae el pedido sólo si es de quien lo pide.
	 *
	 * EL MISMO MENSAJE si no existe y si es de otro taller: distinguirlos
	 * convierte esta ruta en una forma de averiguar qué pedidos existen.
	 *
	 * En DynamoDB la separación entre talleres la imponía la llave del índice;
	 * aquí es este `AND taller_id = …`, así que vive en UN solo sitio y los
	 * controladores no lo repiten.
	 */
	private async suyoOFalla(tallerId: string, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.pedidos)
			.where(and(eq(e.pedidos.id, id), eq(e.pedidos.tallerId, tallerId)))
			.limit(1);

		if (!fila) throw new NotFoundException("No encontramos ese pedido");

		const [completo] = await this.pedidos.conPartidas([fila]);
		return completo;
	}
}
