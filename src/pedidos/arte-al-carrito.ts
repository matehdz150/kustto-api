import { randomUUID } from "node:crypto";
import type { AlmacenService } from "../almacen/almacen.service";

type Arte = {
	lado?: unknown;
	anchoPx?: unknown;
	altoPx?: unknown;
	dpi?: unknown;
};

/**
 * Copia el arte de una línea de pedido a `carritos/<nuevo>/`.
 *
 * VIVE EN UN SITIO porque lo usan dos caminos: repetir un pedido y cargar una
 * plantilla que salió de un pedido. Son la misma operación —sacar arte
 * duradero de `medios/pedidos/` a la carpeta efímera del carrito— y tenerla
 * escrita dos veces era garantía de que una de las dos se quedara sin copiar
 * algo.
 *
 * UN ID NUEVO CADA VEZ, no el del pedido viejo: si dos repeticiones
 * compartieran carpeta, borrar el carrito de una borraría el arte de la otra,
 * y `carritos/` caduca a los 30 días.
 *
 * Devuelve `null` cuando no hay arte de producción que copiar: sin él no hay
 * nada que imprimir, y meterlo en el carrito sólo movería el fallo al final
 * del checkout.
 */
export async function copiarArteDePedido(
	almacen: AlmacenService,
	pedidoId: string,
	lineaId: string,
	arte: readonly Arte[],
) {
	const carritoId = randomUUID();
	const lados = [];

	for (const a of arte) {
		const lado = String(a?.lado ?? "");
		if (!lado) continue;

		/* El arte de producción es lo único que bloquea. La colocación es una
		   referencia para el taller y la prenda real sólo se enseña, así que si
		   faltan se sigue — es la misma regla que al subir desde el editor. */
		const hay = await almacen.copiar(
			`medios/pedidos/${pedidoId}/${lineaId}-${lado}.png`,
			`carritos/${carritoId}/${lado}-arte.png`,
		);
		if (!hay) continue;

		for (const extra of ["colocacion", "prenda"]) {
			await almacen.copiar(
				`medios/pedidos/${pedidoId}/${lineaId}-${lado}-${extra}.png`,
				`carritos/${carritoId}/${lado}-${extra}.png`,
			);
		}

		/* Los PÍXELES del archivo, no los centímetros del área: el área se
		   relee del producto al pedir —puede haber cambiado— pero el tamaño
		   real impreso sale de cuántos píxeles tiene el arte que se copió. */
		lados.push({
			lado,
			anchoPx: Math.trunc(Number(a?.anchoPx ?? 0)),
			altoPx: Math.trunc(Number(a?.altoPx ?? 0)),
			dpi: Math.trunc(Number(a?.dpi ?? 0)) || 300,
		});
	}

	if (lados.length === 0) return null;

	await almacen.copiar(
		`medios/pedidos/${pedidoId}/${lineaId}-diseno.json`,
		`carritos/${carritoId}/diseno.json`,
	);

	return { carritoId, lados };
}
