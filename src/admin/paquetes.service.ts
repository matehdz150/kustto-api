import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

type Estado = (typeof e.estadoPaquete.enumValues)[number];

/** El backoffice los sigue llamando en inglés. Ver el comentario de `Ficha`. */
const A_INGLES: Record<Estado, string> = {
	borrador: "draft",
	activo: "active",
	archivado: "archived",
};
const A_ESPANOL: Record<string, Estado> = {
	draft: "borrador",
	active: "activo",
	archived: "archivado",
};

/**
 * Los paquetes: varios productos que se venden juntos.
 *
 * ES LO ÚNICO DEL BACKOFFICE QUE NO VENÍA DE LAS LAMBDAS. Vivía en el Nest
 * viejo contra Postgres y nunca se desplegó, así que la pantalla de
 * `/admin/paquetes` sólo funcionaba en la máquina de quien lo levantara.
 *
 * El precio pasa de `integer` a NUMERIC al traerlo: allí un kit de $1,299.50
 * no se podía expresar y se redondeaba sin que nadie lo dijera.
 */
@Injectable()
export class PaquetesService {
	constructor(@Inject(DB) private readonly db: Db) {}

	async listar() {
		const filas = await this.db
			.select()
			.from(e.paquetes)
			.orderBy(desc(e.paquetes.creadoEn));

		return this.componer(filas);
	}

	async obtener(id: string) {
		const [fila] = await this.db
			.select()
			.from(e.paquetes)
			.where(eq(e.paquetes.id, id))
			.limit(1);

		if (!fila) throw new NotFoundException("Paquete no encontrado");

		const [salida] = await this.componer([fila]);
		return salida;
	}

	async crear(cuerpo: Record<string, any>) {
		const nombre = String(cuerpo.name ?? "").trim();
		if (!nombre) throw new BadRequestException("Falta el nombre del paquete");

		return this.db.transaction(async (tx) => {
			const [paquete] = await tx
				.insert(e.paquetes)
				.values({
					nombre,
					descripcion: cuerpo.description ? String(cuerpo.description).trim() : null,
					imagenUrl: cuerpo.image ? String(cuerpo.image).trim() : null,
					estado: leerEstado(cuerpo.status),
				})
				.returning();

			await this.escribirPiezas(tx, paquete.id, cuerpo);
			return paquete.id;
		}).then((id) => this.obtener(id));
	}

	async actualizar(id: string, cuerpo: Record<string, any>) {
		await this.obtener(id);

		await this.db.transaction(async (tx) => {
			const cambios: Partial<typeof e.paquetes.$inferInsert> = {
				actualizadoEn: new Date(),
			};

			if (cuerpo.name !== undefined) {
				const nombre = String(cuerpo.name).trim();
				if (!nombre) throw new BadRequestException("Falta el nombre");
				cambios.nombre = nombre;
			}
			if (cuerpo.description !== undefined) {
				cambios.descripcion = cuerpo.description
					? String(cuerpo.description).trim()
					: null;
			}
			if (cuerpo.image !== undefined) {
				cambios.imagenUrl = cuerpo.image ? String(cuerpo.image).trim() : null;
			}
			if (cuerpo.status !== undefined) cambios.estado = leerEstado(cuerpo.status);

			await tx.update(e.paquetes).set(cambios).where(eq(e.paquetes.id, id));
			await this.escribirPiezas(tx, id, cuerpo);
		});

		return this.obtener(id);
	}

