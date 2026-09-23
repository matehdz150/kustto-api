import { createHmac, timingSafeEqual } from "node:crypto";
import {
	Inject,
	Injectable,
	Logger,
	UnauthorizedException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { AvisosService } from "../avisos/avisos.service";
import { COLAS } from "../colas/colas";
import { COLA } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import type { Correo } from "../correo/correo.service";
import { pedidoEntregado, pedidoEnviado } from "../correo/plantillas";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

type Estado = (typeof e.estadoPedido.enumValues)[number];

/** Lo que Skydropx llama el estado del paquete, y a dónde lo llevamos. */
const MAPA: Record<string, Estado> = {
	// Ya está con la paquetería: salió del taller.
	picked_up: "enviado",
	in_transit: "enviado",
	last_mile: "enviado",
	delivery_attempt: "enviado",
	/* En sucursal esperando a que el cliente pase. Para la paquetería su
	   trabajo terminó; para quien compró, todavía no lo tiene. Se queda en
	   `enviado` hasta que llegue `delivered`. */
	delivered_to_branch: "enviado",
	delivered: "entregado",
};

/**
 * Estados en los que el envío se torció.
 *
 * No se mueven a ningún sitio todavía —no existe un estado para eso— pero se
 * anotan en la bitácora para que el taller los vea. Dejarlos pasar en silencio
 * significaría un paquete devuelto que nadie mira durante semanas.
 */
const PROBLEMAS = new Set([
	"exception",
	"in_return",
	"canceled",
	"destroyed",
	"retained",
]);

/**
 * Cuánto ha avanzado un pedido. SÓLO SE SUBE, NUNCA SE BAJA.
 *
 * Los avisos de la paquetería no llegan en orden —un `delivered` puede
 * adelantar a un `in_transit`— así que un estado sólo avanza. Sin esto la
 * bitácora contaría una historia falsa, que es justo lo que la máquina de
 * estados existe para evitar.
 */
const ORDEN: Estado[] = [
	"nuevo",
	"produccion",
	"listo",
	"enviado",
	"entregado",
];

/**
 * El webhook de la paquetería.
 *
 * ABIERTA PORQUE LA LLAMA UN TERCERO, pero NO sin autenticar: se verifica la
 * firma HMAC del cuerpo crudo y se rechaza si falta el secreto.
 */
@Injectable()
export class RastreoService {
	private readonly log = new Logger(RastreoService.name);

	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(COLA(COLAS.correo)) private readonly correo: Queue<Correo>,
		private readonly avisos: AvisosService,
	) {}

	async recibir(
		cuerpo: Record<string, any>,
		crudo: string | undefined,
		autorizacion: string | undefined,
	) {
		this.verificarFirma(crudo, autorizacion);

		/* La forma REAL del aviso, comprobada con uno de Skydropx:
		 *
		 *   data.type                           = "packages"
		 *   data.attributes.status              = "in_transit"   <- NO tracking_status
		 *   data.relationships.shipment.data.id                  <- NO attributes.shipment_id
		 *
		 * Los dos campos que se esperaban se llamaban de otra forma, así que el
		 * primer aviso real entró y se ignoró en silencio. Se leen los nombres
		 * buenos primero y se dejan los otros como respaldo: esta API ya cambió
		 * de nombres antes y aceptar ambos cuesta una línea. */
		const datos = cuerpo?.data ?? cuerpo;
		const atributos = datos?.attributes ?? {};

		const envioId = String(
			datos?.relationships?.shipment?.data?.id ??
				atributos.shipment_id ??
				datos?.shipment_id ??
				cuerpo?.shipment_id ??
				"",
		);

		/* EN MINÚSCULAS SIEMPRE. El panel de Skydropx lista los eventos como
		   `In_transit` y `Picked_up`, y si el aviso llegara con esa forma la
		   tabla de arriba no lo reconocería: el pedido no avanzaría y no habría
		   error a la vista. Normalizar quita una clase entera de fallo mudo. */
		const estadoSkydropx = String(
			atributos.status ?? atributos.tracking_status ?? "",
		)
			.trim()
			.toLowerCase();

		/* La devolución viaja como bandera aparte, no como estado: un paquete
		   puede ir `in_transit` y estar volviéndose. Sin mirar esto, una
		   devolución en curso se vería como un envío normal. */
		const devuelto = atributos.returned === true;

		if (!envioId || !estadoSkydropx) {
			/* Un aviso que no entendemos no es un error de Skydropx ni nuestro: se
			   contesta 200 para que no lo reintente eternamente, y al log entero. */
			this.log.warn(
				`Aviso de rastreo sin envío o sin estado: ${crudo?.slice(0, 400)}`,
			);
			return { ok: true, ignorado: true };
		}

		const [apunte] = await this.db
			.select()
			.from(e.enviosDePaqueteria)
			.where(eq(e.enviosDePaqueteria.envioId, envioId))
			.limit(1);

		if (!apunte) {
			this.log.warn(`Aviso de un envío que no es nuestro: ${envioId}`);
			return { ok: true, ignorado: true };
		}

		const destino = devuelto ? undefined : MAPA[estadoSkydropx];
		const problema = devuelto || PROBLEMAS.has(estadoSkydropx);

		/* `created` y cualquier estado nuevo que inventen: se ignora y ya. */
		if (!destino && !problema) return { ok: true, ignorado: true };

		await this.anotar(apunte.pedidoId, estadoSkydropx, destino, problema, {
			rastreo: atributos.tracking_number || null,
			rastreoUrl: atributos.tracking_url_provider || null,
		});

		return { ok: true };
	}

	private async anotar(
		pedidoId: string,
		estadoSkydropx: string,
		destino: Estado | undefined,
		problema: boolean,
		rastreo: { rastreo: string | null; rastreoUrl: string | null },
	) {
		const movido = await this.db.transaction(async (tx) => {
			const [pedido] = await tx
				.select()
				.from(e.pedidos)
				.where(eq(e.pedidos.id, pedidoId))
				.limit(1);

			if (!pedido) return null;

			/* SÓLO SE AVANZA. Ver el comentario de `ORDEN`. */
			const avanza =
				destino !== undefined &&
				ORDEN.indexOf(destino) > ORDEN.indexOf(pedido.estado);

			const guia = pedido.guia as Record<string, any> | null;

			/* El número de rastreo puede llegar en el aviso antes de que el panel
			   lo consulte. Se rellena si falta; nunca se pisa el que ya está. */
			const guiaNueva =
				guia && (rastreo.rastreo || rastreo.rastreoUrl)
					? {
							...guia,
							rastreo: guia.rastreo ?? rastreo.rastreo,
							rastreoUrl: guia.rastreoUrl ?? rastreo.rastreoUrl,
						}
					: guia;

			await tx
				.update(e.pedidos)
				.set({
					...(avanza ? { estado: destino } : {}),
					guia: guiaNueva,
					actualizadoEn: new Date(),
				})
				.where(eq(e.pedidos.id, pedidoId));

			await tx.insert(e.pedidoBitacora).values({
				pedidoId,
				/* Si no avanza, la entrada conserva el estado que tiene: la
				   bitácora cuenta lo que pasó, y lo que pasó es un aviso, no un
				   cambio. */
				estado: avanza ? destino! : pedido.estado,
				autor: "paqueteria",
				nota: problema
					? `La paquetería reporta: ${estadoSkydropx}`
					: `Aviso de la paquetería: ${estadoSkydropx}`,
			});

			const [primera] = await tx
				.select({ nombre: e.pedidoPartidas.nombre })
				.from(e.pedidoPartidas)
				.where(eq(e.pedidoPartidas.pedidoId, pedidoId))
				.orderBy(e.pedidoPartidas.orden)
				.limit(1);

			return {
				pedido,
				avanzoA: avanza ? destino! : null,
				primerProducto: primera?.nombre ?? null,
			};
		});

		if (!movido) return;

		/* Los avisos van fuera de la transacción: el pedido ya está anotado y un
		   correo que no sale no puede deshacerlo. */
		await this.avisos.alTaller(movido.pedido.tallerId, {
			tipo: "pedido-movido",
			pedidoId,
			estado: movido.avanzoA ?? movido.pedido.estado,
		});

		if (!movido.avanzoA) return;

		/* EL MISMO CORREO LO MANDA TAMBIÉN EL TALLER cuando es él quien mueve el
		   pedido a mano. Los dos caminos existen a propósito; lo que no puede
		   pasar es que salgan los dos, y eso lo impide que aquí sólo se avise
		   cuando el estado AVANZÓ de verdad. */
		const guia = movido.pedido.guia as Record<string, any> | null;

		if (movido.avanzoA === "enviado") {
			const numero = guia?.rastreo ?? rastreo.rastreo;

			/* SIN NÚMERO DE RASTREO NO SE MANDA: un "va en camino" sin nada que
			   rastrear no le sirve a nadie y gasta el único aviso que de verdad
			   se lee. */
			if (numero) {
				await this.correo.add(
					"pedido-enviado",
					pedidoEnviado({
						para: movido.pedido.correo,
						nombre: movido.pedido.nombre ?? "",
						folio: movido.pedido.folio,
						paqueteria: guia?.paqueteria ?? "la paquetería",
						rastreo: String(numero),
						rastreoUrl: guia?.rastreoUrl ?? rastreo.rastreoUrl,
					}),
				);
			}
		}

		if (movido.avanzoA === "entregado") {
			await this.correo.add(
				"pedido-entregado",
				pedidoEntregado({
					para: movido.pedido.correo,
					nombre: movido.pedido.nombre ?? "",
					folio: movido.pedido.folio,
					producto: movido.primerProducto ?? "Tu pedido",
					metodo: movido.pedido.metodoEntrega,
				}),
			);
		}
	}

	/**
	 * La firma, o nada.
	 *
	 * `timingSafeEqual` exige buffers del mismo largo, así que se compara el
	 * largo antes: es público —lo dice el algoritmo— y no filtra nada.
	 *
	 * SIN SECRETO SE RECHAZA. Una ruta que un tercero puede llamar y que mueve
	 * pedidos no puede quedarse abierta porque falte una variable de entorno.
	 */
	private verificarFirma(
		crudo: string | undefined,
		cabecera: string | undefined,
	) {
		const secreto = this.env.SKYDROPX_WEBHOOK_SECRETO;

		if (!secreto) {
			this.log.error(
				"Webhook de rastreo sin SKYDROPX_WEBHOOK_SECRETO: rechazado",
			);
			throw new UnauthorizedException();
		}

		if (!crudo || !cabecera) throw new UnauthorizedException();

		/* Llega como "HMAC <firma>"; se acepta también la firma pelada por si
		   cambian el formato, que ya ha pasado con esta API. */
		const recibida = cabecera.replace(/^HMAC\s+/i, "").trim();
		const esperada = createHmac("sha512", secreto).update(crudo).digest("hex");

		const a = Buffer.from(recibida);
		const b = Buffer.from(esperada);

		if (a.length !== b.length || !timingSafeEqual(a, b)) {
			throw new UnauthorizedException();
		}
	}
}
