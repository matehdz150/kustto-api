import { sql } from "drizzle-orm";
import { pgEnum, timestamp } from "drizzle-orm/pg-core";

/**
 * Las marcas de tiempo, iguales en todas partes.
 *
 * `withTimezone` no es decorativo: en DynamoDB todo se guardaba como ISO-8601
 * en UTC y la ordenación de las bandejas —los pedidos de un taller, la cola de
 * revisión— dependía de esa cadena. Una columna sin zona convertiría a la del
 * servidor y el orden cambiaría al mover el contenedor de máquina.
 */
export const marcas = {
	creadoEn: timestamp("creado_en", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
};

/**
 * Por dónde pasa un producto.
 *
 * `activo` sólo lo pone el admin: el taller puede mandar a revisión o dejarlo
 * a medias, pero no publicarse a sí mismo. Era una comprobación en la Lambda y
 * aquí sigue siendo una comprobación —un enum no impide escribir `activo`—,
 * pero al menos el conjunto de valores deja de ser una cadena libre.
 */
export const estadoProducto = pgEnum("estado_producto", [
	"borrador",
	"en_revision",
	"activo",
	"rechazado",
	"archivado",
]);

/**
 * Por dónde pasa un pedido.
 *
 * Son los estados que el panel del taller ya sabe pintar. `pagado` no está
 * todavía: cuando entre la pasarela será uno más entre `nuevo` y `produccion`,
 * no un rediseño de esto.
 */
export const estadoPedido = pgEnum("estado_pedido", [
	"nuevo",
	"produccion",
	"listo",
	"enviado",
	"entregado",
	"cancelado",
]);

/** Cómo recibe el comprador. `recoger` no lleva dirección y por eso no se pide. */
export const metodoEntrega = pgEnum("metodo_entrega", ["envio", "recoger"]);

/** En qué punto está un evento de su organizador. */
export const estadoEvento = pgEnum("estado_evento", [
	"borrador",
	"publicado",
	"cerrado",
]);

/**
 * Qué puede hacer quien participa con el diseño de un producto del evento.
 *
 * - `libre`: edita el diseño base y agrega lo suyo.
 * - `bloqueada`: la base no se mueve ni se borra; el invitado agrega encima.
 *   Por eso no se puede publicar un producto `bloqueado` sin diseño base.
 * - `sin_personalizacion`: sólo talla, color y piezas. No firma subidas.
 */
export const personalizacionEvento = pgEnum("personalizacion_evento", [
	"libre",
	"bloqueada",
	"sin_personalizacion",
]);
