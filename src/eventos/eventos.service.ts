import { randomBytes, randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/cognito";
import { correoDe, idOrdenable } from "../cuenta/comun";
import { PerfilService } from "../cuenta/perfil.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import {
	type DisenoBase,
	instantaneasDe,
	productosDe,
	vistaDeEvento,
	vistaDeParticipacion,
} from "./vistas";

type Cuerpo = Record<string, any>;
type Personalizacion = "libre" | "bloqueada" | "sin_personalizacion";

const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERSONALIZACIONES: Personalizacion[] = ["libre", "bloqueada", "sin_personalizacion"];
const MAX_ITEMS = 5;
const MAX_EVENTOS = 50;

/**
 * La foto de portada del evento.
 *
 * SVG SE QUEDA FUERA por lo mismo que en la biblioteca de imágenes: un SVG
 * puede traer `<script>` y esto se sirve desde NUESTRO origen (`/medios/…`).
 */
const TIPOS_DE_FOTO: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

/** Una foto de teléfono ronda los 5 MB. */
const MAXIMO_FOTO = 10 * 1024 * 1024;

/**
 * Los eventos, del lado de quien los organiza.
 *
 * Un evento es una selección temporal de uno a cinco productos del mismo
 * taller, con un enlace que se comparte. Cada invitado manda su participación
 * por separado: NO ES UN CARRITO COMPARTIDO, así que no hay nada que dos
 * personas puedan pisarse.
 *
 * LAS REGLAS SE FIJAN ANTES DE PUBLICAR. Un evento publicado ya tiene gente
 * eligiendo tallas y diseñando sobre la base; cambiarle los productos o la
 * personalización dejaría participaciones que no cuadran con lo que se ofrece.
 */
