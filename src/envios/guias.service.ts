import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { armarPaquete } from "./envios.service";
import {
	type Contacto,
	type Direccion,
	type Paquete,
	SkydropxClient,
	type Tarifa,
} from "./skydropx";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class GuiasService {
	private readonly log = new Logger(GuiasService.name);

	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly skydropx: SkydropxClient,
	) {}

	/**
	 * Comprar la guía con el peso REAL.
	 *
	 * POR QUÉ SE VUELVE A COTIZAR EN VEZ DE USAR LA DEL CHECKOUT. La cotización
	 * que vio el comprador salió de un peso estimado: la suma de lo que pesa
	 * cada talla y una caja apilada a ojo. El paquete de verdad pesa otra cosa.
	 * Comprar sobre la vieja imprime una etiqueta con un peso que no es, y la
	 * paquetería repesa y factura la diferencia semanas después, cuando ya
	 * nadie se acuerda del pedido.
	 *
	 * Así que se cotiza otra vez con lo que el taller acaba de medir, se busca
	 * la MISMA paquetería y servicio que eligió el comprador —cambiarle la
	 * paquetería a alguien que ya pagó es cambiarle el trato— y se compra ésa.
	 *
	 * LA DIFERENCIA SE ANOTA, NO SE COBRA. Está decidido que la paga el taller,
	 * pero hoy no existen pagos al taller: no hay de dónde descontar. Se guarda
	 * como cargo pendiente en su cuenta, desglosado por pedido — un total sin
	 * desglose no se puede defender ante quien lo va a pagar. Si no se
	 * registrara desde ahora, cuando existan las liquidaciones no habría nada
	 * que cobrar hacia atrás.
	 */
	async comprar(tallerId: string, pedidoId: string, cuerpo: Record<string, any>) {
		const pedido = await this.suyoOFalla(tallerId, pedidoId);

		if (pedido.metodoEntrega !== "envio") {
			throw new BadRequestException("Este pedido lo recoge el cliente contigo");
		}

		const guiaVieja = pedido.guia as Record<string, any> | null;

		/* Un envío fallido NO bloquea: si el anterior murió, el cobro se
		   reembolsó y el pedido se quedaría sin guía para siempre, sin forma de
		   arreglarlo desde el panel. Sólo bloquea una guía viva. */
		if (guiaVieja?.envioId && guiaVieja.estado !== "error") {
			throw new ConflictException("Este pedido ya tiene guía");
		}

		const envio = pedido.envio as Record<string, any> | null;
		if (!envio?.tarifaId) {
			throw new BadRequestException("Este pedido no trae envío cotizado");
		}

		/* La paquetería exige un teléfono del DESTINATARIO para poder entregar,
		   igual que exige el del taller para recoger. Sin él responde 422, que
		   salía como "Error interno" y no decía qué faltaba ni de quién.

		   Hoy el checkout ya lo exige, así que esto sólo se dispara con pedidos
		   viejos — que existen. Por eso se comprueba aquí y se dice a quién hay
		   que pedírselo. */
		if (!String(pedido.whatsapp ?? "").trim()) {
			throw new BadRequestException(
				"Este pedido no trae teléfono del cliente y la paquetería lo exige " +
					"para entregar. Pídeselo y escríbenos para añadirlo.",
			);
		}

		const paquete = leerPaquete(cuerpo);
		const taller = await this.tallerOFalla(tallerId);
		const destino = comoDireccion(pedido.direccion as Record<string, any> | null);

		// 1 · Recotizar con lo que se midió de verdad.
		const cotizacionId = await this.skydropx.cotizar(
			taller.direccion,
			destino,
			paquete,
		);
		const tarifa = await this.esperarTarifa(cotizacionId, envio);

		// 2 · Comprar la etiqueta.
		const guia = await this.skydropx.comprarGuia(
			cotizacionId,
			tarifa.id,
			{ ...taller.direccion, ...taller.contacto },
			{
				...destino,
				nombre: pedido.nombre ?? "",
				telefono: pedido.whatsapp ?? "",
				email: pedido.correo,
				calle: String((pedido.direccion as any)?.calle ?? ""),
				numero: String((pedido.direccion as any)?.numero ?? ""),
				referencias: (pedido.direccion as any)?.referencias ?? null,
			},
			paquete,
		);

		/* 3 · Lo que costó de más (o de menos) frente a lo que pagó el comprador.
		 *
		 * Manda lo que Skydropx nos COBRÓ, no la tarifa que había cotizado: son
		 * dos números distintos y el que sale de la cuenta es el primero. Si por
		 * lo que sea no lo devuelve, se cae a la tarifa. */
		const costoReal = guia.costo ?? tarifa.precio;
		const diferencia =
			Math.round((costoReal - Number(envio.precio ?? 0)) * 100) / 100;

		const ahora = new Date();

		/* LA GUÍA, EL APUNTE DEL ENVÍO Y EL CARGO, EN UNA TRANSACCIÓN.
		 *
		 * En DynamoDB el cargo se escribía aparte y con un `.catch()` que sólo
		 * gritaba: no cabía en la misma escritura que el pedido, así que una
		 * caída en medio dejaba una guía comprada sin cargo anotado — dinero
		 * que nadie iba a cobrar. Aquí cabe. */
		const actualizado = await this.db.transaction(async (tx) => {
			const [fila] = await tx
				.update(e.pedidos)
				.set({
					guia: { ...guia, compradaEn: ahora.toISOString() },
					/* Lo que se midió y se compró DE VERDAD, al lado de lo que se
					   cotizó. Los dos números hacen falta para explicar la diferencia. */
					envio: {
						...envio,
						real: { ...paquete, cotizacionId, tarifaId: tarifa.id, costoReal },
					},
					actualizadoEn: ahora,
				})
				.where(eq(e.pedidos.id, pedidoId))
				.returning();

			/* El apunte del envío al pedido: lo necesita el webhook de rastreo,
			   que sólo recibe el id del envío. */
			await tx
				.insert(e.enviosDePaqueteria)
				.values({ envioId: guia.envioId, pedidoId })
				.onConflictDoNothing();

			await tx
				.update(e.talleres)
				.set({
					saldoEnvios: sql`${e.talleres.saldoEnvios} + ${diferencia}`,
					cargosEnvio: sql`coalesce(${e.talleres.cargosEnvio}, '[]'::jsonb) || ${JSON.stringify([{ pedidoId, diferencia, en: ahora.toISOString() }])}::jsonb`,
				})
				.where(eq(e.talleres.id, tallerId));

			return fila;
		});

		return { guia: actualizado.guia, diferencia };
	}

	/**
	 * Vuelve a preguntar por la etiqueta.
	 *
	 * LA ETIQUETA NO LLEGA AL COMPRAR: el envío nace `in_progress` y cada
	 * paquetería tarda lo suyo —con ampm seguía sin etiqueta minutos después—.
	 * El panel llama a esto hasta que aparece.
	 *
	 * Sólo escribe si hay novedad, para no reescribir el pedido en cada sondeo.
	 */
	async refrescar(tallerId: string, pedidoId: string) {
		const pedido = await this.suyoOFalla(tallerId, pedidoId);
		const guiaVieja = pedido.guia as Record<string, any> | null;

		if (!guiaVieja?.envioId) {
			throw new NotFoundException("Este pedido no tiene guía");
		}
		if (guiaVieja.etiquetaUrl) return { guia: guiaVieja, lista: true };

		const guia = await this.skydropx.consultarEnvio(String(guiaVieja.envioId));

		/* Un envío puede MORIR, y hasta que se leyó `workflow_status` no había
		   forma de saberlo: sin etiqueta se veía igual que uno lento. Cuando
		   pasa, Skydropx reembolsa el cobro y la etiqueta no va a llegar nunca.
		   Se guarda el motivo y se deja de esperar. */
		if (guia.estado === "error") {
			const muerta = { ...guiaVieja, estado: guia.estado, error: guia.error };
			await this.guardarGuia(pedidoId, muerta);
			return { guia: muerta, lista: false, fallo: guia.error };
		}

		if (!guia.etiquetaUrl) return { guia: guiaVieja, lista: false };

		/* El costo y la fecha de compra son los de LA COMPRA, no los de ahora:
		   reescribirlos con lo que devuelva una consulta posterior borraría el
		   número con el que se calculó la diferencia. */
		const viva = {
			...guiaVieja,
			rastreo: guia.rastreo,
			rastreoUrl: guia.rastreoUrl,
			etiquetaUrl: guia.etiquetaUrl,
		};

		await this.guardarGuia(pedidoId, viva);
		return { guia: viva, lista: true };
	}

	/**
	 * Espera a que la cotización traiga la paquetería que eligió el comprador.
	 *
	 * SE BUSCA POR PAQUETERÍA Y SERVICIO, NO POR ID: los ids son de cada
	 * cotización y ésta es nueva. Si ya no está —cambió la zona con el peso, o
	 * la paquetería dejó de cubrir— se cae a la más barata que no tarde más de
	 * lo prometido, porque llegar tarde es peor que llegar por otra empresa.
	 *
	 * Aquí SÍ se espera dentro de la petición, al revés que al cotizar para el
	 * checkout. Quien espera es el taller, que acaba de pulsar "comprar guía" y
	 * no puede seguir sin ella, y ya no hay un límite de 29 segundos encima.
	 */
	private async esperarTarifa(
		cotizacionId: string,
		elegido: Record<string, any>,
	): Promise<Tarifa> {
		let tarifas: Tarifa[] = [];

		for (let intento = 0; intento < 10; intento++) {
			await esperar(800);
			const r = await this.skydropx.consultarCotizacion(cotizacionId);
			tarifas = r.tarifas;
			if (r.lista) break;
		}

		if (tarifas.length === 0) {
			throw new BadRequestException(
				"La paquetería no cotizó este paquete. Revisa el peso y las medidas.",
			);
		}

		const misma = tarifas.find(
			(t) =>
				t.paqueteria === elegido.paqueteria && t.servicio === elegido.servicio,
		);
		if (misma) return misma;

		const prometidos = Number(elegido.diasEstimados ?? 99);
		const aTiempo = tarifas
			.filter((t) => (t.dias ?? 99) <= prometidos)
			.sort((a, b) => a.precio - b.precio)[0];

		return aTiempo ?? tarifas[0];
	}

	private async guardarGuia(pedidoId: string, guia: Record<string, unknown>) {
		await this.db
			.update(e.pedidos)
			.set({ guia, actualizadoEn: new Date() })
			.where(eq(e.pedidos.id, pedidoId));
	}

	private async tallerOFalla(tallerId: string) {
		const [taller] = await this.db
			.select()
			.from(e.talleres)
			.where(eq(e.talleres.id, tallerId))
			.limit(1);

		const r = taller?.recoleccion as Record<string, any> | null;

		if (!r?.cp) {
			throw new BadRequestException(
				"Te falta la dirección de recolección en tu perfil",
			);
		}

		const direccion: Direccion = {
			cp: String(r.cp),
			estado: String(r.estado ?? ""),
			ciudad: String(r.ciudad ?? ""),
			colonia: String(r.colonia ?? ""),
		};

		const contacto: Contacto = {
			nombre: taller.nombrePublico ?? taller.nombre,
			telefono: String(taller.whatsapp ?? ""),
			email: taller.correo,
			calle: String(r.calle ?? ""),
			numero: String(r.numero ?? ""),
			referencias: (r.referencias as string | null) ?? null,
		};

		if (!contacto.telefono) {
			throw new BadRequestException(
				"Te falta el teléfono en tu perfil y la paquetería lo exige para recoger",
			);
		}

		return { direccion, contacto };
	}

	/** El mismo mensaje si no existe y si es de otro taller. Ver `pedidos`. */
	private async suyoOFalla(tallerId: string, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.pedidos)
			.where(and(eq(e.pedidos.id, id), eq(e.pedidos.tallerId, tallerId)))
			.limit(1);

		if (!fila) throw new NotFoundException("No encontramos ese pedido");
		return fila;
	}
}

