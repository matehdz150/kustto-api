// GENERADO de kustto-web/packages/bordado/src/original.ts por scripts/bordado/exportar-nucleo.mts — NO EDITAR.
// sha256 del contenido: 0432c89b34e0ede93c1cc7386c4c77ae5a80c7f43cdf89f9d3f5b7a726e7d8e7
/**
 * V6.2 — EL ORIGINAL, que es lo único de lo que el servidor se fía.
 *
 * Hasta V6.1 el navegador mandaba el diseño YA PREPARADO (objetos, ejes,
 * verdad estructural, incidencias) y el servidor lo cosía y copiaba sus
 * incidencias: un cliente viejo, roto o malicioso podía quitar la verdad o
 * las incidencias y convertir un REVIEW en READY. Ahora el cliente manda lo
 * que capturó del editor —el ARTE— y el servidor lo vuelve a preparar él
 * mismo, con la misma implementación (`preparar` + este paquete). Lo que el
 * navegador calculó viaja aparte, como pista para diagnóstico, y no decide
 * nada.
 *
 * QUÉ ES "EL ORIGINAL" DE CADA FUENTE. Lo que el editor ya capturó en mm, que
 * es exactamente lo que el navegador prepara:
 *
 *   - svg: el marcado (el servidor lo vuelve a sanear) y dónde va en el área;
 *   - raster: los píxeles RGBA de la rejilla física, sin pérdida (deflate) y
 *     con su sha256, ANTES de vectorizar;
 *   - texto y vector del editor: sus trazados en mm (V6.5 los unificará).
 *
 * ESTE ARCHIVO NO TIENE DEPENDENCIAS y se copia tal cual al API (ver
 * `scripts/bordado/exportar-nucleo.mts`): el API valida el cuerpo con el
 * mismo código que usa el núcleo, antes de guardar nada ni gastar CPU.
 */

import {
	EMBROIDERY_PROFILE_HYBRID_V4,
	EMBROIDERY_PROFILE_VECTOR_V5,
	type EmbroideryProfile,
} from "./profile";

export const ORIGINAL_SCHEMA_VERSION = 1;

export type RgbaComprimido = {
	codificacion: "deflate";
	/** Base64 del RGBA de `ancho × alto` píxeles, comprimido con zlib (deflate). */
	datos: string;
	/** sha256 (hex) del RGBA SIN comprimir: lo que el servidor comprueba al abrirlo. */
	sha256: string;
};

export type FuenteOriginalSvg = {
	tipo: "svg";
	sourceObjectId: string;
	marcado: string;
	cajaMm: { x: number; y: number; ancho: number; alto: number };
	matriz?: [number, number, number, number, number, number];
};

export type FuenteOriginalRaster = {
	tipo: "raster";
	sourceObjectId: string;
	ancho: number;
	alto: number;
	mmPorPx: number;
	desplazamientoMm: number;
	vectorizar?: boolean;
	rgba: RgbaComprimido;
};

export type FuenteOriginalTexto = {
	tipo: "texto";
	sourceObjectId: string;
	d: string;
	colorHex: string;
};

export type FuenteOriginalVector = {
	tipo: "vector";
	sourceObjectId: string;
	porColor: Array<{ hex: string; caminos: string[] }>;
};

export type FuenteOriginal =
	| FuenteOriginalSvg
	| FuenteOriginalRaster
	| FuenteOriginalTexto
	| FuenteOriginalVector;

export type SolicitudOriginal = {
	schemaVersion: typeof ORIGINAL_SCHEMA_VERSION;
	productId: string;
	sideId: string;
	widthMm: number;
	heightMm: number;
	sourceSnapshotHash: string;
	fuentes: FuenteOriginal[];
};

/**
 * Los topes de la frontera. Se comprueban ANTES de decodificar o preparar:
 * son todos baratos (longitudes, conteos, rangos) y cortan lo que obviamente
 * no es un diseño. Los de la geometría (`LIMITES_SVG`, el presupuesto del
 * perfil) siguen actuando después, dentro de la preparación.
 */
