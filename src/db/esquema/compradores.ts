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
import { estadoEvento, marcas, personalizacionEvento } from "./comun";
import { pedidoPartidas, pedidos } from "./pedidos";

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
 *
 * EL ARTÍCULO SE GUARDA ENTERO, TAL COMO LO MANDA EL NAVEGADOR, en `articulo`.
 * Estuvo partido en columnas (`color`, `talla`, `piezas`, `arte`, `diseno`) y
 * era un error: el artículo del editor lleva `carritoId`, `tallas` (una lista,
 * no una talla), `lados`, `bordados`, `precioUnitario`, la miniatura… y todo
 * eso se perdía al guardar. El carrito volvía de la cuenta sin `tallas` y la
 * cabecera reventaba al contar piezas. Su forma la decide el editor, no la
 * base de datos: normalizarla obliga a migrar cada vez que el editor cambia.
 *
 * `productoId` sí va en columna, sólo por la clave foránea.
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
		/** La posición en la lista: se guarda entera en una transacción y
		 *  `creado_en` es el mismo para todas. */
		orden: integer().notNull().default(0),
		articulo: jsonb().notNull(),
		...marcas,
	},
	(t) => [index("carrito_partidas_comprador").on(t.compradorId, t.orden)],
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
	(t) => [
		index("imagenes_de_comprador_comprador").on(t.compradorId, t.creadoEn),
	],
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
	(t) => [
		index("plantillas_de_compra_comprador").on(t.compradorId, t.creadoEn),
	],
);

/**
 * Un producto dentro de una plantilla, con DE DÓNDE SALE SU ARTE.
 *
 * NO APUNTA A UN DISEÑO GUARDADO, y aquí estaba el error: lo modelé así y es
 * exactamente lo que la lógica original descarta por escrito. Un diseño
 * guardado copia el LIENZO EDITABLE y una miniatura de colocación, **no el
 * arte de producción** — por eso un diseño guardado abre el editor en vez de
 * ir al carrito, hay que re-exportarlo. Con un `diseno_id` aquí, cargar una
 * plantilla habría encontrado una referencia válida y ningún archivo que
 * imprimir.
 *
 * TAMPOCO PUEDE APUNTAR AL CARRITO: `carritos/` caduca a los 30 días, así que
 * una plantilla armada con eso se quedaría muda al mes.
 *
 * Lo que sí es duradero Y pedible son dos cosas, y por eso hay dos caminos:
 *
 *   - `arte_id`, el arte PROPIO de la plantilla, subido al armarla. Vive en
 *     `medios/plantillas/<comprador>/<arte_id>/` y no caduca. Manda sobre el
 *     otro: es el que se hizo para esta receta.
 *   - `origen_pedido_id` + `origen_partida_id`, la línea de pedido de donde
 *     salió. `medios/pedidos/<pedido>/<partida>-<lado>.png` dura y se puede
 *     mandar a máquina.
 *
 * LOS DOS EN NULO ES VÁLIDO Y NORMAL: "esta playera, estas tallas", sin arte
 * todavía. Es lo que permite armar una plantilla desde el catálogo antes de
 * haber pedido nunca; al cargarla, ese producto pasa por el editor.
 */
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
		/** El arte propio, si se diseñó desde la plantilla. Ver arriba. */
		arteId: text("arte_id"),
		/**
		 * Los lados de ese arte propio, con sus PÍXELES.
		 *
		 * Píxeles y no centímetros: el área imprimible se relee del producto al
		 * pedir —el taller puede haberla cambiado— pero el tamaño real de lo que
		 * se estampa sale de cuántos píxeles tiene el archivo, y ése es el de
		 * cuando se subió.
		 */
		lados: jsonb().notNull().default([]),
		/** De qué línea de qué pedido sale el arte, si no hay propio. */
		origenPedidoId: uuid("origen_pedido_id").references(() => pedidos.id, {
			onDelete: "set null",
		}),
		origenPartidaId: uuid("origen_partida_id").references(
			() => pedidoPartidas.id,
			{ onDelete: "set null" },
		),
		/** Para reconocerla en la lista sin ir a buscar el archivo. */
		miniatura: text(),
		color: text("color"),
		/**
		 * El nombre del producto, congelado.
		 *
		 * SÓLO PARA RECONOCERLO EN LA LISTA. Si el taller se lo cambia, aquí
		 * queda el viejo y no pasa nada: lo que se cobra sale del producto, no de
		 * aquí.
		 */
		nombre: text(),
		orden: integer().notNull().default(0),
	},
	(t) => [
		index("plantilla_de_compra_partidas_plantilla").on(t.plantillaId, t.orden),
	],
);

/**
 * Cuántas piezas de cada talla lleva un producto de la plantilla.
 *
 * ES LA DIFERENCIA ENTRE REPETIR Y CARGAR UNA PLANTILLA: repetir clona el
 * pedido tal cual; una plantilla guarda su propia receta de tallas, que es
 * justo lo que se ajusta entre una vez y otra —el mismo kit de bienvenida, dos
 * tallas distintas según quién entre—.
 */
export const plantillaDeCompraTallas = pgTable(
	"plantilla_de_compra_tallas",
	{
		id: uuid().primaryKey().defaultRandom(),
		partidaId: uuid("partida_id")
			.notNull()
			.references(() => plantillaDeCompraPartidas.id, { onDelete: "cascade" }),
		talla: text().notNull(),
		piezas: integer().notNull(),
	},
	(t) => [
		uniqueIndex("plantilla_de_compra_tallas_unico").on(t.partidaId, t.talla),
	],
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

/**
 * Un producto del evento.
 *
 * EL ID ES PARTE DEL CONTRATO PÚBLICO: el diseño base, los diseños de los
 * invitados y las líneas de cada participación apuntan a él (`eventoItemId`),
 * y la ruta del arte en S3 lo lleva dentro. Editar las fechas o la dirección
 * del borrador NO puede regenerarlo, o el arte ya configurado se desprende.
 *
 * `instantanea` es lo que el organizador vio al armar el evento —nombre, foto,
 * precio orientativo, tallas y colores— y es contra lo que se validan talla y
 * color de cada participación. EL PRECIO NO SALE DE AQUÍ: al participar se
 * vuelve a leer `producto_precios`, porque lo que se cobra lo decide la base.
 */
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
		/** El orden en que el organizador los eligió, que es el que se enseña. */
		orden: integer().notNull().default(0),
		personalizacion: personalizacionEvento().notNull().default("libre"),
		/**
		 * `{ arteId, ruta }`. La ruta la construye el servidor con el `sub` del
		 * organizador: el navegador sólo manda el `arteId`.
		 */
		disenoBase: jsonb("diseno_base"),
		instantanea: jsonb().notNull(),
	},
	(t) => [index("evento_productos_evento").on(t.eventoId, t.orden)],
);

/** Lo que manda quien entra por el enlace público. No exige cuenta. */
export const eventoParticipaciones = pgTable(
	"evento_participaciones",
	{
		/**
		 * EL ID LO MANDA EL NAVEGADOR (`intentoId`) y es lo que hace idempotente
		 * el envío: si la red corta después de guardar y el invitado reintenta,
		 * la llave primaria choca y se devuelve la misma participación en vez
		 * de duplicarla.
		 */
		id: uuid().primaryKey(),
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