function comoDireccion(d: Record<string, any> | null): Direccion {
	return {
		cp: String(d?.cp ?? ""),
		estado: String(d?.estado ?? ""),
		ciudad: String(d?.ciudad ?? ""),
		colonia: String(d?.colonia ?? ""),
	};
}

/**
 * Las medidas REALES, las que mide el taller con el paquete ya hecho.
 *
 * Éstas sí vienen del cuerpo, y es la excepción que confirma la regla: nadie
 * más que quien tiene la caja delante las sabe. Lo que no viene del cuerpo es
 * lo que se cobra — el precio sale de recotizar con estas medidas.
 */
function leerPaquete(cuerpo: Record<string, any>): Paquete {
	const numero = (v: unknown, nombre: string, tope: number) => {
		const n = Number(v);
		if (!Number.isFinite(n) || n <= 0) {
			throw new BadRequestException(`Falta ${nombre} del paquete`);
		}
		if (n > tope) {
			throw new BadRequestException(`${nombre} no puede pasar de ${tope}`);
		}
		return Math.round(n * 100) / 100;
	};

	return {
		largo: numero(cuerpo?.largo, "el largo", 200),
		ancho: numero(cuerpo?.ancho, "el ancho", 200),
		alto: numero(cuerpo?.alto, "el alto", 200),
		peso: numero(cuerpo?.peso, "el peso", 70),
	};
}