@Injectable()
export class EventosService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
		private readonly perfil: PerfilService,
	) {}

	async listar(quien: Identidad) {
		correoDe(quien);

		const filas = await this.db
			.select()
			.from(e.eventos)
			.where(eq(e.eventos.compradorId, quien.sub))
			.orderBy(desc(e.eventos.creadoEn));

		const productos = await productosDe(
			this.db,
			filas.map((f) => f.id),
		);
		return filas.map((f) => vistaDeEvento(f, productos.get(f.id) ?? []));
	}

	async obtener(quien: Identidad, id: string) {
		const evento = await this.suyoOFalla(quien, id);

		const [productos, participaciones] = await Promise.all([
			productosDe(this.db, [id]),
			this.db
				.select()
				.from(e.eventoParticipaciones)
				.where(eq(e.eventoParticipaciones.eventoId, id))
				.orderBy(desc(e.eventoParticipaciones.creadoEn)),
		]);

		return {
			...vistaDeEvento(evento, productos.get(id) ?? []),
			participaciones: participaciones.map(vistaDeParticipacion),
		};
	}

	async crear(quien: Identidad, cuerpo: Cuerpo) {
		correoDe(quien);

		const [{ cuantos }] = await this.db
			.select({ cuantos: count() })
			.from(e.eventos)
			.where(eq(e.eventos.compradorId, quien.sub));
		if (cuantos >= MAX_EVENTOS) {
			throw new ConflictException(`No puedes tener más de ${MAX_EVENTOS} eventos.`);
		}

		const contenido = await this.leerContenido(cuerpo ?? {}, quien.sub);

		await this.perfil.asegurar(quien);

		const id = idOrdenable();

		await this.db.transaction(async (tx) => {
			await tx.insert(e.eventos).values({
				id,
				compradorId: quien.sub,
				/* Opaco y sin orden: el enlace no puede dejar adivinar el de otro
				   evento. La unicidad la garantiza el índice, no esto. */
				codigo: randomBytes(9).toString("base64url"),
				estado: "borrador",
				...contenido.evento,
			});
			await tx
				.insert(e.eventoProductos)
				.values(contenido.productos.map((p) => ({ ...p, eventoId: id })));
		});

		return this.obtenerSinParticipaciones(id);
	}

	async actualizar(quien: Identidad, id: string, cuerpo: Cuerpo) {
		const anterior = await this.suyoOFalla(quien, id);
		if (anterior.estado !== "borrador") {
			throw new ConflictException("Un evento publicado ya no puede cambiar sus reglas.");
		}

		const previos = (await productosDe(this.db, [id])).get(id) ?? [];
		const contenido = await this.leerContenido(cuerpo ?? {}, quien.sub, previos);

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.eventos)
				.set({ ...contenido.evento, actualizadoEn: new Date() })
				.where(eq(e.eventos.id, id));

			/* Se reescriben todos, pero CON EL ID QUE YA TENÍAN: `leerContenido`
			   lo conserva para los que siguen. Es un borrador, así que todavía
			   no hay diseños de invitados colgando de ellos. */
			await tx.delete(e.eventoProductos).where(eq(e.eventoProductos.eventoId, id));
			await tx
				.insert(e.eventoProductos)
				.values(contenido.productos.map((p) => ({ ...p, eventoId: id })));
		});

		return this.obtenerSinParticipaciones(id);
	}

	async publicar(quien: Identidad, id: string) {
		const anterior = await this.suyoOFalla(quien, id);
		if (anterior.estado !== "borrador") {
			throw new ConflictException("Ese evento ya fue publicado.");
		}

		const ahora = new Date();
		if (!anterior.cierraEn || anterior.cierraEn <= ahora) {
			throw new BadRequestException("La fecha de cierre tiene que estar en el futuro.");
		}

		const productos = (await productosDe(this.db, [id])).get(id) ?? [];
		const incompleto = productos.find(
			(p) => p.personalizacion === "bloqueada" && !p.disenoBase,
		);
		if (incompleto) {
			const nombre = (incompleto.instantanea as { nombre?: string }).nombre;
			throw new BadRequestException(
				`Crea el diseño base de ${nombre ?? "uno de los productos"} antes de publicar.`,
			);
		}

		/* El `estado = 'borrador'` en el WHERE y no sólo arriba: dos clics
		   seguidos en "Publicar" no deben poder pasar los dos. */
		const [publicado] = await this.db
			.update(e.eventos)
			.set({ estado: "publicado", publicadoEn: ahora, actualizadoEn: ahora })
			.where(and(eq(e.eventos.id, id), eq(e.eventos.estado, "borrador")))
			.returning({ id: e.eventos.id });
		if (!publicado) throw new ConflictException("Ese evento ya fue publicado.");

		return this.obtenerSinParticipaciones(id);
	}

	async cerrar(quien: Identidad, id: string) {
		const anterior = await this.suyoOFalla(quien, id);
		if (anterior.estado !== "publicado") {
			throw new ConflictException("Sólo se puede cerrar un evento publicado.");
		}

		const ahora = new Date();
		await this.db
			.update(e.eventos)
			.set({ estado: "cerrado", cerradoEn: ahora, actualizadoEn: ahora })
			.where(eq(e.eventos.id, id));

		return this.obtenerSinParticipaciones(id);
	}

	async configurarProducto(quien: Identidad, id: string, itemId: string, cuerpo: Cuerpo) {
		const anterior = await this.suyoOFalla(quien, id);
		if (anterior.estado !== "borrador") {
			throw new ConflictException("Las reglas de personalización se fijan antes de publicar.");
		}

		const c = cuerpo ?? {};
		const personalizacion = String(c.personalizacion ?? "") as Personalizacion;
		if (!PERSONALIZACIONES.includes(personalizacion)) {
			throw new BadRequestException("Elige una regla de personalización válida.");
		}

		const arteId = c.arteId === null ? null : String(c.arteId ?? "");
		if (arteId && !UUID.test(arteId)) {
			throw new BadRequestException("La referencia del diseño base no es válida.");
		}

		const [producto] = UUID.test(itemId)
			? await this.db
					.select()
					.from(e.eventoProductos)
					.where(and(eq(e.eventoProductos.id, itemId), eq(e.eventoProductos.eventoId, id)))
			: [];
		if (!producto) throw new NotFoundException("Ese producto no pertenece al evento.");

		/* LA RUTA LA ARMA EL SERVIDOR con el `sub` del token: el navegador sólo
		   dice qué arte suyo es, y así no puede apuntar la base a la carpeta de
		   otra persona. `null` explícito la quita; no mandarlo la deja igual. */
		const disenoBase: DisenoBase | null = arteId
			? { arteId, ruta: `/medios/plantillas/${quien.sub}/${arteId}/diseno.json` }
			: c.arteId === null
				? null
				: ((producto.disenoBase as DisenoBase | null) ?? null);

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.eventoProductos)
				.set({ personalizacion, disenoBase })
				.where(eq(e.eventoProductos.id, itemId));
			await tx
				.update(e.eventos)
				.set({ actualizadoEn: new Date() })
				.where(eq(e.eventos.id, id));
		});

		return this.obtenerSinParticipaciones(id);
	}

	async borrar(quien: Identidad, id: string) {
		const evento = await this.suyoOFalla(quien, id);
		if (evento.estado !== "borrador") {
			throw new ConflictException("Sólo se puede borrar un borrador.");
		}

		await this.db.delete(e.eventos).where(eq(e.eventos.id, id));
		return { ok: true };
	}

	/**
	 * Firma la subida de la portada y devuelve dónde va a quedar.
	 *
	 * EL DESTINO LO DECIDE EL SERVIDOR: la carpeta lleva el `sub` del token, así
	 * que nadie escribe en la de otro por muy bien que arme la petición.
	 *
	 * NO TOCA EL EVENTO. La ruta se guarda cuando el organizador manda el
	 * formulario; si abandona a mitad, en S3 queda un archivo suelto y el evento
	 * no apunta a una imagen que nunca terminó de subir.
	 */
	async firmarFoto(quien: Identidad, cuerpo: Cuerpo) {
		correoDe(quien);

		const tipo = String(cuerpo?.tipo ?? "");
		const extension = TIPOS_DE_FOTO[tipo];
		if (!extension) {
			throw new BadRequestException(
				`Ese tipo de imagen no se puede usar (${tipo || "sin tipo"}). Usa PNG, JPG o WebP.`,
			);
		}

		const bytes = Number(cuerpo?.bytes ?? 0);
		if (!Number.isFinite(bytes) || bytes <= 0) {
			throw new BadRequestException("Falta el tamaño de la imagen.");
		}
		if (bytes > MAXIMO_FOTO) {
			throw new BadRequestException(
				`Esa imagen pesa demasiado. El máximo son ${Math.round(MAXIMO_FOTO / 1024 / 1024)} MB.`,
			);
		}

		return this.almacen.urlParaMedios(
			`medios/eventos/${quien.sub}/${randomUUID()}.${extension}`,
			tipo,
			bytes,
		);
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	/**
	 * Lo que devuelven las escrituras: el evento SIN participaciones, como la
	 * Lambda. Sólo `GET /cuenta/eventos/:id` las trae.
	 */
	private async obtenerSinParticipaciones(id: string) {
		const [evento] = await this.db.select().from(e.eventos).where(eq(e.eventos.id, id));
		const productos = await productosDe(this.db, [id]);
		return vistaDeEvento(evento, productos.get(id) ?? []);
	}

	/**
	 * El evento, si es de quien lo pide.
	 *
	 * "No existe" también cuando es de otro: decir "no es tuyo" confirmaría que
	 * el id existe.
	 */
	private async suyoOFalla(quien: Identidad, id: string) {
		correoDe(quien);
		if (!ID.test(id)) throw new NotFoundException("Ese evento no existe.");

		const [evento] = await this.db
			.select()
			.from(e.eventos)
			.where(and(eq(e.eventos.id, id), eq(e.eventos.compradorId, quien.sub)));
		if (!evento) throw new NotFoundException("Ese evento no existe.");
		return evento;
	}

	private async leerContenido(
		c: Cuerpo,
		sub: string,
		previos: (typeof e.eventoProductos.$inferSelect)[] = [],
	) {
		const nombre = String(c.nombre ?? "").trim();
		const descripcion = String(c.descripcion ?? "").trim();
		if (!nombre || nombre.length > 80) {
			throw new BadRequestException("Pon un nombre de hasta 80 caracteres.");
		}
		if (descripcion.length > 500) {
			throw new BadRequestException("La descripción no puede pasar de 500 caracteres.");
		}

		const abreEn = fechaValida(c.abreEn, "apertura");
		const cierraEn = fechaValida(c.cierraEn, "cierre");
		if (cierraEn <= abreEn) {
			throw new BadRequestException("El cierre debe ser posterior a la apertura.");
		}

		const direccion = leerDireccion(c.direccion);

		const ids = [...new Set((Array.isArray(c.productos) ? c.productos : []).map(String))];
		if (!ids.length || ids.length > MAX_ITEMS || ids.some((id) => !UUID.test(id))) {
			throw new BadRequestException(`Elige entre 1 y ${MAX_ITEMS} productos válidos.`);
		}

		const instantaneas = await instantaneasDe(this.db, ids);

		const productos = ids.map((productoId, orden) => {
			const instantanea = instantaneas.get(productoId);
			if (!instantanea) {
				throw new BadRequestException("Uno de los productos ya no está publicado.");
			}
			const anterior = previos.find((p) => p.productoId === productoId);
			return {
				/* El id del renglón es parte del contrato público: diseños base y
				   participaciones apuntan a él. Editar fechas o dirección no puede
				   regenerarlo y desprender el arte que ya configuró el organizador. */
				id: anterior?.id ?? randomUUID(),
				productoId,
				orden,
				personalizacion: anterior?.personalizacion ?? ("libre" as const),
				disenoBase: anterior?.disenoBase ?? null,
				instantanea,
			};
		});

		/* UN SOLO TALLER porque la producción se consolida en un lote para un
		   taller y se entrega en una sola dirección. Con dos, habría que partir
		   el evento en dos envíos y nadie ha decidido cómo se cobra eso. */
		const talleres = new Set(productos.map((p) => p.instantanea.proveedorId));
		if (talleres.size !== 1 || talleres.has("")) {
			throw new BadRequestException(
				"Por ahora, todos los productos del evento deben ser del mismo taller.",
			);
		}

		return {
			evento: {
				nombre,
				descripcion: descripcion || null,
				portadaUrl: leerFoto(c.imagen, sub),
				abreEn,
				cierraEn,
				direccion,
			},
			productos,
		};
	}
}