	async borrar(id: string) {
		const [fila] = await this.db
			.delete(e.paquetes)
			.where(eq(e.paquetes.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Paquete no encontrado");
		return { ok: true };
	}

	/**
	 * Los productos, el precio y las categorías del paquete.
	 *
	 * SE REEMPLAZAN ENTEROS cuando vienen, y se dejan como están cuando no. El
	 * backoffice manda la lista completa al guardar —es como la tiene en la
	 * pantalla— y reconciliar pieza por pieza sólo añadiría formas de que la
	 * lista guardada no sea la que se ve.
	 */
	private async escribirPiezas(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		paqueteId: string,
		cuerpo: Record<string, any>,
	) {
		if (Array.isArray(cuerpo.items)) {
			await tx
				.delete(e.paqueteProductos)
				.where(eq(e.paqueteProductos.paqueteId, paqueteId));

			for (const [orden, item] of cuerpo.items.entries()) {
				const productoId = String(item?.productId ?? "").trim();
				if (!productoId) continue;

				await tx.insert(e.paqueteProductos).values({
					paqueteId,
					productoId,
					cantidad: Math.max(1, Math.trunc(Number(item?.quantity ?? 1))),
					requiereDiseno: item?.designRequired !== false,
					orden,
				});
			}
		}

		if (cuerpo.pricing !== undefined) {
			const precio = Number(cuerpo.pricing?.basePrice ?? 0);

			await tx
				.insert(e.paquetePrecios)
				.values({
					paqueteId,
					precioBase: precio.toFixed(2),
					descuentoPorcentaje:
						cuerpo.pricing?.discountPercentage === undefined
							? null
							: Math.trunc(Number(cuerpo.pricing.discountPercentage)),
				})
				.onConflictDoUpdate({
					target: e.paquetePrecios.paqueteId,
					set: {
						precioBase: precio.toFixed(2),
						descuentoPorcentaje:
							cuerpo.pricing?.discountPercentage === undefined
								? null
								: Math.trunc(Number(cuerpo.pricing.discountPercentage)),
					},
				});
		}

		if (Array.isArray(cuerpo.categoryIds)) {
			await tx
				.delete(e.paqueteCategorias)
				.where(eq(e.paqueteCategorias.paqueteId, paqueteId));

			for (const categoriaId of cuerpo.categoryIds) {
				await tx
					.insert(e.paqueteCategorias)
					.values({ paqueteId, categoriaId: String(categoriaId) })
					.onConflictDoNothing();
			}
		}
	}

	/** Las piezas de todos los paquetes de golpe, no cuatro consultas por uno. */
	private async componer(filas: (typeof e.paquetes.$inferSelect)[]) {
		if (filas.length === 0) return [];

		const ids = filas.map((p) => p.id);

		const [items, precios, categorias] = await Promise.all([
			this.db
				.select({
					item: e.paqueteProductos,
					productoNombre: e.productos.nombre,
					precioBase: e.productoPrecios.precioBase,
				})
				.from(e.paqueteProductos)
				.leftJoin(e.productos, eq(e.productos.id, e.paqueteProductos.productoId))
				.leftJoin(
					e.productoPrecios,
					eq(e.productoPrecios.productoId, e.paqueteProductos.productoId),
				)
				.where(inArray(e.paqueteProductos.paqueteId, ids))
				.orderBy(asc(e.paqueteProductos.orden)),
			this.db
				.select()
				.from(e.paquetePrecios)
				.where(inArray(e.paquetePrecios.paqueteId, ids)),
			this.db
				.select()
				.from(e.paqueteCategorias)
				.where(inArray(e.paqueteCategorias.paqueteId, ids)),
		]);

		return filas.map((p) => {
			const precio = precios.find((x) => x.paqueteId === p.id);

			return {
				id: p.id,
				name: p.nombre,
				description: p.descripcion,
				image: p.imagenUrl,
				status: A_INGLES[p.estado],
				createdAt: p.creadoEn.toISOString(),
				items: items
					.filter((x) => x.item.paqueteId === p.id)
					.map((x) => ({
						id: x.item.id,
						productId: x.item.productoId,
						quantity: x.item.cantidad,
						designRequired: x.item.requiereDiseno,
						product: {
							id: x.item.productoId,
							name: x.productoNombre ?? "(sin nombre)",
							pricing: { basePrice: Number(x.precioBase ?? 0) },
						},
					})),
				pricing: precio
					? {
							basePrice: Number(precio.precioBase),
							discountPercentage: precio.descuentoPorcentaje,
						}
					: null,
				categoryIds: categorias
					.filter((c) => c.paqueteId === p.id)
					.map((c) => c.categoriaId),
			};
		});
	}
}

function leerEstado(valor: unknown): Estado {
	const estado = A_ESPANOL[String(valor ?? "draft")];

	if (!estado) {
		throw new BadRequestException(
			`Estado desconocido: ${valor}. Usa ${Object.keys(A_ESPANOL).join(", ")}.`,
		);
	}

	return estado;
}
