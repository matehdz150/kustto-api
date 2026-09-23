import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { aSalida } from "../admin/categorias.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

/**
 * La forma que espera el catálogo del front, INTACTA.
 *
 * Es deliberadamente la misma que devolvía la Lambda, nombres en inglés
 * incluidos: la migración cambia de dónde salen los datos, no cómo se pintan.
 * Renombrar a español aquí obligaría a tocar las pantallas del catálogo, la
 * ficha y el editor en el mismo cambio que mueve la base de datos, y entonces
 * un fallo no diría de cuál de las dos cosas viene.
 *
 * Los campos que pueden faltar SE OMITEN en vez de ir en `null`: el front los
 * tiene como opcionales y `null` obligaría a tocar las pantallas sólo para
 * aceptar un hueco que JSON sabe representar dejando la clave fuera.
 */
export type Ficha = {
	id: string;
	slug: string;
	name: string;
	description?: string;
	images: { url: string; order: number }[];
	basePrice?: number;
	categoryIds: string[];
	provider?: string;
	technique?: string;
	productionDays?: number;
	colors: { name: string; hex?: string | null }[];
	sizes: { size: string; widthIn: number; lengthIn: number }[];
	printSides: {
		sideKey: string;
		widthCm: number;
		heightCm: number;
		dpi: number;
		sangradoCm: number;
		enabled: boolean;
		tecnica?: string;
		recargo?: number;
	}[];
	templateId: string;
};

@Injectable()
export class CatalogoService {
	constructor(@Inject(DB) private readonly db: Db) {}

	/**
	 * El catálogo público: lo único que se lee sin token.
	 *
	 * SÓLO SALEN LOS APROBADOS. Un borrador o algo que espera revisión no
	 * existe para el público.
	 *
	 * NO SE FILTRA EN EL SERVIDOR, y eso no cambia con Postgres: técnica, color
	 * y días se aplican en el navegador sobre la lista completa. Cuando la
	 * lista pase de unos cientos de piezas habrá que paginar y filtrar aquí, y
	 * entonces los índices ya están puestos — pero hacerlo hoy sería cambiar
	 * las pantallas del catálogo sin ninguna necesidad.
	 */
	async listar(): Promise<Ficha[]> {
		const filas = await this.db
			.select()
			.from(e.productos)
			.where(eq(e.productos.estado, "activo"))
			// Lo último aprobado primero: es lo que se ve arriba del catálogo.
			.orderBy(desc(e.productos.actualizadoEn));

		return this.componer(
			filas.map((f) => f.id),
			filas,
		);
	}

	/**
	 * Una ficha, que lleva MÁS que una tarjeta del catálogo.
	 *
	 * Resuelve también la PLANTILLA y el TALLER, y no son extras: el editor no
	 * puede montar el lienzo sin la plantilla, y dejarlo para el navegador
	 * serían dos lecturas encadenadas antes de pintar nada.
	 *
	 * `pricing` y `production` salen con la MISMA FORMA ANIDADA que tenían en
	 * DynamoDB —`{basePrice, perSidePrice}` y `{meta:{diasProduccion}}`— aunque
	 * aquí sean columnas planas. No es pereza: `@kustto/precios` recibe
	 * `pricing` tal cual desde cinco pantallas del front, y cambiarle la forma
	 * obligaría a tocarlas en el mismo paso que cambia la base de datos.
	 */
	async obtener(id: string) {
		const [producto] = await this.db
			.select()
			.from(e.productos)
			.where(and(eq(e.productos.id, id), eq(e.productos.estado, "activo")))
			.limit(1);

		/* 404 y no 403 a propósito: decir "existe pero no está publicado" le
		   confirma a quien adivina ids que acertó. */
		if (!producto) throw new NotFoundException("Producto no encontrado");

		const [ficha] = await this.componer([id], [producto]);

		const [plantilla, taller, precio, produccion, fotos] = await Promise.all([
			producto.plantillaId
				? this.db
						.select()
						.from(e.plantillasDePrenda)
						.where(eq(e.plantillasDePrenda.id, producto.plantillaId))
						.limit(1)
						.then((f) => f[0])
				: Promise.resolve(undefined),
			this.db
				.select()
				.from(e.talleres)
				.where(eq(e.talleres.id, producto.tallerId))
				.limit(1)
				.then((f) => f[0]),
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
				.from(e.productoFotosReales)
				.where(eq(e.productoFotosReales.productoId, id))
				.orderBy(asc(e.productoFotosReales.orden)),
		]);

		return {
			...ficha,
			pricing: {
				basePrice: precio ? Number(precio.precioBase) : 0,
				...(precio?.precioPorLado
					? { perSidePrice: Number(precio.precioPorLado) }
					: {}),
			},
			...(produccion?.dias
				? { production: { meta: { diasProduccion: produccion.dias } } }
				: {}),
			...(producto.reglasPersonalizacion
				? { customizationRules: producto.reglasPersonalizacion }
				: {}),
			...(producto.ladosDePlantilla
				? { templateSides: producto.ladosDePlantilla }
				: {}),
			fotosReales: fotos.map((f) => ({
				lado: f.lado,
				color: f.color,
				url: f.url,
				/* La que tenga: plano trae `esquinas`, cilindro trae `banda`. La
				   otra no se manda vacía, porque el editor mira si existe. */
				...(f.esquinas ? { esquinas: f.esquinas } : {}),
				...(f.banda ? { banda: f.banda } : {}),
			})),
			/* `plantilla` y no `template`, y con `data` DENTRO y no desplegado:
			   es la forma exacta que el editor ya lee. */
			plantilla: plantilla
				? {
						id: plantilla.id,
						name: plantilla.nombre,
						data: plantilla.datos,
						createdAt: plantilla.creadoEn.toISOString(),
						updatedAt: plantilla.actualizadoEn.toISOString(),
					}
				: null,
			/* En inglés porque así lo lee el front. Ver el comentario de `Ficha`. */
			taller: taller
				? {
						id: taller.id,
						name: taller.nombre,
						displayName: taller.nombrePublico ?? taller.nombre,
						slug: taller.slug,
						avatarUrl: taller.avatarUrl,
					}
				: null,
		};
	}

