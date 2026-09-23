import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { centavosDelPaquete } from "./precio";

type Estado = (typeof e.estadoPaquete.enumValues)[number];
type Paquete = typeof e.paquetes.$inferSelect;
type Pieza = { productoId: string; cantidad: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugDe(nombre: string) {
	return (
		nombre
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "categoria"
	);
}

function texto(v: unknown, campo: string, limite: number, obligatorio = true) {
	const valor = String(v ?? "").trim();
	if ((obligatorio && !valor) || valor.length > limite) {
		throw new BadRequestException(
			`${campo}: escribe de 1 a ${limite} caracteres`,
		);
	}
	return valor || null;
}

function ids(v: unknown, campo: string, maximo: number) {
	if (!Array.isArray(v) || v.length > maximo) {
		throw new BadRequestException(`${campo}: lista inválida`);
	}
	const resultado = v.map(String);
	if (
		resultado.some((id) => !UUID.test(id)) ||
		new Set(resultado).size !== resultado.length
	) {
		throw new BadRequestException(`${campo}: ids inválidos o repetidos`);
	}
	return resultado;
}

function piezas(v: unknown): Pieza[] {
	if (!Array.isArray(v) || v.length > 20) {
		throw new BadRequestException("Elige hasta 20 productos para el paquete");
	}
	const resultado = v.map((item) => {
		const productoId = String(item?.productoId ?? "");
		const cantidad = Number(item?.cantidad);
		if (
			!UUID.test(productoId) ||
			!Number.isInteger(cantidad) ||
			cantidad < 1 ||
			cantidad > 100
		) {
			throw new BadRequestException(
				"Cada producto necesita id y cantidad de 1 a 100",
			);
		}
		return { productoId, cantidad };
	});
	if (new Set(resultado.map((p) => p.productoId)).size !== resultado.length) {
		throw new BadRequestException("No repitas un producto en el paquete");
	}
	return resultado;
}

const HEX = /^#[0-9a-f]{6}$/i;
const LADOS = new Set(["izquierda", "derecha", "fondo"]);

function color(v: unknown, campo: string, siFalta: string) {
	if (v === undefined || v === null || v === "") return siFalta;
	const valor = String(v).trim().toLowerCase();
	if (!HEX.test(valor))
		throw new BadRequestException(`${campo}: usa un color como #1a2b3c`);
	return valor;
}

/**
 * El banner publicitario de una categoría, tal como llega del admin.
 *
 * `null` lo borra; un objeto lo reemplaza entero. No se hace mezcla campo a
 * campo a propósito: el formulario manda el banner completo y una mezcla
 * dejaría imposible vaciar un texto.
 *
 * LA IMAGEN TIENE QUE SER NUESTRA. Es la misma regla que las fotos de
 * producto (`taller/validacion.ts`): una URL de fuera la puede cambiar quien
 * la aloja después de que el admin la aprobó, y además se serviría desde otro
 * origen.
 *
 * EL ENLACE DEL BOTÓN TAMBIÉN. Un banner es lo más visible del sitio; si
 * aceptara `https://…`, quien entre al admin tendría un redirector con la cara
 * de Kustto para mandar gente a donde quiera.
 */
function banner(v: unknown) {
	if (v === null) return null;
	if (typeof v !== "object" || Array.isArray(v))
		throw new BadRequestException("Banner inválido");
	const b = v as Record<string, unknown>;

	const imagen = texto(b.imagen, "Imagen", 300, false);
	if (imagen && !imagen.startsWith("/medios/"))
		throw new BadRequestException(
			"La imagen del banner tiene que estar subida aquí",
		);

	const lado = String(b.lado ?? "derecha");
	if (!LADOS.has(lado))
		throw new BadRequestException(
			`Lado inválido: usa ${[...LADOS].join(", ")}`,
		);

	let boton: { texto: string; enlace: string } | null = null;
	if (b.boton !== undefined && b.boton !== null) {
		const x = b.boton as Record<string, unknown>;
		const etiqueta = texto(x.texto, "Texto del botón", 40, false);
		const enlace = texto(x.enlace, "Enlace del botón", 200, false);
		if (etiqueta || enlace) {
			if (!etiqueta || !enlace)
				throw new BadRequestException(
					"El botón necesita texto y enlace, o ninguno de los dos",
				);
			if (!enlace.startsWith("/") || enlace.startsWith("//"))
				throw new BadRequestException(
					"El enlace del botón tiene que ser una ruta del sitio, como /paquetes",
				);
			boton = { texto: etiqueta, enlace };
		}
	}

	return {
		titulo: texto(b.titulo, "Título del banner", 80) ?? "",
		texto: texto(b.texto, "Texto del banner", 240, false),
		etiqueta: texto(b.etiqueta, "Etiqueta del banner", 40, false),
		imagen,
		alt: texto(b.alt, "Texto alternativo", 160, false),
		lado: lado as "izquierda" | "derecha" | "fondo",
		colorFondo: color(b.colorFondo, "Color de fondo", "#233328"),
		colorTexto: color(b.colorTexto, "Color del texto", "#ffffff"),
		colorAcento: color(b.colorAcento, "Color de acento", "#aeff6e"),
		boton,
	};
}

function precio(v: unknown) {
	const n = Number(v);
	if (
		!Number.isFinite(n) ||
		n <= 0 ||
		n > 9999999 ||
		Math.abs(Math.round(n * 100) - n * 100) > 1e-6
	) {
		throw new BadRequestException(
			"El precio del paquete debe ser positivo y tener hasta dos decimales",
		);
	}
	return n.toFixed(2);
}

function descuento(v: unknown) {
	const n = Number(v);
	if (!Number.isInteger(n) || n < 0 || n > 90) {
		throw new BadRequestException(
			"El descuento debe ser un porcentaje de 0 a 90",
		);
	}
	return n;
}

@Injectable()
export class PaquetesService {
	constructor(@Inject(DB) private readonly db: Db) {}

	/* Las categorías sólo las administra Kustto; el público y talleres leen las activas. */
	async categorias(soloActivas = false) {
		const filas = await this.db
			.select()
			.from(e.categoriasPaquete)
			.where(soloActivas ? eq(e.categoriasPaquete.activa, true) : undefined)
			.orderBy(asc(e.categoriasPaquete.orden), asc(e.categoriasPaquete.nombre));
		return filas.map((c) => ({
			id: c.id,
			nombre: c.nombre,
			slug: c.slug,
			descripcion: c.descripcion,
			orden: c.orden,
			activa: c.activa,
			banner: c.banner ?? null,
		}));
	}

	async crearCategoria(c: Record<string, unknown>) {
		const nombre = texto(c.nombre, "Nombre", 80) ?? "";
		const base = slugDe(nombre);
		let slug = base;
		for (let n = 2; ; n++) {
			const [existe] = await this.db
				.select({ id: e.categoriasPaquete.id })
				.from(e.categoriasPaquete)
				.where(eq(e.categoriasPaquete.slug, slug))
				.limit(1);
			if (!existe) break;
			slug = `${base}-${n}`;
		}
		const [fila] = await this.db
			.insert(e.categoriasPaquete)
			.values({
				nombre,
				slug,
				descripcion: texto(c.descripcion, "Descripción", 500, false),
				orden: c.orden === undefined ? 0 : this.orden(c.orden),
			})
			.returning();
		return fila;
	}

	async actualizarCategoria(id: string, c: Record<string, unknown>) {
		const cambios: Partial<typeof e.categoriasPaquete.$inferInsert> = {
			actualizadoEn: new Date(),
		};
		if (c.nombre !== undefined)
			cambios.nombre = texto(c.nombre, "Nombre", 80) ?? "";
		if (c.descripcion !== undefined)
			cambios.descripcion = texto(c.descripcion, "Descripción", 500, false);
		if (c.orden !== undefined) cambios.orden = this.orden(c.orden);
		if (c.activa !== undefined) {
			if (typeof c.activa !== "boolean")
				throw new BadRequestException("activa debe ser verdadero o falso");
			cambios.activa = c.activa;
		}
		if (c.banner !== undefined) cambios.banner = banner(c.banner);
		if (Object.keys(cambios).length === 1)
			throw new BadRequestException("Nada que actualizar");
		const [fila] = await this.db
			.update(e.categoriasPaquete)
			.set(cambios)
			.where(eq(e.categoriasPaquete.id, id))
			.returning();
		if (!fila)
			throw new NotFoundException("Categoría de paquete no encontrada");
		return fila;
	}

	private orden(v: unknown) {
		const n = Number(v);
		if (!Number.isInteger(n) || n < 0 || n > 9999)
			throw new BadRequestException("Orden inválido");
		return n;
	}

	/* El proveedor nunca puede asociar productos de otro taller. */
	private async comprobar(
		tallerId: string,
		productos: Pieza[],
		categorias: string[],
		exigirActivos: boolean,
	) {
		if (exigirActivos && (productos.length === 0 || categorias.length === 0)) {
			throw new BadRequestException(
				"El paquete necesita productos y al menos una categoría",
			);
		}
		if (productos.length) {
			const filas = await this.db
				.select({
					id: e.productos.id,
					tallerId: e.productos.tallerId,
					estado: e.productos.estado,
				})
				.from(e.productos)
				.where(
					inArray(
						e.productos.id,
						productos.map((p) => p.productoId),
					),
				);
			if (
				filas.length !== productos.length ||
				filas.some((p) => p.tallerId !== tallerId)
			) {
				throw new BadRequestException(
					"El paquete sólo puede incluir productos tuyos",
				);
			}
			if (exigirActivos && filas.some((p) => p.estado !== "activo")) {
				throw new ConflictException(
					"Todos los productos deben estar publicados antes de enviar el paquete",
				);
			}
		}
		if (categorias.length) {
			const filas = await this.db
				.select({
					id: e.categoriasPaquete.id,
					activa: e.categoriasPaquete.activa,
				})
				.from(e.categoriasPaquete)
				.where(inArray(e.categoriasPaquete.id, categorias));
			if (filas.length !== categorias.length || filas.some((c) => !c.activa)) {
				throw new BadRequestException("Elige categorías de paquete activas");
			}
		}
	}

	async crear(tallerId: string, c: Record<string, unknown>) {
		const nombre = texto(c.nombre, "Nombre", 120) ?? "";
		const descripcion = texto(c.descripcion, "Descripción", 1200, false);
		const productos = piezas(c.productos);
		const categorias = ids(c.categorias, "Categorías", 5);
		const enviar = c.enviar === true;
		const precioBase = precio(c.precioBase);
		const descuentoPorcentaje = descuento(c.descuentoPorcentaje ?? 0);
		await this.comprobar(tallerId, productos, categorias, enviar);
		const fila = await this.db.transaction(async (tx) => {
			const [paquete] = await tx
				.insert(e.paquetes)
				.values({
					tallerId,
					nombre,
					descripcion,
					precioBase,
					descuentoPorcentaje,
					estado: enviar ? "en_revision" : "borrador",
				})
				.returning();
			if (productos.length)
				await tx.insert(e.paqueteProductos).values(
					productos.map((p, orden) => ({
						paqueteId: paquete.id,
						...p,
						orden,
					})),
				);
			if (categorias.length)
				await tx.insert(e.paqueteCategorias).values(
					categorias.map((categoriaId) => ({
						paqueteId: paquete.id,
						categoriaId,
					})),
				);
			return paquete;
		});
		return this.obtenerDeTaller(tallerId, fila.id);
	}

	async actualizar(tallerId: string, id: string, c: Record<string, unknown>) {
		const actual = await this.suyo(tallerId, id);
		if (actual.estado === "archivado")
			throw new ConflictException("Ese paquete está archivado");
		const nombre =
			c.nombre === undefined
				? actual.nombre
				: (texto(c.nombre, "Nombre", 120) ?? "");
		const descripcion =
			c.descripcion === undefined
				? actual.descripcion
				: texto(c.descripcion, "Descripción", 1200, false);
		const productos =
			c.productos === undefined
				? await this.productosDe(id)
				: piezas(c.productos);
		const categorias =
			c.categorias === undefined
				? await this.categoriasDe(id)
				: ids(c.categorias, "Categorías", 5);
		const enviar = c.enviar === true;
		const precioBase =
			c.precioBase === undefined ? actual.precioBase : precio(c.precioBase);
		const descuentoPorcentaje =
			c.descuentoPorcentaje === undefined
				? actual.descuentoPorcentaje
				: descuento(c.descuentoPorcentaje);
		await this.comprobar(tallerId, productos, categorias, enviar);
		const estado: Estado = enviar ? "en_revision" : "borrador";
		await this.db.transaction(async (tx) => {
			const [editado] = await tx
				.update(e.paquetes)
				.set({
					nombre,
					descripcion,
					precioBase,
					descuentoPorcentaje,
					estado,
					notaRevision: null,
					version: sql`${e.paquetes.version} + 1`,
					actualizadoEn: new Date(),
				})
				.where(
					and(
						eq(e.paquetes.id, id),
						eq(e.paquetes.tallerId, tallerId),
						eq(e.paquetes.version, actual.version),
					),
				)
				.returning({ id: e.paquetes.id });
			if (!editado)
				throw new ConflictException(
					"El paquete cambió; vuelve a abrirlo antes de editar",
				);
			if (c.productos !== undefined) {
				await tx
					.delete(e.paqueteProductos)
					.where(eq(e.paqueteProductos.paqueteId, id));
				if (productos.length)
					await tx
						.insert(e.paqueteProductos)
						.values(
							productos.map((p, orden) => ({ paqueteId: id, ...p, orden })),
						);
			}
			if (c.categorias !== undefined) {
				await tx
					.delete(e.paqueteCategorias)
					.where(eq(e.paqueteCategorias.paqueteId, id));
				if (categorias.length)
					await tx
						.insert(e.paqueteCategorias)
						.values(
							categorias.map((categoriaId) => ({ paqueteId: id, categoriaId })),
						);
			}
		});
		return this.obtenerDeTaller(tallerId, id);
	}

	async archivar(tallerId: string, id: string) {
		await this.suyo(tallerId, id);
		await this.db
			.update(e.paquetes)
			.set({
				estado: "archivado",
				version: sql`${e.paquetes.version} + 1`,
				actualizadoEn: new Date(),
			})
			.where(and(eq(e.paquetes.id, id), eq(e.paquetes.tallerId, tallerId)));
		return { ok: true };
	}

	async listarDeTaller(tallerId: string) {
		const filas = await this.db
			.select()
			.from(e.paquetes)
			.where(eq(e.paquetes.tallerId, tallerId))
			.orderBy(desc(e.paquetes.actualizadoEn));
		return this.componer(filas);
	}

	async obtenerDeTaller(tallerId: string, id: string) {
		return (await this.componer([await this.suyo(tallerId, id)]))[0];
	}

	private async suyo(tallerId: string, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.paquetes)
			.where(and(eq(e.paquetes.id, id), eq(e.paquetes.tallerId, tallerId)))
			.limit(1);
		if (!fila) throw new NotFoundException("Paquete no encontrado");
		return fila;
	}

	private async productosDe(id: string): Promise<Pieza[]> {
		return this.db
			.select({
				productoId: e.paqueteProductos.productoId,
				cantidad: e.paqueteProductos.cantidad,
			})
			.from(e.paqueteProductos)
			.where(eq(e.paqueteProductos.paqueteId, id))
			.orderBy(asc(e.paqueteProductos.orden));
	}

	private async categoriasDe(id: string) {
		return (
			await this.db
				.select({ id: e.paqueteCategorias.categoriaId })
				.from(e.paqueteCategorias)
				.where(eq(e.paqueteCategorias.paqueteId, id))
		).map((c) => c.id);
	}

	async listarAdmin(estadoPedido?: string) {
		const estado = (estadoPedido ?? "en_revision") as Estado;
		if (!e.estadoPaquete.enumValues.includes(estado))
			throw new BadRequestException("Estado de paquete desconocido");
		const filas = await this.db
			.select()
			.from(e.paquetes)
			.where(eq(e.paquetes.estado, estado))
			.orderBy(asc(e.paquetes.actualizadoEn));
		return this.componer(filas);
	}

	async obtenerAdmin(id: string) {
		const [fila] = await this.db
			.select()
			.from(e.paquetes)
			.where(eq(e.paquetes.id, id))
			.limit(1);
		if (!fila) throw new NotFoundException("Paquete no encontrado");
		return (await this.componer([fila]))[0];
	}

	async revisar(id: string, c: Record<string, unknown>) {
		const decision = String(c.decision ?? "");
		if (decision !== "aprobar" && decision !== "rechazar")
			throw new BadRequestException("Decisión inválida");
		const nota = String(c.nota ?? "").trim();
		if (decision === "rechazar" && (!nota || nota.length > 1000)) {
			throw new BadRequestException(
				"Explica al proveedor qué debe corregir (máximo 1000 caracteres)",
			);
		}
		const actual = await this.obtenerAdmin(id);
		if (actual.estado !== "en_revision")
			throw new ConflictException("El paquete ya no espera revisión");
		if (decision === "aprobar") {
			precio(actual.precioBase);
			await this.comprobar(
				actual.tallerId,
				actual.productos.map((p) => ({
					productoId: p.id,
					cantidad: p.cantidad,
				})),
				actual.categoriaIds,
				true,
			);
		}
		const [fila] = await this.db
			.update(e.paquetes)
			.set({
				estado: decision === "aprobar" ? "activo" : "rechazado",
				notaRevision: decision === "aprobar" ? null : nota,
				version: sql`${e.paquetes.version} + 1`,
				actualizadoEn: new Date(),
			})
			.where(
				and(
					eq(e.paquetes.id, id),
					eq(e.paquetes.estado, "en_revision"),
					eq(e.paquetes.version, actual.version),
				),
			)
			.returning();
		if (!fila)
			throw new ConflictException("El paquete cambió mientras lo revisabas");
		return this.obtenerAdmin(id);
	}

	async listarPublico(categoriaSlug?: string) {
		let categorias: string[] | undefined;
		if (categoriaSlug) {
			const [fila] = await this.db
				.select({ id: e.categoriasPaquete.id })
				.from(e.categoriasPaquete)
				.where(
					and(
						eq(e.categoriasPaquete.slug, categoriaSlug),
						eq(e.categoriasPaquete.activa, true),
					),
				)
				.limit(1);
			if (!fila) return [];
			categorias = [fila.id];
		}
		const filas = await this.db
			.select()
			.from(e.paquetes)
			.where(eq(e.paquetes.estado, "activo"))
			.orderBy(desc(e.paquetes.actualizadoEn));
		return (await this.componer(filas)).filter(
			(p) =>
				p.publicable &&
				(!categorias || p.categoriaIds.some((id) => categorias.includes(id))),
		);
	}

	async obtenerPublico(id: string) {
		const [fila] = await this.db
			.select()
			.from(e.paquetes)
			.where(and(eq(e.paquetes.id, id), eq(e.paquetes.estado, "activo")))
			.limit(1);
		if (!fila) throw new NotFoundException("Paquete no encontrado");
		const [paquete] = await this.componer([fila]);
		if (!paquete.publicable)
			throw new NotFoundException("Paquete no disponible");
		return paquete;
	}

	/** Ensambla listas y fichas sin hacer una consulta por paquete. */
	private async componer(filas: Paquete[]) {
		if (!filas.length) return [];
		const packageIds = filas.map((p) => p.id);
		const [relProductos, relCategorias, talleres] = await Promise.all([
			this.db
				.select()
				.from(e.paqueteProductos)
				.where(inArray(e.paqueteProductos.paqueteId, packageIds))
				.orderBy(asc(e.paqueteProductos.orden)),
			this.db
				.select({
					paqueteId: e.paqueteCategorias.paqueteId,
					categoria: e.categoriasPaquete,
				})
				.from(e.paqueteCategorias)
				.innerJoin(
					e.categoriasPaquete,
					eq(e.paqueteCategorias.categoriaId, e.categoriasPaquete.id),
				)
				.where(inArray(e.paqueteCategorias.paqueteId, packageIds)),
			this.db
				.select({
					id: e.talleres.id,
					nombre: e.talleres.nombre,
					nombrePublico: e.talleres.nombrePublico,
				})
				.from(e.talleres)
				.where(
					inArray(e.talleres.id, [...new Set(filas.map((p) => p.tallerId))]),
				),
		]);
		const productIds = [...new Set(relProductos.map((p) => p.productoId))];
		const [productos, precios, imagenes] = productIds.length
			? await Promise.all([
					this.db
						.select({
							id: e.productos.id,
							nombre: e.productos.nombre,
							estado: e.productos.estado,
							tallerId: e.productos.tallerId,
						})
						.from(e.productos)
						.where(inArray(e.productos.id, productIds)),
					this.db
						.select({
							productoId: e.productoPrecios.productoId,
							precioBase: e.productoPrecios.precioBase,
						})
						.from(e.productoPrecios)
						.where(inArray(e.productoPrecios.productoId, productIds)),
					this.db
						.select({
							productoId: e.productoImagenes.productoId,
							url: e.productoImagenes.url,
							orden: e.productoImagenes.orden,
						})
						.from(e.productoImagenes)
						.where(inArray(e.productoImagenes.productoId, productIds))
						.orderBy(asc(e.productoImagenes.orden)),
				])
			: [[], [], []];
		const productosPorId = new Map(productos.map((p) => [p.id, p]));
		const preciosPorId = new Map(
			precios.map((p) => [p.productoId, Number(p.precioBase)]),
		);
		const imagenPorId = new Map<string, string>();
		for (const imagen of imagenes)
			if (!imagenPorId.has(imagen.productoId))
				imagenPorId.set(imagen.productoId, imagen.url);
		const tallerPorId = new Map(talleres.map((t) => [t.id, t]));

		return filas.map((fila) => {
			const partes = relProductos.filter((p) => p.paqueteId === fila.id);
			const categorias = relCategorias
				.filter((c) => c.paqueteId === fila.id)
				.map((c) => c.categoria);
			const productos = partes.map((p) => {
				const producto = productosPorId.get(p.productoId);
				return {
					id: p.productoId,
					nombre: producto?.nombre ?? "Producto no disponible",
					estado: producto?.estado ?? "archivado",
					cantidad: p.cantidad,
					imagen: imagenPorId.get(p.productoId) ?? null,
					precioDesde: preciosPorId.get(p.productoId) ?? 0,
				};
			});
			const taller = tallerPorId.get(fila.tallerId);
			return {
				id: fila.id,
				tallerId: fila.tallerId,
				proveedor: taller?.nombrePublico ?? taller?.nombre ?? "Taller",
				nombre: fila.nombre,
				descripcion: fila.descripcion,
				estado: fila.estado,
				version: fila.version,
				notaRevision: fila.notaRevision,
				categoriaIds: categorias.map((c) => c.id),
				categorias: categorias.map((c) => ({
					id: c.id,
					nombre: c.nombre,
					slug: c.slug,
					activa: c.activa,
				})),
				productos,
				imagen: productos.find((p) => p.imagen)?.imagen ?? null,
				precioDesde: productos.reduce(
					(total, p) => total + p.precioDesde * p.cantidad,
					0,
				),
				precioBase: Number(fila.precioBase),
				descuentoPorcentaje: fila.descuentoPorcentaje,
				precioFinal:
					centavosDelPaquete(
						Number(fila.precioBase),
						fila.descuentoPorcentaje,
					) / 100,
				publicable:
					productos.length > 0 &&
					categorias.some((c) => c.activa) &&
					productos.every((p) => p.estado === "activo"),
				creadoEn: fila.creadoEn.toISOString(),
				actualizadoEn: fila.actualizadoEn.toISOString(),
			};
		});
	}
}
