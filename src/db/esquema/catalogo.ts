import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	real,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { estadoProducto, marcas } from "./comun";
import { talleres } from "./talleres";

export const categorias = pgTable(
	"categorias",
	{
		id: uuid().primaryKey().defaultRandom(),
		nombre: text().notNull(),
		/**
		 * En DynamoDB las categorías NO tenían slug: se referenciaban por id y
		 * ya está. Se genera al migrar porque una URL `/catalogo/gorras` es
		 * mejor que una con un uuid, y porque el front ya pide categorías por
		 * nombre en algunos sitios.
		 */
		slug: text().notNull(),
		descripcion: text(),
		imagenUrl: text("imagen_url"),
		orden: integer().notNull().default(0),
		...marcas,
	},
	(t) => [uniqueIndex("categorias_slug_unico").on(t.slug)],
);

/**
 * La plantilla de prenda: los mockups y las áreas imprimibles de una forma.
 *
 * `lados` y `mockups` se quedan en JSONB a propósito. Es geometría que el
 * editor lee ENTERA para montar el lienzo y que nadie consulta por dentro: no
 * existe la pregunta "qué plantillas tienen un lado más ancho de 20 cm".
 * Normalizarla daría tres tablas para volver a unirlas en cada lectura.
 */
export const plantillasDePrenda = pgTable("plantillas_de_prenda", {
	/**
	 * EL ID ES `text` Y NO `uuid`, aunque los nuevos se generen como uuid.
	 *
	 * Los que vienen de DynamoDB no lo son: las plantillas se identifican por
	 * slug (`cap`, `tshirt`, `termo-01`) y las cosas del comprador llevan un id
	 * ordenable por tiempo (`20260904T203842-8ae6fc48`), que allí servía para que
	 * el `sk` ordenara solo. Aquí eso lo hace `ORDER BY creado_en`, pero
	 * convertirlos a uuid al migrar rompería lo que ya los apunta —rutas de S3,
	 * enlaces compartidos, referencias guardadas en el navegador— a cambio de una
	 * columna más bonita.
	 */
	id: text()
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	nombre: text().notNull(),
	/**
	 * La plantilla entera, tal como la escribe el asistente del backoffice.
	 *
	 * Es UN campo y no varios porque así llega y así se usa: el editor la lee
	 * completa para montar el lienzo. Partirla en `lados` y `mockups` era la
	 * idea hasta mirar los datos — en DynamoDB es un solo `data`, y separarlo
	 * obligaría a adivinar dónde corta cada plantilla ya guardada.
	 */
	datos: jsonb().notNull().default({}),
	...marcas,
});

/**
 * El producto.
 *
 * En DynamoDB era UN ítem con todo dentro —imágenes, colores, tallas, lados,
 * precios, existencias— porque allí una lectura es un `GetItem` y partirlo
 * habría costado una consulta por trozo. Aquí se parte en las tablas de abajo:
 * las existencias se descuentan al pagar y los lados deciden el precio, y eso
 * en un documento es reescribir el producto entero para cambiar un número.
 *
 * Lo que NO se parte está en `reglas_personalizacion` y en `caja`: son
 * documentos que se leen enteros y que nadie consulta por dentro.
 */
export const productos = pgTable(
	"productos",
	{
		id: uuid().primaryKey().defaultRandom(),
		tallerId: text("taller_id")
			.notNull()
			.references(() => talleres.id, { onDelete: "restrict" }),
		nombre: text().notNull(),
		/** El que ve el taller en su panel; el público es `nombre`. */
		nombreInterno: text("nombre_interno"),
		sku: text(),
		descripcion: text(),
		slug: text().notNull(),
		estado: estadoProducto().notNull().default("borrador"),
		plantillaId: text("plantilla_id").references(() => plantillasDePrenda.id, {
			onDelete: "set null",
		}),
		personalizable: boolean().notNull().default(true),
		/** Debajo de esto, el panel del taller avisa de que se está acabando. */
		minimoAlerta: integer("minimo_alerta"),
		/**
		 * Lo que tarda de más cuando hay que comprar el blanco.
		 *
		 * Todo producto lleva cuenta de existencias, incluido el taller que
		 * compra por trabajo: las suyas son cero y esto es lo que suma a la
		 * fecha de entrega.
		 */
		diasExtraSinStock: integer("dias_extra_sin_stock"),
		/** Medidas de la caja para cotizar con la paquetería. */
		caja: jsonb(),
		/** Lo que el editor puede y no puede hacer sobre esta pieza. */
		reglasPersonalizacion: jsonb("reglas_personalizacion"),
		/** Geometría de los lados de la plantilla, ya resuelta para este producto. */
		ladosDePlantilla: jsonb("lados_de_plantilla"),
		/** Por qué el admin lo rechazó. Lo lee el taller en su panel. */
		notaRevision: text("nota_revision"),
		...marcas,
	},
	(t) => [
		/** Era el ítem `SLUG#<slug>` con su candado. Ahora lo impone la base. */
		uniqueIndex("productos_slug_unico").on(t.slug),
		/** La bandeja del taller: sus productos, del más nuevo al más viejo (era gsi1). */
		index("productos_taller_creado").on(t.tallerId, t.creadoEn),
		/** El catálogo público y la cola de revisión (era gsi2). */
		index("productos_estado_actualizado").on(t.estado, t.actualizadoEn),
	],
);