export const LIMITES_DE_ORIGINAL = {
	fuentes: 24,
	/** El mismo tope que `sanearSvg`. */
	marcadoBytes: 1_000_000,
	/**
	 * Elementos del marcado, contados por `<`, antes de parsearlo. Cuatro
	 * veces `LIMITES_SVG.elementos` (3000): cada forma trae grupos y cierres.
	 */
	etiquetasSvg: 12_000,
	/** Anidamiento del marcado (`LIMITES_SVG.profundidad` es 32; se deja margen para lo que se sanea). */
	profundidadSvg: 64,
	/** Píxeles de una imagen: el máximo de la rejilla de captura (6 M). */
	pixeles: 6_000_000,
	/** La imagen comprimida, en base64. */
	rasterBase64Bytes: 12_000_000,
	/** Un trazado de texto o de vector. */
	trazadoBytes: 400_000,
	caminosPorColor: 4_000,
	coloresPorVector: 32,
	idBytes: 200,
	/** Coordenadas y medidas en mm: nada del área pasa de un metro. */
	mmMaximo: 1_000,
	/** Escala de la matriz del lienzo: ni degenerada ni absurda. */
	escalaMatriz: { minimo: 1e-6, maximo: 1e6 },
	mmPorPx: { minimo: 0.001, maximo: 5 },
} as const;

export class ErrorDeOriginal extends Error {
	constructor(
		readonly codigo: string,
		readonly detalle?: string,
	) {
		super(codigo);
		this.name = "ErrorDeOriginal";
	}
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

function objeto(v: unknown, donde: string): Record<string, unknown> {
	if (!v || typeof v !== "object" || Array.isArray(v))
		throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: no es un objeto`);
	return v as Record<string, unknown>;
}

function texto(v: unknown, donde: string, maximo: number, patron?: RegExp) {
	if (typeof v !== "string" || v.length > maximo || (patron && !patron.test(v)))
		throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: texto inválido`);
	return v;
}

function numero(v: unknown, donde: string, minimo: number, maximo: number) {
	if (typeof v !== "number" || !Number.isFinite(v) || v < minimo || v > maximo)
		throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: número inválido`);
	return v;
}

function entero(v: unknown, donde: string, minimo: number, maximo: number) {
	const n = numero(v, donde, minimo, maximo);
	if (!Number.isInteger(n))
		throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: no es entero`);
	return n;
}

function lista(v: unknown, donde: string, maximo: number) {
	if (!Array.isArray(v) || v.length > maximo)
		throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `${donde}: lista inválida`);
	return v;
}

/**
 * Cuántas etiquetas y cuánto anidamiento tiene un marcado, sin parsearlo:
 * una pasada por los caracteres. Corta un SVG de un millón de grupos
 * anidados antes de que el parser recursivo lo intente.
 */
export function complejidadDeMarcado(marcado: string) {
	let etiquetas = 0;
	let profundidad = 0;
	let maxima = 0;
	for (let i = 0; i < marcado.length; i++) {
		if (marcado.charCodeAt(i) !== 60 /* < */) continue;
		const siguiente = marcado[i + 1];
		if (siguiente === "!" || siguiente === "?") continue;
		etiquetas++;
		if (siguiente === "/") {
			profundidad = Math.max(0, profundidad - 1);
			continue;
		}
		// Una etiqueta que se cierra sola (`<path .../>`) no abre nivel.
		const cierre = marcado.indexOf(">", i);
		if (cierre > 0 && marcado[cierre - 1] === "/") continue;
		profundidad++;
		if (profundidad > maxima) maxima = profundidad;
	}
	return { etiquetas, profundidad: maxima };
}

