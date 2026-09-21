import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

type Estado = (typeof e.estadoProducto.enumValues)[number];

/**
 * Los productos, vistos por el admin.
 *
 * QUIEN LOS ESCRIBE ES EL TALLER; aquí sólo se revisan. La única transición
 * que el admin puede hacer —y el taller no— es poner un producto en `activo`:
 * eso es lo que significa la aprobación.
 */
@Injectable()
export class RevisionService {
	constructor(@Inject(DB) private readonly db: Db) {}

	async listar(estadoPedido?: string) {
		const estado = (estadoPedido ?? "en_revision") as Estado;

		if (!e.estadoProducto.enumValues.includes(estado)) {
			throw new BadRequestException(
				`Estado desconocido: ${estado}. Usa ${e.estadoProducto.enumValues.join(", ")}.`,
			);
		}

		const filas = await this.db
			.select()
			.from(e.productos)
			.where(eq(e.productos.estado, estado))
			/* LO QUE LLEVA MÁS TIEMPO ESPERANDO, PRIMERO: es una cola de trabajo,
			   no un catálogo. */
			.orderBy(asc(e.productos.actualizadoEn));

		return this.conNombreDelTaller(filas);
	}

	async obtener(id: string) {
		const [fila] = await this.db
			.select()
			.from(e.productos)
			.where(eq(e.productos.id, id))
			.limit(1);

		if (!fila) throw new NotFoundException("Producto no encontrado");

		const [conTaller] = await this.conNombreDelTaller([fila]);
		const piezas = await this.piezasDe(id);

		return { ...conTaller, ...piezas };
	}

	/**
	 * Aprueba o regresa un producto.
	 *
	 * SÓLO SE PUEDE REVISAR LO QUE ESTÁ ESPERANDO REVISIÓN. La condición evita
	 * que dos personas resuelvan la misma cosa a la vez, y que se apruebe algo
	 * que el taller acaba de regresar a borrador.
	 */
	async revisar(id: string, cuerpo: Record<string, unknown>) {
		const decision = String(cuerpo.decision ?? "");

		if (decision !== "aprobar" && decision !== "rechazar") {
			throw new BadRequestException(
				"La decisión tiene que ser 'aprobar' o 'rechazar'",
			);
		}

		const nota = String(cuerpo.nota ?? "").trim();

		/* Rechazar sin decir por qué deja al taller adivinando qué corregir, y la
		   nota es lo único que va a ver en su panel. */
		if (decision === "rechazar" && !nota) {
			throw new BadRequestException(
				"Escribe por qué lo regresas: el taller sólo verá eso",
			);
		}

		const estado: Estado = decision === "aprobar" ? "activo" : "rechazado";

		const [fila] = await this.db
			.update(e.productos)
			.set({
				estado,
				/* Al aprobar se limpia: una nota vieja junto a un producto publicado
				   se lee como si siguiera habiendo algo mal. */
				notaRevision: decision === "aprobar" ? null : nota,
				actualizadoEn: new Date(),
			})
			.where(
				and(eq(e.productos.id, id), eq(e.productos.estado, "en_revision")),
			)
			.returning();

		if (!fila) {
			/* Se distingue entre "no existe" y "ya no está en revisión" porque el
			   admin tiene derecho a saber cuál de las dos: la segunda significa
			   que alguien se le adelantó. */
			const [existe] = await this.db
				.select({ estado: e.productos.estado })
				.from(e.productos)
				.where(eq(e.productos.id, id))
				.limit(1);

			if (!existe) throw new NotFoundException("Producto no encontrado");

			throw new ConflictException(
				`Este producto ya no espera revisión: está en ${existe.estado}. Recarga la lista.`,
			);
		}

		const [conTaller] = await this.conNombreDelTaller([fila]);
		return conTaller;
	}

	/** El taller que lo hizo. Sin esto la cola es una lista de nombres sueltos. */
	private async conNombreDelTaller(
		productos: (typeof e.productos.$inferSelect)[],
	) {
		if (productos.length === 0) return [];

		const talleres = await this.db
			.select({
				id: e.talleres.id,
				nombre: e.talleres.nombre,
				nombrePublico: e.talleres.nombrePublico,
			})
			.from(e.talleres)
			.where(inArray(e.talleres.id, [...new Set(productos.map((p) => p.tallerId))]));

		return productos.map((p) => {
			const taller = talleres.find((t) => t.id === p.tallerId);

			return {
				id: p.id,
				name: p.nombre,
				internalName: p.nombreInterno,
				sku: p.sku,
				slug: p.slug,
				description: p.descripcion,
				estado: p.estado,
				notaRevision: p.notaRevision,
				templateId: p.plantillaId,
				proveedorId: p.tallerId,
				proveedor: taller ? (taller.nombrePublico ?? taller.nombre) : null,
				createdAt: p.creadoEn.toISOString(),
				updatedAt: p.actualizadoEn.toISOString(),
			};
		});
	}

	/**
	 * Todo lo que hay que mirar para decidir si se aprueba.
	 *
	 * Va sólo en la ficha y no en la lista: son seis consultas más, y la cola
	 * enseña nombres para elegir cuál abrir.
	 */
	private async piezasDe(id: string) {
		const [imagenes, colores, tallas, lados, precio, produccion, categorias] =
			await Promise.all([
				this.db
					.select()
					.from(e.productoImagenes)
					.where(eq(e.productoImagenes.productoId, id))
					.orderBy(asc(e.productoImagenes.orden)),
				this.db
					.select()
					.from(e.productoColores)
					.where(eq(e.productoColores.productoId, id)),
				this.db
					.select()
					.from(e.productoTallas)
					.where(eq(e.productoTallas.productoId, id))
					.orderBy(asc(e.productoTallas.orden)),
				this.db
					.select()
					.from(e.productoLados)
					.where(eq(e.productoLados.productoId, id)),
				this.db
					.select()
					.from(e.productoPrecios)
					.where(eq(e.productoPrecios.productoId, id))
					.limit(1)
					.then((f) => f[0]),
				this.db
					.select()
					.from(e.productoProduccion)
					.where(eq(e.productoProduccion.productoId, id))
					.limit(1)
					.then((f) => f[0]),
				this.db
					.select()
					.from(e.productoCategorias)
					.where(eq(e.productoCategorias.productoId, id)),
			]);

		return {
			images: imagenes.map((i) => ({ url: i.url, order: i.orden })),
			colors: colores.map((c) => ({ name: c.nombre, hex: c.hex })),
			sizes: tallas.map((t) => ({
				size: t.talla,
				widthIn: t.anchoIn,
				lengthIn: t.largoIn,
				pesoG: t.pesoG,
			})),
			printSides: lados.map((l) => ({
				sideKey: l.clave,
				widthCm: l.anchoCm,
				heightCm: l.altoCm,
				dpi: l.dpi,
				sangradoCm: l.sangradoCm,
				tecnica: l.tecnica,
				enabled: l.activo,
				recargo: l.recargo === null ? null : Number(l.recargo),
			})),
			pricing: precio
				? {
						basePrice: Number(precio.precioBase),
						...(precio.precioPorLado
							? { perSidePrice: Number(precio.precioPorLado) }
							: {}),
					}
				: null,
			production: produccion?.dias
				? { meta: { diasProduccion: produccion.dias } }
				: null,
			categoryIds: categorias.map((c) => c.categoriaId),
		};
	}
}
