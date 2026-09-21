import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { ArteService } from "../subidas/arte.service";
import {
	type DisenoBase,
	estadoPublico,
	precioVigente,
	productosDe,
	vistaDeParticipacion,
	vistaDeProducto,
} from "./vistas";

type Cuerpo = Record<string, any>;
type Evento = typeof e.eventos.$inferSelect;
type ProductoDeEvento = ReturnType<typeof vistaDeProducto>;

const CODIGO = /^[a-zA-Z0-9_-]{8,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El bucket borra `eventos/` a los 90 días; el apunte caduca igual. */
const VIDA_DISENO_MS = 90 * 24 * 3600 * 1000;

/**
 * Lo que ve y hace quien entra por el enlace de un evento. SIN CUENTA.
 *
 * NADA DE LO QUE MANDA EL NAVEGADOR DECIDE EL PRECIO NI LA RUTA DEL ARTE. El
 * precio se vuelve a leer de la base por cada línea, y el diseño se acepta
 * sólo si este mismo evento lo firmó para ese mismo producto y el archivo
 * está de verdad en S3.
 */
@Injectable()
export class EventosPublicoService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
		private readonly arte: ArteService,
	) {}

	/**
	 * El evento como lo ve el invitado.
	 *
	 * DE LA DIRECCIÓN SÓLO VAN CIUDAD Y ESTADO: el enlace se comparte en grupos
	 * de WhatsApp, y la calle y el número del organizador no tienen por qué
	 * viajar con él.
	 */
	async obtener(codigo: string) {
		const { evento, productos } = await this.porCodigo(codigo);
		const direccion = (evento.direccion ?? {}) as Cuerpo;

		return {
			id: evento.id,
			codigo: evento.codigo,
			nombre: evento.nombre,
			descripcion: evento.descripcion ?? null,
			imagen: evento.portadaUrl ?? null,
			estado: estadoPublico(evento),
			abreEn: evento.abreEn?.toISOString() ?? null,
			cierraEn: evento.cierraEn?.toISOString() ?? null,
			entrega: {
				ciudad: direccion.ciudad ?? "",
				estado: direccion.estado ?? "",
			},
			productos,
		};
	}

	/**
	 * Firma las subidas del diseño de un invitado para UN producto del evento.
	 *
	 * El prefijo lleva el evento y el producto: una referencia firmada para la
	 * playera no sirve para la gorra del mismo enlace. Y se apunta el diseño,
	 * porque al participar es ESTE apunte —no lo que diga el navegador— lo que
	 * dice de quién es.
	 */
	async firmarSubidas(codigo: string, cuerpo: Cuerpo) {
		const { evento, productos } = await this.porCodigo(codigo);
		if (estadoPublico(evento) !== "abierto") {
			throw new ConflictException("Este evento no está recibiendo diseños.");
		}

		const eventoItemId = String(cuerpo?.eventoItemId ?? "");
		const producto = productos.find((p) => p.id === eventoItemId);
		if (!producto) throw new BadRequestException("Ese producto no pertenece al evento.");
		if (producto.personalizacion === "sin_personalizacion") {
			throw new ConflictException("Este producto no admite personalización.");
		}

		const resultado = await this.arte.firmar(cuerpo, `eventos/${evento.id}/${eventoItemId}`);

		const diseno = resultado.subidas.find((s) => s.tipo === "diseno");
		if (!diseno) throw new BadRequestException("Falta el archivo editable del diseño.");

		await this.db.insert(e.eventoDisenos).values({
			id: resultado.itemId,
			eventoId: evento.id,
			eventoProductoId: eventoItemId,
			ruta: diseno.ruta,
			expiraEn: new Date(Date.now() + VIDA_DISENO_MS),
		});

		return resultado;
	}

	async participar(codigo: string, cuerpo: Cuerpo) {
		const { evento, productos } = await this.porCodigo(codigo);
		if (estadoPublico(evento) !== "abierto") {
			throw new ConflictException("Este evento no está recibiendo participaciones.");
		}

		const c = cuerpo ?? {};

		const intentoId = String(c.intentoId ?? "");
		if (!UUID.test(intentoId)) {
			throw new BadRequestException("Falta identificar este intento.");
		}

		const participante = {
			nombre: String(c.participante?.nombre ?? "").trim(),
			email: String(c.participante?.email ?? "")
				.trim()
				.toLowerCase(),
			whatsapp:
				String(c.participante?.whatsapp ?? "")
					.replace(/[^\d+]/g, "")
					.slice(0, 18) || null,
		};
		if (!participante.nombre || !CORREO.test(participante.email)) {
			throw new BadRequestException("Escribe tu nombre y un correo válido.");
		}

		const permitidos = new Map(productos.map((p) => [p.id, p]));

		const crudas = Array.isArray(c.lineas) ? c.lineas : [];
		if (!crudas.length || crudas.length > 10) {
			throw new BadRequestException("Elige al menos un producto.");
		}

		const lineas = [];
		let subtotal = 0;

		for (const linea of crudas) {
			const permitido = permitidos.get(String(linea?.eventoItemId));
			if (!permitido) throw new BadRequestException("Ese producto no pertenece al evento.");

			const piezas = Math.trunc(Number(linea.piezas ?? 0));
			if (!(piezas >= 1 && piezas <= 50)) {
				throw new BadRequestException("La cantidad debe estar entre 1 y 50.");
			}

			const talla = String(linea.talla ?? "");
			const color = String(linea.color ?? "");
			if (!permitido.tallas.includes(talla)) {
				throw new BadRequestException("Esa talla no está disponible.");
			}
			if (color && !permitido.colores.some((v) => v.nombre === color)) {
				throw new BadRequestException("Ese color no está disponible.");
			}

			/* El precio del momento, no el de la instantánea: si el taller lo
			   cambió después de armar el evento, se cobra el de hoy. */
			const unitario = await precioVigente(this.db, permitido.productoId);
			if (unitario === null) {
				throw new ConflictException("Uno de los productos ya no está disponible.");
			}

			const total = Math.round(unitario * piezas * 100) / 100;
			subtotal += total;

			lineas.push({
				id: randomUUID(),
				eventoItemId: permitido.id,
				productoId: permitido.productoId,
				producto: permitido.nombre,
				talla,
				color: color || null,
				piezas,
				unitario,
				total,
				diseno: await this.leerDiseno(evento, permitido, linea.diseno),
			});
		}

		const [nueva] = await this.db
			.insert(e.eventoParticipaciones)
			.values({
				id: intentoId,
				eventoId: evento.id,
				participante,
				lineas,
				subtotal: (Math.round(subtotal * 100) / 100).toFixed(2),
				/* La pasarela añadirá `pagado`, `fallido` y `reembolsado` por
				   webhook. Sólo las pagadas entrarán al lote de producción. */
				estadoPago: "pendiente",
			})
			.onConflictDoNothing()
			.returning();
		if (nueva) return vistaDeParticipacion(nueva);

		/* Ya estaba: es un reintento del mismo envío. Se devuelve la que quedó
		   guardada, no la que se acaba de calcular. */
		const [existente] = await this.db
			.select()
			.from(e.eventoParticipaciones)
			.where(
				and(
					eq(e.eventoParticipaciones.id, intentoId),
					eq(e.eventoParticipaciones.eventoId, evento.id),
				),
			);
		if (!existente) throw new ConflictException("Ese intento ya se usó en otro evento.");
		return vistaDeParticipacion(existente);
	}

	/**
	 * Frontera de confianza entre una referencia del navegador y el arte que
	 * firmó este evento.
	 *
	 * Sin diseño, la línea se queda con la base del organizador (o con nada).
	 */
	private async leerDiseno(
		evento: Evento,
		producto: ProductoDeEvento,
		valor: unknown,
	): Promise<{ carritoId: string; ruta: string } | DisenoBase | null> {
		if (valor === null || valor === undefined) return producto.disenoBase ?? null;

		if (producto.personalizacion === "sin_personalizacion") {
			throw new BadRequestException("Ese producto no admite un diseño de invitado.");
		}

		const carritoId = String((valor as Cuerpo).carritoId ?? "");
		if (!UUID.test(carritoId)) {
			throw new BadRequestException("La referencia del diseño no es válida.");
		}

		const [apunte] = await this.db
			.select()
			.from(e.eventoDisenos)
			.where(and(eq(e.eventoDisenos.id, carritoId), eq(e.eventoDisenos.eventoId, evento.id)));
		if (!apunte || apunte.eventoProductoId !== producto.id) {
			throw new BadRequestException("Ese diseño no pertenece a este producto del evento.");
		}

		const rutaEsperada = `/eventos/${evento.id}/${producto.id}/${carritoId}/diseno.json`;
		if (apunte.ruta !== rutaEsperada) {
			throw new BadRequestException("La referencia del diseño no es válida.");
		}

		if (!(await this.almacen.existe(rutaEsperada.slice(1)))) {
			throw new BadRequestException("El diseño todavía no terminó de subir. Inténtalo otra vez.");
		}

		return { carritoId, ruta: rutaEsperada };
	}

	private async porCodigo(codigo: string) {
		if (!CODIGO.test(codigo)) throw new NotFoundException("Ese evento no existe.");

		const [evento] = await this.db.select().from(e.eventos).where(eq(e.eventos.codigo, codigo));
		/* Un borrador tiene código desde que se crea, pero su enlace no existe
		   hasta publicarlo: en DynamoDB el candado del código se escribía al
		   publicar. Se responde igual que si no existiera. */
		if (!evento || evento.estado === "borrador") {
			throw new NotFoundException("Ese evento no existe.");
		}

		const productos = ((await productosDe(this.db, [evento.id])).get(evento.id) ?? []).map(
			vistaDeProducto,
		);
		return { evento, productos };
	}
}
