import {
	boolean,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { productos } from "./catalogo";
import { marcas } from "./comun";
import { talleres } from "./talleres";

/** El proveedor propone; sólo el admin puede pasar a activo. */
export const estadoPaquete = pgEnum("estado_paquete", [
	"borrador",
	"en_revision",
	"activo",
	"rechazado",
	"archivado",
]);

/** Taxonomía de paquetes, independiente de las categorías de productos. */
export const categoriasPaquete = pgTable(
	"categorias_paquete",
	{
		id: uuid().primaryKey().defaultRandom(),
		nombre: text().notNull(),
		slug: text().notNull(),
		descripcion: text(),
		orden: integer().notNull().default(0),
		activa: boolean().notNull().default(true),
		...marcas,
	},
	(t) => [uniqueIndex("categorias_paquete_slug_unico").on(t.slug)],
);

/** Un conjunto de productos de UN taller; no duplica sus precios ni stock. */
export const paquetes = pgTable(
	"paquetes",
	{
		id: uuid().primaryKey().defaultRandom(),
		tallerId: text("taller_id")
			.notNull()
			.references(() => talleres.id, { onDelete: "restrict" }),
		nombre: text().notNull(),
		descripcion: text(),
		precioBase: numeric("precio_base", { precision: 12, scale: 2 }).notNull(),
		descuentoPorcentaje: integer("descuento_porcentaje").notNull().default(0),
		version: integer().notNull().default(1),
		estado: estadoPaquete().notNull().default("borrador"),
		notaRevision: text("nota_revision"),
		...marcas,
	},
	(t) => [
		index("paquetes_taller_estado").on(t.tallerId, t.estado),
		index("paquetes_estado_actualizado").on(t.estado, t.actualizadoEn),
	],
);

export const paqueteProductos = pgTable(
	"paquete_productos",
	{
		paqueteId: uuid("paquete_id")
			.notNull()
			.references(() => paquetes.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "restrict" }),
		cantidad: integer().notNull().default(1),
		orden: integer().notNull().default(0),
	},
	(t) => [
		primaryKey({ columns: [t.paqueteId, t.productoId] }),
		index("paquete_productos_producto").on(t.productoId),
	],
);

export const paqueteCategorias = pgTable(
	"paquete_categorias",
	{
		paqueteId: uuid("paquete_id")
			.notNull()
			.references(() => paquetes.id, { onDelete: "cascade" }),
		categoriaId: uuid("categoria_id")
			.notNull()
			.references(() => categoriasPaquete.id, { onDelete: "restrict" }),
	},
	(t) => [
		primaryKey({ columns: [t.paqueteId, t.categoriaId] }),
		index("paquete_categorias_categoria").on(t.categoriaId),
	],
);
