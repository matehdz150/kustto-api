import { randomUUID } from "node:crypto";
import {
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { productos } from "./catalogo";
import { estadoEvento, marcas } from "./comun";

/**
 * El comprador con cuenta.
 *
 * EL ID ES EL `sub` DE COGNITO, igual que en talleres y por la misma razón.
 *
 * Es OTRO pool distinto al de talleres a propósito: el guard valida emisor y
 * audiencia, y con un solo pool un token de taller abriría `/cuenta/*`.
 *
 * Ojo con la relación con `compras`: NO hay FK. El historial se encuentra por
 * CORREO, para que quien pidió como invitado lo tenga ya puesto al registrarse.
 * Atarlo por id dejaría fuera justo ese caso.
 */
export const compradores = pgTable(
	"compradores",
	{
		id: text().primaryKey(),
		/**
		 * PUEDE FALTAR, y por eso no es NOT NULL.
		 *
		 * En DynamoDB el perfil del comprador NO guardaba el correo: venía en el
		 * token de Cognito en cada petición y nadie lo copiaba. Se declara aquí
		 * porque tenerlo permite encontrar sus compras sin pasar por Cognito,
		 * pero los perfiles migrados llegan sin él.
		 */
		correo: text(),
		nombre: text(),
		whatsapp: text(),
		/** La dirección guardada, para precargar el checkout. */
		direccion: jsonb(),
		...marcas,
	},
	/* Único pero acepta varios NULL: en Postgres NULL != NULL, que es justo lo
	   que hace falta mientras haya perfiles sin correo. */
	(t) => [uniqueIndex("compradores_correo_unico").on(t.correo)],
);

/**
 * El carrito de quien tiene sesión.
 *
 * GUARDA RUTAS, NO ARCHIVOS: el arte se sube a S3 al agregar, no al pagar —si
 * no, no cabría en el navegador— y caduca a los 30 días por política del
 * bucket. Aquí sólo vive la ruta.
 */
export const carritoPartidas = pgTable(
	"carrito_partidas",
	{
		id: uuid().primaryKey().defaultRandom(),
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		color: text(),
		talla: text(),
		piezas: integer().notNull().default(1),
		arte: jsonb(),
		diseno: jsonb(),
		...marcas,
	},
	(t) => [index("carrito_partidas_comprador").on(t.compradorId)],
);

/**
 * Los favoritos.
 *
 * En DynamoDB eran UNA lista en un solo ítem, para leerlos de una pieza. Aquí
 * son filas: apagar un corazón es un DELETE de una fila en vez de reescribir
 * la lista entera, y la fusión al entrar es un INSERT ... ON CONFLICT DO
 * NOTHING en vez de juntar dos listas a mano.
 */
export const favoritos = pgTable(
	"favoritos",
	{
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.compradorId, t.productoId] })],
);

/**
 * Un diseño guardado: el lienzo al que su dueño le puso nombre.
 *
 * NO ES UNA IMAGEN SUELTA. Un diseño es un lienzo entero para UN producto —con
 * su texto, su colocación y sus medidas—; una imagen de la biblioteca sirve
 * para cualquiera. Mezclarlos haría que "mis diseños" enseñara logos sueltos.
 *
 * Vive en `medios/disenos/` y NO caduca, al revés que el arte del carrito: una
 * plantilla puede apuntarlo durante años.
 */
export const disenos = pgTable(
	"disenos",
	{
		id: uuid().primaryKey().defaultRandom(),
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id").references(() => productos.id, {
			onDelete: "set null",
		}),
		nombre: text().notNull(),
		lienzo: jsonb(),
		vistaPreviaUrl: text("vista_previa_url"),
		...marcas,
	},
	(t) => [index("disenos_comprador").on(t.compradorId, t.creadoEn)],
);

/** Una imagen de la biblioteca: el logo que se vuelve a usar cada vez. */
export const imagenesDeComprador = pgTable(
	"imagenes_de_comprador",
	{
		/** `text` por lo mismo que `plantillas_de_prenda`: el id viene con forma propia. */
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		nombre: text(),
		url: text().notNull(),
		/** Las guarda el editor para colocarla sin tener que cargarla antes. */
		ancho: integer(),
		alto: integer(),
		...marcas,
	},
	(t) => [index("imagenes_de_comprador_comprador").on(t.compradorId, t.creadoEn)],
);

/**
 * Una plantilla de compra: la receta de un pedido que se repite.
 *
 * "Estos productos, con este arte, en estas cantidades" — el kit de bienvenida
 * de una empresa, el set de una graduación.
 *
 * NO GUARDA ARTE, apunta a diseños guardados. El arte del carrito caduca a los
 * 30 días y el de una plantilla tiene que durar años; referenciar evita un
 * cuarto sitio donde el mismo PNG puede existir y quedarse viejo.
 */