export const productoCategorias = pgTable(
	"producto_categorias",
	{
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		categoriaId: uuid("categoria_id")
			.notNull()
			.references(() => categorias.id, { onDelete: "cascade" }),
	},
	(t) => [
		primaryKey({ columns: [t.productoId, t.categoriaId] }),
		index("producto_categorias_categoria").on(t.categoriaId),
	],
);

export const productoImagenes = pgTable(
	"producto_imagenes",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		url: text().notNull(),
		orden: integer().notNull().default(0),
	},
	(t) => [index("producto_imagenes_producto").on(t.productoId, t.orden)],
);

export const productoColores = pgTable(
	"producto_colores",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		nombre: text().notNull(),
		hex: text(),
	},
	(t) => [uniqueIndex("producto_colores_unico").on(t.productoId, t.nombre)],
);

/**
 * Las tallas, con su peso.
 *
 * EL PESO VA POR TALLA Y NO POR VARIANTE, y es deliberado: el color no cambia
 * lo que pesa una prenda y la talla sí. Por variante serían sesenta casillas
 * que el taller tendría que llenar para obtener el mismo dato.
 */
export const productoTallas = pgTable(
	"producto_tallas",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		talla: text().notNull(),
		anchoIn: real("ancho_in"),
		largoIn: real("largo_in"),
		/** Gramos. Lo necesita la cotización de envío, que lo calcula el servidor. */
		pesoG: integer("peso_g"),
		orden: integer().notNull().default(0),
	},
	(t) => [uniqueIndex("producto_tallas_unico").on(t.productoId, t.talla)],
);

/**
 * Un lado imprimible: dónde cae el arte y con qué se estampa.
 *
 * `dpi` y `sangradoCm` son columnas de verdad y no opcionales olvidables: son
 * lo que el taller declara sobre CÓMO sale el archivo de producción, y en el
 * front ya se perdieron una vez por no estar declarados en un tipo.
 */
export const productoLados = pgTable(
	"producto_lados",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		clave: text().notNull(),
		anchoCm: real("ancho_cm").notNull(),
		altoCm: real("alto_cm").notNull(),
		dpi: integer().notNull().default(300),
		sangradoCm: real("sangrado_cm").notNull().default(0),
		/** Con qué se estampa: decide si el arte sale en PNG o en trazos. */
		tecnica: text(),
		/**
		 * Lo que suma ESTE lado, si el taller se lo puso.
		 *
		 * Existe porque una manga no cuesta lo que una espalda. Sin él se usa el
		 * `precio_por_lado` del producto. Un recargo de CERO es una decisión
		 * ("esta manga va incluida") y no lo mismo que no tenerlo, así que la
		 * columna admite NULL y quien la lee usa `??` y nunca `||`.
		 */
		recargo: numeric({ precision: 10, scale: 2 }),
		/**
		 * Si el lado se ofrece.
		 *
		 * Hoy todos están en `true`, pero es el interruptor con el que el taller
		 * apaga un lado sin borrar sus medidas. Dejarlo fuera al migrar habría
		 * convertido un lado apagado en uno disponible el día que alguien apague
		 * el primero.
		 */
		activo: boolean().notNull().default(true),
	},
	(t) => [uniqueIndex("producto_lados_unico").on(t.productoId, t.clave)],
);

