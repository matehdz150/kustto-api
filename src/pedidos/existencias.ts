import { sql } from "drizzle-orm";
import type { Db } from "../db/db.module";

/**
 * Suma (o resta) piezas a una variante de existencias, créela si no está.
 *
 * VA EN SQL CRUDO Y NO CON `onConflictDoUpdate`, y no es pereza: el índice
 * único de `producto_existencias` es por EXPRESIÓN —`coalesce(color, '')`,
 * porque en Postgres NULL != NULL y un producto sin color tendría filas
 * repetidas— y drizzle 0.45 sólo sabe declarar el `ON CONFLICT` sobre
 * columnas. La alternativa era meter `''` como color de mentira en el esquema,
 * y un centinela así se lee mal el día que alguien filtre por color.
 *
 * Sigue siendo parametrizado: `sql` interpola valores, no texto.
 */
export async function ajustarExistencias(
	tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
	v: { productoId: string; color: string | null; talla: string; delta: number },
) {
	await tx.execute(sql`
		insert into producto_existencias (producto_id, color, talla, cantidad)
		values (${v.productoId}, ${v.color}, ${v.talla}, ${v.delta})
		on conflict (producto_id, coalesce(color, ''), talla)
		do update set cantidad = producto_existencias.cantidad + ${v.delta}
	`);
}
