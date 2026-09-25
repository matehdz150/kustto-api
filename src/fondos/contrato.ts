/**
 * El contrato con la Lambda de quitar fondo (`kustto-infra/bg-removal`).
 *
 * La Lambda lee `input/<ruta>.jpg|.png` y escribe `output/<ruta>.png`, con la
 * misma ruta relativa. Aquí se decide esa ruta y NADA de lo que la forma sale
 * del navegador: el id lo pone la API y la extensión sale de una lista cerrada.
 * Una clave armada con texto del cliente podría pisar el trabajo de otro.
 */

/** Todo lo de la web cuelga de aquí, para distinguirlo de las pruebas a mano. */
const PREFIJO = "web";

/** El mismo tope que aplica la Lambda: más grande, lo rechaza ella. */
export const MAX_BYTES = 15 * 1024 * 1024;

const EXTENSIONES = {
	"image/jpeg": "jpg",
	"image/png": "png",
} as const;

export type TipoDeImagen = keyof typeof EXTENSIONES;
export type Extension = (typeof EXTENSIONES)[TipoDeImagen];

export type Pedido = { tipo: TipoDeImagen; bytes: number };

/** Valida lo que manda el navegador, o dice qué está mal. */
export function leerPedido(
	cuerpo: unknown,
): { ok: true; pedido: Pedido } | { ok: false; error: string } {
	const c = (cuerpo ?? {}) as Record<string, unknown>;
	const tipo = c.tipo;
	const bytes = c.bytes;

	if (typeof tipo !== "string" || !(tipo in EXTENSIONES))
		return { ok: false, error: "La imagen tiene que ser JPG o PNG." };
	if (
		typeof bytes !== "number" ||
		!Number.isInteger(bytes) ||
		bytes < 1 ||
		bytes > MAX_BYTES
	)
		return { ok: false, error: "La imagen tiene que pesar menos de 15 MB." };

	return { ok: true, pedido: { tipo: tipo as TipoDeImagen, bytes } };
}

export function extensionDe(tipo: TipoDeImagen): Extension {
	return EXTENSIONES[tipo];
}

export function claveDeEntrada(id: string, extension: Extension) {
	return `input/${PREFIJO}/${id}.${extension}`;
}

export function claveDeSalida(id: string) {
	return `output/${PREFIJO}/${id}.png`;
}