/**
 * El precio.
 *
 * NO HAY ESCALAS POR CANTIDAD, y no se declaran "por si acaso": el precio de
 * una pieza son el base más lo que suman los lados, y eso es todo lo que
 * existe hoy.
 *
 * `precioPorLado` es el recargo GLOBAL por lado; un lado puede llevar el suyo
 * propio en `producto_lados.recargo` y entonces gana ése. La regla está escrita
 * una sola vez, en `@kustto/precios`, porque estaba copiada en cinco pantallas
 * y basta con que una se quede vieja para que el comprador vea un precio y se
 * le cobre otro — el peor fallo posible de esta parte.
 *
 * NUMERIC y no float: son pesos. Un producto de $199.90 en coma flotante deja
 * de sumar exacto en cuanto hay veinte piezas, y el total del pedido es lo que
 * se cobra.
 */
export const productoPrecios = pgTable("producto_precios", {
	productoId: uuid("producto_id")
		.primaryKey()
		.references(() => productos.id, { onDelete: "cascade" }),
	precioBase: numeric("precio_base", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	precioPorLado: numeric("precio_por_lado", { precision: 10, scale: 2 }),
});

export const productoProduccion = pgTable("producto_produccion", {
	productoId: uuid("producto_id")
		.primaryKey()
		.references(() => productos.id, { onDelete: "cascade" }),
	/** Viene de `production.meta.diasProduccion`, que es donde vivía. */
	dias: integer(),
	minimoPiezas: integer("minimo_piezas"),
});

/**
 * Las existencias, una fila por variante.
 *
 * En DynamoDB era un mapa dentro del producto con llaves `"Negro|M"`, y
 * descontar al pagar reescribía el producto entero. Aquí cada variante es una
 * fila y el descuento es un UPDATE con `cantidad >= :piezas` en el WHERE: si
 * dos compras van por la última pieza, una de las dos no encuentra fila que
 * actualizar. Eso en un mapa había que hacerlo con una expresión condicional
 * sobre el documento completo.
 *
 * `color` admite NULL: hay piezas que no se venden por color.
 */
export const productoExistencias = pgTable(
	"producto_existencias",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		color: text(),
		talla: text().notNull(),
		cantidad: integer().notNull().default(0),
	},
	(t) => [
		/**
		 * `coalesce` y no las columnas a secas: en Postgres NULL != NULL, así que
		 * un producto SIN color podría acabar con dos filas para la misma talla y
		 * el índice único no las vería como repetidas. Descontar existencias
		 * tocaría una de las dos y la otra seguiría diciendo que hay piezas.
		 *
		 * `NULLS NOT DISTINCT` sería lo natural, pero es de Postgres 15 y drizzle
		 * 0.45 no lo sabe declarar. Esto hace lo mismo y funciona en cualquier
		 * versión.
		 */
		uniqueIndex("producto_existencias_unico").on(
			t.productoId,
			sql`coalesce(${t.color}, '')`,
			t.talla,
		),
	],
);

/**
 * La foto real de la prenda con la zona donde cae lo impreso.
 *
 * Es lo que permite enseñar el diseño sobre la prenda de verdad y no sobre el
 * mockup.
 *
 * VARIAS POR LADO Y COLOR, no una. Aquí había un índice único por
 * (producto, lado, color) y estaba mal: de las 18 fotos que hay, 12 comparten
 * combinación —un termo negro tiene tres— y el índice se habría quedado con
 * seis. La lista es ordenada y el orden lo pone el taller.
 *
 * Y LA GEOMETRÍA VIENE DE DOS FORMAS, según la prenda:
 *
 *   - `esquinas`, los cuatro puntos del cuadro, para lo plano (playera,
 *     mochila): 11 de las 18.
 *   - `banda`, con arriba/abajo/izquierda/derecha/bombeo/centro, para lo
 *     cilíndrico (termo, taza): las otras 7.
 *
 * Son excluyentes y las dos son opcionales. Declarar sólo `esquinas` —que es
 * lo que parecía al leer el nombre del campo— dejaba a los cilindros sin nada
 * con qué proyectar, y el editor los pintaría planos.
 */
export const productoFotosReales = pgTable(
	"producto_fotos_reales",
	{
		id: uuid().primaryKey().defaultRandom(),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		lado: text().notNull(),
		color: text(),
		url: text().notNull(),
		esquinas: jsonb(),
		banda: jsonb(),
		orden: integer().notNull().default(0),
	},
	(t) => [index("producto_fotos_reales_producto").on(t.productoId, t.orden)],
);
