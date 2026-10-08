/**
 * La imagen que representa una línea ante quien compró: la FOTO REAL de la
 * prenda con su diseño si existe, y si no, la colocación sobre el mockup.
 *
 * Se elige el primer lado con foto real y no el primer lado a secas: alguien
 * pudo diseñar sólo la espalda y que la foto real sea de esa espalda.
 */
export function vistaDeLinea(
	arte: unknown,
	respaldo: string | null = null,
): string | null {
	const lados = (Array.isArray(arte) ? arte : []) as {
		colocacion?: string;
		prenda?: string;
		conPrenda?: boolean;
	}[];
	return (
		lados.find((a) => a.conPrenda && a.prenda)?.prenda ??
		lados[0]?.colocacion ??
		respaldo
	);
}
