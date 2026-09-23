import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/db.module";
import * as e from "../db/esquema";

type Evento = typeof e.eventos.$inferSelect;
type ProductoDeEvento = typeof e.eventoProductos.$inferSelect;
type Participacion = typeof e.eventoParticipaciones.$inferSelect;

/** Lo que se guarda del producto al elegirlo. Ver `evento_productos`. */
export type Instantanea = {
	nombre: string;
	imagen: string | null;
	proveedorId: string;
	precioDesde: number;
	colores: { nombre: string; hex: string | null }[];
	tallas: string[];
};

export type DisenoBase = { arteId: string; ruta: string };

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * Los productos de varios eventos, agrupados y en el orden del organizador.
 *
 * De una vez y no evento por evento: la lista de `/cuenta/eventos` llega a
 * cincuenta, y cincuenta consultas para pintarla es lo que no hay que hacer.
 */
export async function productosDe(db: Db, eventoIds: string[]) {
	const porEvento = new Map<string, ProductoDeEvento[]>();
	if (!eventoIds.length) return porEvento;

	const filas = await db
		.select()
		.from(e.eventoProductos)
		.where(inArray(e.eventoProductos.eventoId, eventoIds))
		.orderBy(asc(e.eventoProductos.orden));

	for (const fila of filas) {
		const lista = porEvento.get(fila.eventoId);
		if (lista) lista.push(fila);
		else porEvento.set(fila.eventoId, [fila]);
	}
	return porEvento;
}

/**
 * Un producto del evento con la forma que ya lee el front.
 *
 * La instantánea se aplana a propósito: en DynamoDB el renglón era un solo
 * objeto con todo dentro, y el editor, la página pública y el panel del
 * organizador leen `nombre`, `tallas` y `colores` a ese nivel.
 */
export function vistaDeProducto(p: ProductoDeEvento) {
	const i = p.instantanea as Instantanea;
	return {
		id: p.id,
		productoId: p.productoId,
		nombre: i.nombre,
		imagen: i.imagen ?? null,
		proveedorId: i.proveedorId,
		precioDesde: Number(i.precioDesde ?? 0),
		colores: i.colores ?? [],
		tallas: i.tallas ?? [],
		disenoBase: (p.disenoBase as DisenoBase | null) ?? null,
		personalizacion: p.personalizacion,
	};
}

/** El evento para su organizador, con la dirección entera. */
export function vistaDeEvento(evento: Evento, productos: ProductoDeEvento[]) {
	return {
		id: evento.id,
		codigo: evento.codigo,
		estado: evento.estado,
		nombre: evento.nombre,
		descripcion: evento.descripcion ?? null,
		imagen: evento.portadaUrl ?? null,
		abreEn: iso(evento.abreEn),
		cierraEn: iso(evento.cierraEn),
		direccion: evento.direccion,
		productos: productos.map(vistaDeProducto),
		creadoEn: iso(evento.creadoEn),
		actualizadoEn: iso(evento.actualizadoEn),
		/* Sólo cuando pasaron: en DynamoDB el campo no existía antes, y el front
		   distingue "no publicado" por su ausencia, no por un null. */
		...(evento.publicadoEn ? { publicadoEn: iso(evento.publicadoEn) } : {}),
		...(evento.cerradoEn ? { cerradoEn: iso(evento.cerradoEn) } : {}),
	};
}

export function vistaDeParticipacion(p: Participacion) {
	return {
		id: p.id,
		eventoId: p.eventoId,
		participante: p.participante,
		lineas: p.lineas,
		subtotal: Number(p.subtotal ?? 0),
		estadoPago: p.estadoPago,
		/* `creadaEn`, en femenino: así lo guardaba la Lambda y así lo lee el
		   panel. La columna se llama como todas las demás. */
		creadaEn: iso(p.creadoEn),
	};
}

/**
 * En qué punto está el evento PARA QUIEN ENTRA POR EL ENLACE.
 *
 * En la base sólo hay `publicado`; que esté abierto depende de la hora. Se
 * calcula al leer y no con un cron que cambie el estado: así el cierre es
 * exacto al segundo y no hay un proceso más que se pueda caer.
 */
export function estadoPublico(evento: Evento, ahora = new Date()) {
	if (evento.estado !== "publicado") return evento.estado;
	if (evento.abreEn && ahora < evento.abreEn) return "proximamente";
	if (evento.cierraEn && ahora >= evento.cierraEn) return "cerrado";
	return "abierto";
}

/**
 * Arma la instantánea de cada producto ACTIVO del catálogo.
 *
 * Los que no están publicados simplemente no vienen en el mapa: quien llama
 * decide el mensaje.
 */
export async function instantaneasDe(db: Db, ids: string[]) {
	const resultado = new Map<string, Instantanea>();
	if (!ids.length) return resultado;

	const [filas, precios, imagenes, colores, tallas] = await Promise.all([
		db.select().from(e.productos).where(inArray(e.productos.id, ids)),
		db
			.select()
			.from(e.productoPrecios)
			.where(inArray(e.productoPrecios.productoId, ids)),
		db
			.select()
			.from(e.productoImagenes)
			.where(inArray(e.productoImagenes.productoId, ids))
			.orderBy(asc(e.productoImagenes.orden)),
		db
			.select()
			.from(e.productoColores)
			.where(inArray(e.productoColores.productoId, ids)),
		db
			.select()
			.from(e.productoTallas)
			.where(inArray(e.productoTallas.productoId, ids))
			.orderBy(asc(e.productoTallas.orden)),
	]);

	for (const p of filas) {
		if (p.estado !== "activo") continue;
		const precio = precios.find((x) => x.productoId === p.id);
		const suyas = tallas
			.filter((t) => t.productoId === p.id)
			.map((t) => t.talla);

		resultado.set(p.id, {
			nombre: p.nombre ?? "Producto",
			imagen: imagenes.find((i) => i.productoId === p.id)?.url ?? null,
			proveedorId: p.tallerId,
			precioDesde: precio ? Number(precio.precioBase) : 0,
			colores: colores
				.filter((c) => c.productoId === p.id)
				.map((c) => ({ nombre: c.nombre, hex: c.hex ?? null })),
			/* Hay productos sin tallas —un termo, una taza— y la participación
			   exige elegir una: "Única" es la que se elige sola. */
			tallas: suyas.length ? suyas : ["Única"],
		});
	}
	return resultado;
}

/** El precio que se cobra, leído en el momento. `null` si ya no se vende. */
export async function precioVigente(db: Db, productoId: string) {
	const [fila] = await db
		.select({
			estado: e.productos.estado,
			precioBase: e.productoPrecios.precioBase,
		})
		.from(e.productos)
		.leftJoin(
			e.productoPrecios,
			eq(e.productoPrecios.productoId, e.productos.id),
		)
		.where(eq(e.productos.id, productoId));

	if (fila?.estado !== "activo") return null;
	return Number(fila.precioBase ?? 0);
}