function fuenteDe(v: unknown, k: number): FuenteOriginal {
	const L = LIMITES_DE_ORIGINAL;
	const f = objeto(v, `fuentes[${k}]`);
	const sourceObjectId = texto(f.sourceObjectId, `fuentes[${k}].sourceObjectId`, L.idBytes);
	const mm = (x: unknown, donde: string) => numero(x, donde, -L.mmMaximo, L.mmMaximo);
	switch (f.tipo) {
		case "svg": {
			const marcado = texto(f.marcado, `fuentes[${k}].marcado`, L.marcadoBytes);
			const c = complejidadDeMarcado(marcado);
			if (c.etiquetas > L.etiquetasSvg || c.profundidad > L.profundidadSvg)
				throw new ErrorDeOriginal("SVG_DEMASIADO_COMPLEJO", `fuentes[${k}]`);
			const caja = objeto(f.cajaMm, `fuentes[${k}].cajaMm`);
			const cajaMm = {
				x: mm(caja.x, "cajaMm.x"),
				y: mm(caja.y, "cajaMm.y"),
				ancho: numero(caja.ancho, "cajaMm.ancho", 1e-6, L.mmMaximo),
				alto: numero(caja.alto, "cajaMm.alto", 1e-6, L.mmMaximo),
			};
			let matriz: FuenteOriginalSvg["matriz"];
			if (f.matriz !== undefined) {
				const m = lista(f.matriz, `fuentes[${k}].matriz`, 6);
				if (m.length !== 6)
					throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "matriz de 6 números");
				const [a, b, c2, d, e, g] = m.map((x, i) =>
					numero(x, `matriz[${i}]`, -1e7, 1e7),
				);
				const escala = Math.sqrt(Math.abs(a * d - b * c2));
				if (escala < L.escalaMatriz.minimo || escala > L.escalaMatriz.maximo)
					throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "matriz degenerada");
				matriz = [a, b, c2, d, e, g];
			}
			return { tipo: "svg", sourceObjectId, marcado, cajaMm, ...(matriz ? { matriz } : {}) };
		}
		case "raster": {
			const ancho = entero(f.ancho, "ancho", 1, 100_000);
			const alto = entero(f.alto, "alto", 1, 100_000);
			if (ancho * alto > L.pixeles)
				throw new ErrorDeOriginal("RASTER_DEMASIADO_GRANDE", `${ancho}×${alto}`);
			const rgba = objeto(f.rgba, `fuentes[${k}].rgba`);
			if (rgba.codificacion !== "deflate")
				throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "codificación del raster");
			return {
				tipo: "raster",
				sourceObjectId,
				ancho,
				alto,
				mmPorPx: numero(f.mmPorPx, "mmPorPx", L.mmPorPx.minimo, L.mmPorPx.maximo),
				desplazamientoMm: mm(f.desplazamientoMm, "desplazamientoMm"),
				...(f.vectorizar === true ? { vectorizar: true } : {}),
				rgba: {
					codificacion: "deflate",
					datos: texto(rgba.datos, "rgba.datos", L.rasterBase64Bytes, BASE64),
					sha256: texto(rgba.sha256, "rgba.sha256", 64, SHA256),
				},
			};
		}
		case "texto":
			return {
				tipo: "texto",
				sourceObjectId,
				d: texto(f.d, `fuentes[${k}].d`, L.trazadoBytes),
				colorHex: texto(f.colorHex, "colorHex", 7, HEX),
			};
		case "vector":
			return {
				tipo: "vector",
				sourceObjectId,
				porColor: lista(f.porColor, "porColor", L.coloresPorVector).map((g, i) => {
					const grupo = objeto(g, `porColor[${i}]`);
					let bytes = 0;
					const caminos = lista(grupo.caminos, "caminos", L.caminosPorColor).map((c) => {
						const s = texto(c, "camino", L.trazadoBytes);
						bytes += s.length;
						return s;
					});
					if (bytes > L.trazadoBytes)
						throw new ErrorDeOriginal("ORIGINAL_INVALIDO", "trazados demasiado grandes");
					return { hex: texto(grupo.hex, "hex", 7, HEX), caminos };
				}),
			};
		default:
			throw new ErrorDeOriginal("ORIGINAL_INVALIDO", `fuentes[${k}].tipo`);
	}
}

