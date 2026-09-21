import {
	boolean,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	uuid,
} from "drizzle-orm/pg-core";
import { categorias, productos } from "./catalogo";
import { marcas } from "./comun";

/** En qué punto está un paquete de su edición. */
export const estadoPaquete = pgEnum("estado_paquete", [
	"borrador",
	"activo",
	"archivado",
]);

/**
 * Un paquete: varios productos que se venden juntos.
 *
 * "El kit de bienvenida": playera, termo y libreta, con sus cantidades y un
 * precio del conjunto. Lo arma el backoffice, no el taller.
 *
 * NO ES UNA PLANTILLA DE COMPRA. Aquélla la hace un comprador para repetir lo
 * suyo (`plantillas_de_compra`); ésta la hace Kustto y sale en el catálogo.
 * Se parecen por dentro y significan cosas distintas, y por eso no comparten
 * tabla: el día que un paquete tenga precio propio o descuento —ya lo tiene—
 * una tabla común obligaría a explicar por qué la mitad de las columnas están
 * vacías en la mitad de las filas.
 *
 * VIENE DEL NEST VIEJO, no de las Lambdas: los paquetes nunca salieron de
 * Postgres. Es lo único del backoffice que ya vivía aquí.
 */
export const paquetes = pgTable(
	"paquetes",
	{
		id: uuid().primaryKey().defaultRandom(),
		nombre: text().notNull(),
		descripcion: text(),
		imagenUrl: text("imagen_url"),
		estado: estadoPaquete().notNull().default("borrador"),
		...marcas,
	},
	(t) => [index("paquetes_estado").on(t.estado)],
);

export const paqueteProductos = pgTable(
	"paquete_productos",
	{
		id: uuid().primaryKey().defaultRandom(),
		paqueteId: uuid("paquete_id")
			.notNull()
			.references(() => paquetes.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		cantidad: integer().notNull().default(1),
		/**
		 * Si esta pieza hay que diseñarla o va tal cual.
		 *
		 * Un kit puede llevar una libreta sin estampar: obligar a pasar por el
		 * editor para algo que no se personaliza es pedirle al comprador que
		 * resuelva un paso vacío.
		 */
		requiereDiseno: boolean("requiere_diseno").notNull().default(true),
		orden: integer().notNull().default(0),
	},
	(t) => [index("paquete_productos_paquete").on(t.paqueteId, t.orden)],
);

/**
 * El precio del paquete.
 *
 * `precioBase` es el del CONJUNTO, no la suma de sus piezas: un paquete se
 * vende a un precio y ése es el argumento para comprarlo.
 *
 * NUMERIC y no integer. En el Nest viejo era `integer`, o sea pesos enteros:
 * un kit de $1,299.50 no se podía expresar y se redondeaba sin que nadie lo
 * dijera. Aquí son pesos con centavos, como todo lo demás que se cobra.
 */
export const paquetePrecios = pgTable("paquete_precios", {
	paqueteId: uuid("paquete_id")
		.primaryKey()
		.references(() => paquetes.id, { onDelete: "cascade" }),
	precioBase: numeric("precio_base", { precision: 12, scale: 2 })
		.notNull()
		.default("0"),
	/** Un 10 es un 10%. Opcional: la mayoría de los paquetes no lo llevan. */
	descuentoPorcentaje: integer("descuento_porcentaje"),
});

export const paqueteCategorias = pgTable(
	"paquete_categorias",
	{
		paqueteId: uuid("paquete_id")
			.notNull()
			.references(() => paquetes.id, { onDelete: "cascade" }),
		categoriaId: uuid("categoria_id")
			.notNull()
			.references(() => categorias.id, { onDelete: "cascade" }),
	},
	(t) => [
		primaryKey({ columns: [t.paqueteId, t.categoriaId] }),
		index("paquete_categorias_categoria").on(t.categoriaId),
	],
);