	/**
	 * Las piezas de todos los productos de golpe.
	 *
	 * SEIS CONSULTAS PARA N PRODUCTOS, no seis por producto. Con un `await`
	 * dentro del `map` esto serían 6N viajes a Postgres y el catálogo entero
	 * tardaría más que el Query de DynamoDB al que sustituye — que era UNA
	 * lectura porque el producto vivía en un solo ítem. Partir el documento se
	 * paga aquí, y se paga una vez.
	 */
	private async componer(
		ids: string[],
		productos: (typeof e.productos.$inferSelect)[],
	): Promise<Ficha[]> {
		if (ids.length === 0) return [];

		const [
			imagenes,
			colores,
			tallas,
			lados,
			precios,
			produccion,
			categorias,
			talleres,
		] = await Promise.all([
			this.db
				.select()
				.from(e.productoImagenes)
				.where(inArray(e.productoImagenes.productoId, ids))
				.orderBy(asc(e.productoImagenes.orden)),
			this.db
				.select()
				.from(e.productoColores)
				.where(inArray(e.productoColores.productoId, ids)),
			this.db
				.select()
				.from(e.productoTallas)
				.where(inArray(e.productoTallas.productoId, ids))
				.orderBy(asc(e.productoTallas.orden)),
			this.db
				.select()
				.from(e.productoLados)
				.where(inArray(e.productoLados.productoId, ids)),
			this.db
				.select()
				.from(e.productoPrecios)
				.where(inArray(e.productoPrecios.productoId, ids)),
			this.db
				.select()
				.from(e.productoProduccion)
				.where(inArray(e.productoProduccion.productoId, ids)),
			this.db
				.select()
				.from(e.productoCategorias)
				.where(inArray(e.productoCategorias.productoId, ids)),
			this.db
				.select({ id: e.talleres.id, nombre: e.talleres.nombre })
				.from(e.talleres)
				.where(
					inArray(e.talleres.id, [
						...new Set(productos.map((p) => p.tallerId)),
					]),
				),
		]);

		const porProducto = <T extends { productoId: string }>(filas: T[]) => {
			const mapa = new Map<string, T[]>();
			for (const f of filas) {
				const lista = mapa.get(f.productoId);
				if (lista) lista.push(f);
				else mapa.set(f.productoId, [f]);
			}
			return mapa;
		};

		const imgs = porProducto(imagenes);
		const cols = porProducto(colores);
		const tls = porProducto(tallas);
		const lds = porProducto(lados);
		const cats = porProducto(categorias);
		const precioDe = new Map(precios.map((p) => [p.productoId, p]));
		const prodDe = new Map(produccion.map((p) => [p.productoId, p]));
		const tallerDe = new Map(talleres.map((t) => [t.id, t.nombre]));

		return productos.map((p) => {
			const precio = precioDe.get(p.id);
			const prod = prodDe.get(p.id);
			const taller = tallerDe.get(p.tallerId);

			/* Se construye con `...(x ? {k:x} : {})` y no asignando `undefined`:
			   `JSON.stringify` borra las claves con `undefined`, pero el tipo de
			   salida quedaría mintiendo sobre lo que hay. */
			return {
				id: p.id,
				slug: p.slug,
				name: p.nombre,
				...(p.descripcion ? { description: p.descripcion } : {}),
				images: (imgs.get(p.id) ?? []).map((i) => ({
					url: i.url,
					order: i.orden,
				})),
				...(precio ? { basePrice: Number(precio.precioBase) } : {}),
				categoryIds: (cats.get(p.id) ?? []).map((c) => c.categoriaId),
				...(taller ? { provider: taller } : {}),
				...(prod?.dias ? { productionDays: prod.dias } : {}),
				colors: (cols.get(p.id) ?? []).map((c) => ({
					name: c.nombre,
					hex: c.hex,
				})),
				sizes: (tls.get(p.id) ?? []).map((t) => ({
					size: t.talla,
					widthIn: t.anchoIn ?? 0,
					lengthIn: t.largoIn ?? 0,
				})),
				printSides: (lds.get(p.id) ?? []).map((l) => ({
					sideKey: l.clave,
					widthCm: l.anchoCm,
					heightCm: l.altoCm,
					dpi: l.dpi,
					sangradoCm: l.sangradoCm,
					enabled: l.activo,
					/* Omitidos si faltan, igual que el resto: `tecnica: null` y
					   `recargo: null` no son lo que devolvía la Lambda, y el front
					   distingue "sin recargo" de "recargo de cero". */
					...(l.tecnica ? { tecnica: l.tecnica } : {}),
					...(l.recargo === null ? {} : { recargo: Number(l.recargo) }),
				})),
				templateId: p.plantillaId ?? "",
			};
		});
	}

	/** Las categorías, para los filtros y el menú. */
	async categorias() {
		const filas = await this.db
			.select()
			.from(e.categorias)
			.orderBy(asc(e.categorias.orden), asc(e.categorias.nombre));

		return filas.map(aSalida);
	}
}