function fechaValida(valor: unknown, nombre: string) {
	const fecha = new Date(String(valor ?? ""));
	if (Number.isNaN(fecha.valueOf())) {
		throw new BadRequestException(`Falta una fecha de ${nombre} válida.`);
	}
	return fecha;
}

/**
 * Comprueba que la portada esté en la carpeta de quien la manda.
 *
 * El cuerpo llega del navegador, así que sin esto un organizador podría
 * apuntar la portada de su evento a cualquier ruta del bucket.
 */
function leerFoto(valor: unknown, sub: string) {
	if (valor === null || valor === undefined || valor === "") return null;

	const ruta = String(valor);
	const permitida = new RegExp(
		`^/medios/eventos/${sub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9a-f-]{36}\\.(png|jpg|webp)$`,
	);
	if (!permitida.test(ruta)) {
		throw new BadRequestException("Esa foto no es válida. Vuelve a subirla.");
	}
	return ruta;
}

/**
 * La dirección de entrega del evento.
 *
 * A diferencia de la guardada en el perfil, aquí va COMPLETA o no va: es
 * adonde el taller manda el lote entero.
 */
function leerDireccion(valor: unknown) {
	const d = (valor ?? {}) as Cuerpo;
	const direccion = {
		calle: String(d.calle ?? "").trim(),
		numero: String(d.numero ?? "").trim(),
		interior: String(d.interior ?? "").trim() || null,
		colonia: String(d.colonia ?? "").trim(),
		ciudad: String(d.ciudad ?? "").trim(),
		estado: String(d.estado ?? "").trim(),
		cp: String(d.cp ?? "")
			.replace(/\D/g, "")
			.slice(0, 5),
		referencias: String(d.referencias ?? "").trim() || null,
	};

	if (
		!direccion.calle ||
		!direccion.numero ||
		!direccion.colonia ||
		!direccion.ciudad ||
		!direccion.estado ||
		direccion.cp.length !== 5
	) {
		throw new BadRequestException("Completa la dirección donde se entregará el evento.");
	}
	return direccion;
}
