import {
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { productos } from "./catalogo";
import { estadoPedido, marcas, metodoEntrega } from "./comun";
import { talleres } from "./talleres";

/**
 * La compra: lo que el cliente cree que hizo.
 *
 * Por dentro nace un pedido por taller, porque el taller produce, cobra y
 * envía lo suyo. El folio corto (#481902) es de la COMPRA; cada parte es
 * `#481902-1`, `#481902-2`, así que el cliente dice un número y el taller
 * reconoce el suyo dentro.
 *
 * EL CORREO ES LA LLAVE DEL HISTORIAL, no la cuenta. Quien pidió como invitado
 * y luego se registra con ese mismo correo se encuentra sus compras ya puestas,
 * sin migrar nada. Por eso hay índice por correo y no una FK a `compradores`.
 */
export const compras = pgTable(
	"compras",
	{
		id: uuid().primaryKey().defaultRandom(),
		folio: text().notNull(),
		correo: text().notNull(),
		nombre: text(),
		whatsapp: text(),
		/** Cuántas piezas lleva la compra entera. Se guarda ya sumado. */
		piezas: integer().notNull().default(0),
		productosTotal: numeric("productos_total", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		total: numeric({ precision: 12, scale: 2 }).notNull(),
		/**
		 * La HUELLA del token de seguimiento, no el token.
		 *
		 * Se llama así y no `token` a propósito: lo que se guarda es un hash, y
		 * el token sólo existe en el enlace que se le manda al comprador. Una
		 * columna llamada `token` invita a que alguien la devuelva en una
		 * respuesta y entonces leer un pedido bastaría para abrir el de al lado.
		 */
		huellaDeToken: text("huella_de_token"),
		...marcas,
	},
	(t) => [
		/** Era el ítem `ORDER_FOLIO#<folio>` con candado. */
		uniqueIndex("compras_folio_unico").on(t.folio),
		/** Era gsi3: las compras de un correo, de la más nueva a la más vieja. */
		index("compras_correo_creado").on(t.correo, t.creadoEn),
	],
);

/**
 * El pedido: la parte de UNA compra que le toca a UN taller.
 *
 * Puede llevar varios productos con diseños distintos, pero todos suyos.
 * Mezclar talleres obligaría a partirlo después, y entonces "el pedido"
 * dejaría de ser lo que el cliente cree que mandó.
 *
 * La separación entre talleres la imponía la llave de DynamoDB. Aquí la impone
 * la FK más el filtro por `taller_id` en cada consulta del panel: es una
 * comprobación y no una imposibilidad, así que va en un solo sitio
 * (`PedidosService`) y no repartida por los controladores.
 */
export const pedidos = pgTable(
	"pedidos",
	{
		id: uuid().primaryKey().defaultRandom(),
		compraId: uuid("compra_id")
			.notNull()
			.references(() => compras.id, { onDelete: "restrict" }),
		tallerId: text("taller_id")
			.notNull()
			.references(() => talleres.id, { onDelete: "restrict" }),
		folio: text().notNull(),
		estado: estadoPedido().notNull().default("nuevo"),
		/** Se copia de la compra: el pedido se consulta por correo sin unir. */
		correo: text().notNull(),
		nombre: text(),
		whatsapp: text(),
		piezas: integer().notNull().default(0),
		metodoEntrega: metodoEntrega("metodo_entrega").notNull().default("envio"),
		/**
		 * La dirección, congelada.
		 *
		 * Va en JSONB y no en columnas porque es una foto: lo que el comprador
		 * escribió el día que pidió. Si mañana cambia su perfil, esto no se toca
		 * — el paquete ya salió hacia allá. No se consulta por dentro.
		 */
		direccion: jsonb(),
		/** Lo que contestó la paquetería al cotizar: servicio, precio, plazo. */
		envio: jsonb(),
		/** La guía ya comprada: número, etiqueta y rastreo. */
		guia: jsonb(),
		/** Sin el envío. Es lo que cobra el taller por producir. */
		productosTotal: numeric("productos_total", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		total: numeric({ precision: 12, scale: 2 }).notNull().default("0"),
		/**
		 * La HUELLA del token de seguimiento. Ver el comentario en `compras`.
		 *
		 * Pedir no exige cuenta a propósito, así que `/pedido?id=…&token=…` es la
		 * única forma de que un invitado vea el suyo. Con sesión no hace falta.
		 */
		huellaDeToken: text("huella_de_token"),
		...marcas,
	},
	(t) => [
		uniqueIndex("pedidos_folio_unico").on(t.folio),
		/** La bandeja del taller (era gsi1). */
		index("pedidos_taller_creado").on(t.tallerId, t.creadoEn),
		/** Las bandejas por estado (era gsi2). */
		index("pedidos_estado_actualizado").on(t.estado, t.actualizadoEn),
		/** El historial del comprador por correo (era gsi3). */
		index("pedidos_correo_creado").on(t.correo, t.creadoEn),
		index("pedidos_compra").on(t.compraId),
	],
);

/**
 * Una partida del pedido: un producto, un color, una talla, unas piezas.
 *
 * TODO LO QUE DECIDE EL PRECIO ESTÁ CONGELADO AQUÍ, no referenciado. El
 * producto puede subir de precio, cambiar de nombre o desaparecer del catálogo
 * mañana; lo que se cobró no cambia. `producto_id` queda como rastro para
 * "repetir pedido" y por eso es `set null`: borrar un producto no puede
 * borrar la historia de lo que alguien compró.
 */
export const pedidoPartidas = pgTable(
	"pedido_partidas",
	{
		id: uuid().primaryKey().defaultRandom(),
		pedidoId: uuid("pedido_id")
			.notNull()
			.references(() => pedidos.id, { onDelete: "cascade" }),
		productoId: uuid("producto_id").references(() => productos.id, {
			onDelete: "set null",
		}),
		nombre: text().notNull(),
		color: text(),
		talla: text(),
		piezas: integer().notNull(),
		precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 })
			.notNull(),
		importe: numeric({ precision: 12, scale: 2 }).notNull(),
		/** Las rutas del arte en S3, por lado. El archivo ya está subido. */
		arte: jsonb(),
		/** El lienzo con el que se generó, para poder reabrirlo en el editor. */
		diseno: jsonb(),
	},
	(t) => [index("pedido_partidas_pedido").on(t.pedidoId)],
);

/**
 * La bitácora: quién movió el pedido y cuándo.
 *
 * Era una lista dentro del ítem del pedido. Aquí es una tabla porque crece sin
 * techo y porque se escribe mucho más que el pedido: como lista, cada cambio de
 * estado reescribía el pedido entero.
 */
export const pedidoBitacora = pgTable(
	"pedido_bitacora",
	{
		id: uuid().primaryKey().defaultRandom(),
		pedidoId: uuid("pedido_id")
			.notNull()
			.references(() => pedidos.id, { onDelete: "cascade" }),
		estado: estadoPedido().notNull(),
		nota: text(),
		/** Quién lo movió: el `sub` del taller, "sistema" o "paqueteria". */
		autor: text(),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("pedido_bitacora_pedido").on(t.pedidoId, t.creadoEn)],
);

/**
 * Del envío de la paquetería al pedido.
 *
 * Lo necesita el webhook de rastreo: lo que llega es el id del envío y hay que
 * llegar al pedido. Era el ítem `ENVIO#<id>`; sin él habría que recorrer la
 * tabla entera en cada aviso.
 */
export const enviosDePaqueteria = pgTable(
	"envios_de_paqueteria",
	{
		envioId: text("envio_id").primaryKey(),
		pedidoId: uuid("pedido_id")
			.notNull()
			.references(() => pedidos.id, { onDelete: "cascade" }),
		proveedor: text().notNull().default("skydropx"),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("envios_de_paqueteria_pedido").on(t.pedidoId)],
);

/**
 * Una cotización de envío, mientras dura.
 *
 * Cotizar tarda ~5 s contra la paquetería, así que se devuelve un id y el
 * navegador consulta después — eso no cambia por tener servidor: sigue sin
 * poder atarse a la petición que espera el comprador. Caduca porque un precio
 * de hace una semana no es un precio.
 */
export const cotizacionesDeEnvio = pgTable(
	"cotizaciones_de_envio",
	{
		id: uuid().primaryKey().defaultRandom(),
		estado: text().notNull().default("pendiente"),
		peticion: jsonb().notNull(),
		respuesta: jsonb(),
		error: text(),
		expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("cotizaciones_de_envio_expira").on(t.expiraEn)],
);