/**
 * Valida el original y devuelve UN OBJETO NUEVO con sólo lo que el contrato
 * conoce. Un campo de más no llega a ningún sitio (no se copia), un número
 * no finito o fuera de rango se rechaza, y ninguna lista pasa de su tope.
 * No recorre nada que no conozca, así que un campo desconocido anidado mil
 * niveles no cuesta nada.
 */
export function validarSolicitudOriginal(valor: unknown): SolicitudOriginal {
	const L = LIMITES_DE_ORIGINAL;
	const s = objeto(valor, "original");
	if (s.schemaVersion !== ORIGINAL_SCHEMA_VERSION)
		throw new ErrorDeOriginal("ORIGINAL_VERSION_NO_SOPORTADA");
	const fuentes = lista(s.fuentes, "fuentes", L.fuentes);
	if (!fuentes.length) throw new ErrorDeOriginal("ORIGINAL_SIN_FUENTES");
	return {
		schemaVersion: ORIGINAL_SCHEMA_VERSION,
		productId: texto(s.productId, "productId", L.idBytes),
		sideId: texto(s.sideId, "sideId", L.idBytes),
		widthMm: numero(s.widthMm, "widthMm", 1, L.mmMaximo),
		heightMm: numero(s.heightMm, "heightMm", 1, L.mmMaximo),
		sourceSnapshotHash: texto(s.sourceSnapshotHash, "sourceSnapshotHash", 128),
		fuentes: fuentes.map(fuenteDe),
	};
}

/**
 * Lo que IDENTIFICA un original: el original sin los bytes comprimidos de
 * sus imágenes, que quedan representadas por el sha256 de sus píxeles
 * CRUDOS. Dos compresores (el de un navegador y el de otro, el de Node)
 * dan bytes distintos para los mismos píxeles; la huella del original tiene
 * que depender de lo que se borda, no de cómo viajó. La integridad de los
 * bytes la comprueba el servidor al abrirlos contra ese mismo sha256.
 */
export function contenidoDelOriginal(o: SolicitudOriginal) {
	return {
		...o,
		fuentes: o.fuentes.map((f) =>
			f.tipo === "raster"
				? { ...f, rgba: { codificacion: f.rgba.codificacion, sha256: f.rgba.sha256 } }
				: f,
		),
	};
}

/**
 * La política del SERVIDOR sobre qué ruta sigue cada fuente. No la decide el
 * cliente: el `vectorizar` de un raster elige el perfil (v5 con verdad
 * estructural, o v4 por píxeles sin ella), y dejarlo en manos del navegador
 * permitiría mandar la misma imagen por la ruta que no la comprueba.
 */
export type PoliticaDelServidor = {
	/** Los raster se vectorizan (v5, con StructuralTruth) digan lo que digan. */
	rasterVectorial: boolean;
};

export const POLITICA_POR_DEFECTO: PoliticaDelServidor = { rasterVectorial: true };

/** El original con la política del servidor aplicada (una copia). */
export function aplicarPolitica(
	o: SolicitudOriginal,
	politica: PoliticaDelServidor = POLITICA_POR_DEFECTO,
): SolicitudOriginal {
	return {
		...o,
		fuentes: o.fuentes.map((f) => {
			if (f.tipo !== "raster") return f;
			const { vectorizar: _, ...resto } = f;
			return politica.rasterVectorial ? { ...resto, vectorizar: true } : resto;
		}),
	};
}

/**
 * v5 si la solicitud trae un SVG vectorial o una imagen a vectorizar; v4
 * para todo lo demás. Es LA regla (la usa `preparar` en el navegador y en el
 * servidor, y el API para registrar el trabajo): el perfil es del diseño
 * entero y lo decide el original, no el cliente.
 */
export function perfilDeFuentes(
	fuentes: ReadonlyArray<{ tipo: string; vectorizar?: boolean }>,
): EmbroideryProfile {
	return fuentes.some(
		(f) => f.tipo === "svg" || (f.tipo === "raster" && f.vectorizar === true),
	)
		? EMBROIDERY_PROFILE_VECTOR_V5
		: EMBROIDERY_PROFILE_HYBRID_V4;
}
