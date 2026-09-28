import {
	canonicalJson,
	type EmbroideryDesign,
	ErrorDeOriginal,
	type SolicitudOriginal,
	validarSolicitudOriginal,
	validateDesign,
} from "./contrato";

/**
 * V6.2 — LA FRONTERA DEL SERVIDOR: qué se acepta del navegador y qué no.
 *
 * EL ORIGINAL ES LO ÚNICO QUE DECIDE. Se valida aquí con el mismo validador
 * que usa el núcleo (`validarSolicitudOriginal`, generado del paquete), que
 * devuelve un objeto nuevo con sólo los campos del contrato: un campo de más,
 * un `NaN` o una lista gigante no pasan de esta función, y todo es barato
 * (longitudes y rangos) porque aún no se ha gastado CPU en preparar nada.
 *
 * LA PISTA (lo que preparó el navegador) SE GUARDA COMO DIAGNÓSTICO y nunca
 * decide: el worker la compara con lo que prepara el servidor y avisa si no
 * coinciden. Si es demasiado grande o demasiado profunda, se tira sin más:
 * no es un error del comprador, es sólo que no hay con qué comparar.
 *
 * EL CLIENTE VIEJO (sólo manda `design`) se sigue aceptando, pero sin
 * original no hay nada que verificar: el worker lo cose y lo deja en REVIEW
 * con `SERVER_ORIGINAL_MISSING`. Nunca llega a READY.
 */

/** Cuánto puede pesar la pista del navegador para guardarla. */
export const MAXIMO_PISTA = 2_000_000;
/** Cuánto anidamiento se admite en un JSON del navegador antes de recorrerlo. */
export const PROFUNDIDAD_MAXIMA = 64;

export type PeticionDeBordado =
	| {
			tipo: "original";
			original: SolicitudOriginal;
			pista: unknown | null;
			retry: boolean;
	  }
	| { tipo: "legado"; design: EmbroideryDesign; retry: boolean };

export class ErrorDeFrontera extends Error {
	constructor(readonly codigo: string) {
		super(codigo);
		this.name = "ErrorDeFrontera";
	}
}

/**
 * La profundidad de un valor JSON, sin recursión (una pila explícita): un
 * array anidado cien mil veces no revienta la pila de quien lo mida, y se
 * corta en cuanto pasa del máximo.
 */
export function excedeProfundidad(valor: unknown, maximo = PROFUNDIDAD_MAXIMA) {
	const pila: Array<[unknown, number]> = [[valor, 1]];
	while (pila.length) {
		const [v, d] = pila.pop() as [unknown, number];
		if (!v || typeof v !== "object") continue;
		if (d > maximo) return true;
		for (const hijo of Array.isArray(v) ? v : Object.values(v))
			pila.push([hijo, d + 1]);
	}
	return false;
}

/** La pista, si vale como diagnóstico; si no, nada. */
export function pistaAcotada(valor: unknown): unknown | null {
	if (valor === undefined || valor === null) return null;
	if (typeof valor !== "object" || excedeProfundidad(valor)) return null;
	try {
		// `canonicalJson` rechaza números no finitos: una pista así tampoco se guarda.
		return canonicalJson(valor).length <= MAXIMO_PISTA ? valor : null;
	} catch {
		return null;
	}
}

export function leerPeticionDeBordado(cuerpo: unknown): PeticionDeBordado {
	if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo))
		throw new ErrorDeFrontera("PETICION_INVALIDA");
	const c = cuerpo as Record<string, unknown>;
	const retry = c.retry === true;
	if (c.original !== undefined) {
		let original: SolicitudOriginal;
		try {
			original = validarSolicitudOriginal(c.original);
		} catch (error) {
			throw new ErrorDeFrontera(
				error instanceof ErrorDeOriginal ? error.codigo : "ORIGINAL_INVALIDO",
			);
		}
		return { tipo: "original", original, pista: pistaAcotada(c.design), retry };
	}
	/* Cliente anterior a V6.2: sólo el diseño. Se valida como siempre, pero
	   antes se mide su profundidad: `validateDesign` y `canonicalJson`
	   recorren con recursión. */
	if (!c.design || excedeProfundidad(c.design))
		throw new ErrorDeFrontera("INVALID_DESIGN");
	try {
		validateDesign(c.design);
	} catch (error) {
		throw new ErrorDeFrontera(
			error instanceof Error ? error.message : "INVALID_DESIGN",
		);
	}
	return { tipo: "legado", design: c.design as EmbroideryDesign, retry };
}