export const plantillasDeCompra = pgTable(
	"plantillas_de_compra",
	{
		/** `text`: ver `plantillas_de_prenda`. */
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		nombre: text().notNull(),
		/** Cuántas veces se ha pedido, y cuándo fue la última. */
		vecesPedida: integer("veces_pedida").notNull().default(0),
		ultimaVez: timestamp("ultima_vez", { withTimezone: true }),
		...marcas,
	},
	(t) => [index("plantillas_de_compra_comprador").on(t.compradorId, t.creadoEn)],
);

export const plantillaDeCompraPartidas = pgTable(
	"plantilla_de_compra_partidas",
	{
		id: uuid().primaryKey().defaultRandom(),
		plantillaId: text("plantilla_id")
			.notNull()
			.references(() => plantillasDeCompra.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		/** Apunta al diseño guardado; no copia el arte. Ver el comentario de arriba. */
		disenoId: uuid("diseno_id").references(() => disenos.id, {
			onDelete: "set null",
		}),
		color: text(),
		talla: text(),
		piezas: integer().notNull().default(1),
	},
	(t) => [index("plantilla_de_compra_partidas_plantilla").on(t.plantillaId)],
);

/**
 * Un evento: el organizador abre un enlace y la gente manda lo suyo.
 *
 * El código es lo que viaja en el enlace público, y era un ítem
 * `EVENT_CODE#<codigo>` con candado porque en DynamoDB no hay UNIQUE.
 */
export const eventos = pgTable(
	"eventos",
	{
		/** `text`: ver `plantillas_de_prenda`. */
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		compradorId: text("comprador_id")
			.notNull()
			.references(() => compradores.id, { onDelete: "cascade" }),
		nombre: text().notNull(),
		descripcion: text(),
		codigo: text().notNull(),
		estado: estadoEvento().notNull().default("borrador"),
		portadaUrl: text("portada_url"),
		/** Dónde se entrega lo del evento. */
		direccion: jsonb(),
		abreEn: timestamp("abre_en", { withTimezone: true }),
		cierraEn: timestamp("cierra_en", { withTimezone: true }),
		publicadoEn: timestamp("publicado_en", { withTimezone: true }),
		cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
		...marcas,
	},
	(t) => [
		uniqueIndex("eventos_codigo_unico").on(t.codigo),
		index("eventos_comprador").on(t.compradorId, t.creadoEn),
	],
);

export const eventoProductos = pgTable(
	"evento_productos",
	{
		id: uuid().primaryKey().defaultRandom(),
		eventoId: text("evento_id")
			.notNull()
			.references(() => eventos.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id")
			.notNull()
			.references(() => productos.id, { onDelete: "cascade" }),
		/** Lo que el organizador deja tocar a quien participa. */
		reglas: jsonb(),
	},
	(t) => [index("evento_productos_evento").on(t.eventoId)],
);

/** Lo que manda quien entra por el enlace público. No exige cuenta. */
export const eventoParticipaciones = pgTable(
	"evento_participaciones",
	{
		id: uuid().primaryKey().defaultRandom(),
		eventoId: text("evento_id")
			.notNull()
			.references(() => eventos.id, { onDelete: "cascade" }),
		/** Quién es: nombre, correo y lo que el organizador haya pedido. */
		participante: jsonb(),
		/** Qué eligió: producto, talla, color y piezas. */
		lineas: jsonb().notNull().default([]),
		subtotal: numeric({ precision: 12, scale: 2 }),
		estadoPago: text("estado_pago"),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("evento_participaciones_evento").on(t.eventoId, t.creadoEn)],
);

/** Diseño temporal emitido para un producto concreto de un evento. */
export const eventoDisenos = pgTable(
	"evento_disenos",
	{
		id: uuid().primaryKey().defaultRandom(),
		eventoId: text("evento_id")
			.notNull()
			.references(() => eventos.id, { onDelete: "cascade" }),
		participacionId: uuid("participacion_id").references(
			() => eventoParticipaciones.id,
			{ onDelete: "cascade" },
		),
		/** A qué producto DEL EVENTO pertenece. No al producto del catálogo. */
		eventoProductoId: uuid("evento_producto_id").references(
			() => eventoProductos.id,
			{ onDelete: "cascade" },
		),
		/** La ruta del arte en S3. */
		ruta: text(),
		/** Es temporal a propósito: un diseño de evento no vive para siempre. */
		expiraEn: timestamp("expira_en", { withTimezone: true }),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("evento_disenos_evento").on(t.eventoId)],
);
