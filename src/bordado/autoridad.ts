import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	AutoridadDelServidor,
	EmbroideryDesign,
	EmbroideryIssue,
} from "./contrato";

/**
 * V6.2 — QUIÉN DECIDE, en el worker.
 *
 * El veredicto sale del ORIGINAL preparado por el servidor (el núcleo, la
 * misma implementación que el navegador) y del DST que Ink/Stitch cose de
 * ESE diseño. Lo que mandó el navegador es una pista: se compara y se guarda,
 * pero no entra en el diseño que se cose ni en el estado.
 *
 * Cuando el servidor NO puede preparar el original —un cliente anterior a
 * V6.2 que no lo manda, o una ruta que en Node no existe (la v4 del texto
 * pinta en canvas)— no hay autoridad: se cose el diseño del navegador
 * DESPOJADO de todo lo que el navegador afirmó (verdad, ejes, incidencias) y
 * el estado queda en REVIEW con el motivo. Nunca READY.
 */

/** Lo que devuelve el núcleo (`kustto-web/lib/bordado/servidor.ts`). */
export type ResultadoDelNucleo =
	| {
			estado: "preparado";
			design: EmbroideryDesign;
			autoridad: AutoridadDelServidor;
			diagnostico: Diagnostico;
			ms: number;
	  }
	| {
			estado: "rechazado";
			incidencias: EmbroideryIssue[];
			autoridad: Partial<AutoridadDelServidor>;
			diagnostico: Diagnostico;
			ms: number;
	  }
	| {
			estado: "invalido" | "no-verificable";
			codigo: string;
			detalle?: string;
			ms: number;
	  };

export type Diagnostico = {
	cliente: {
		presente: boolean;
		designHash?: string;
		mismoDiseno?: boolean;
		incidencias?: EmbroideryIssue[];
	};
	deriva: EmbroideryIssue[];
};

/**
 * Corre el núcleo en un proceso aparte, con tope de tiempo y de memoria.
 *
 * APARTE Y NO EN ESTE PROCESO: preparar es CPU síncrona; un diseño
 * patológico (seiscientas islas) no se puede interrumpir desde dentro, y en
 * este proceso dejaría al worker sin atender la cola ni el apagado.
 */
export function correrNucleo(
	entrada: {
		original: unknown;
		pista: unknown;
		/** La política del servidor (de su entorno); si falta, la del núcleo por defecto. */
		politica?: { rasterVectorial: boolean };
	},
	carpeta: string,
	opciones: {
		node: string;
		nucleo: string;
		timeoutMs: number;
		/**
		 * V6.9.2: cada etapa que el núcleo deja lista (la forma de una imagen,
		 * para el previsualizador del editor), con la ruta de su archivo.
		 * Sólo mira: el resultado es el mismo con o sin ella.
		 */
		alEtapa?: (etapa: string, ruta: string) => void;
	},
): Promise<ResultadoDelNucleo> {
	const rutaEntrada = join(carpeta, "nucleo-entrada.json");
	const rutaSalida = join(carpeta, "nucleo-salida.json");
	const alEtapa = opciones.alEtapa;
	return writeFile(
		rutaEntrada,
		JSON.stringify(alEtapa ? { ...entrada, etapas: carpeta } : entrada),
	).then(
		() =>
			new Promise((resolver, rechazar) => {
				const proceso = spawn(
					opciones.node,
					[
						"--max-old-space-size=2048",
						opciones.nucleo,
						rutaEntrada,
						rutaSalida,
					],
					{ stdio: ["ignore", "pipe", "pipe"] },
				);
				let errores = "";
				proceso.stderr.on("data", (d) => {
					errores += d;
				});
				/* Las etapas salen por la salida estándar, una por línea, con el
				   archivo ya escrito entero. Las demás líneas no son para nadie. */
				let resto = "";
				proceso.stdout.on("data", (d) => {
					if (!alEtapa) return;
					resto += d;
					for (let i = resto.indexOf("\n"); i >= 0; i = resto.indexOf("\n")) {
						const linea = resto.slice(0, i);
						resto = resto.slice(i + 1);
						try {
							const { etapa, archivo } = JSON.parse(linea) as {
								etapa?: unknown;
								archivo?: unknown;
							};
							if (
								typeof etapa === "string" &&
								typeof archivo === "string" &&
								/^[\w.-]+$/.test(archivo)
							)
								alEtapa(etapa, join(carpeta, archivo));
						} catch {
							// No era una etapa.
						}
					}
				});
				const corte = setTimeout(() => {
					proceso.kill("SIGKILL");
					rechazar(new Error("NUCLEO_TIMEOUT"));
				}, opciones.timeoutMs);
				proceso.on("error", () => {
					clearTimeout(corte);
					rechazar(new Error("NUCLEO_NOT_AVAILABLE"));
				});
				proceso.on("close", (codigo) => {
					clearTimeout(corte);
					if (codigo !== 0) {
						const ultima = errores.trim().split("\n").at(-1) ?? "";
						rechazar(
							new Error(/^[A-Z_]+$/.test(ultima) ? ultima : "NUCLEO_FAILED"),
						);
						return;
					}
					readFile(rutaSalida, "utf8")
						.then((t) => resolver(JSON.parse(t) as ResultadoDelNucleo))
						.catch(() => rechazar(new Error("NUCLEO_BAD_OUTPUT")));
				});
			}),
	);
}

/**
 * El diseño del navegador, sin nada de lo que el navegador AFIRMA: ni su
 * verdad, ni sus ejes, ni sus incidencias (que vuelven como diagnóstico
 * `CLIENT_PREVIEW`), ni una autoridad que se hubiera inventado. Sólo lo que
 * se cose.
 */
export function despojar(design: EmbroideryDesign): {
	design: EmbroideryDesign;
	delCliente: EmbroideryIssue[];
} {
	const p = design.preparation;
	const delCliente = (p?.issues ?? []).map((i) => ({
		code: String(i.code).slice(0, 80),
		message: String(i.message ?? "").slice(0, 300),
		severity: i.severity,
		source: "CLIENT_PREVIEW" as const,
	}));
	return {
		design: {
			...design,
			...(p
				? {
						preparation: {
							profileVersion: p.profileVersion,
							// `raster` es la prueba de que la geometría salió de la imagen (ver `validation.ts`).
							...(p.raster ? { raster: p.raster } : {}),
							issues: [],
						},
					}
				: {}),
		},
		delCliente,
	};
}

export type Contexto =
	| { autoridad: "servidor"; diagnostico: Diagnostico }
	| {
			autoridad: "ninguna";
			/** `SERVER_ORIGINAL_MISSING` (cliente viejo) o `SERVER_CANNOT_VERIFY` (el núcleo no puede). */
			motivo: "SERVER_ORIGINAL_MISSING" | "SERVER_CANNOT_VERIFY";
			delCliente: EmbroideryIssue[];
			detalle?: string;
	  };

const MENSAJES = {
	SERVER_ORIGINAL_MISSING:
		"El servidor no recibió el arte original de este diseño: no puede verificar su estructura. Vuelve a prepararlo con el editor actual.",
	SERVER_CANNOT_VERIFY:
		"El servidor no puede preparar este original por sí mismo (esta ruta aún no existe en el servidor): no puede verificar su estructura.",
};

/**
 * El estado final. Con autoridad del servidor, el del motor (que sólo vio
 * el diseño del servidor) más los diagnósticos, que son `info`. Sin
 * autoridad, REVIEW siempre.
 */
export function veredicto<
	R extends {
		status: "READY" | "REVIEW";
		confidence: number;
		issues: unknown[];
	},
>(
	motor: R,
	contexto: Contexto,
): Omit<R, "issues"> & { issues: EmbroideryIssue[] } {
	const issues = [...(motor.issues as EmbroideryIssue[])];
	if (contexto.autoridad === "servidor") {
		issues.push(...contexto.diagnostico.deriva);
		return { ...motor, issues };
	}
	issues.push({
		code: contexto.motivo,
		message: MENSAJES[contexto.motivo],
		severity: "review",
		source: "SERVER_VALIDATION",
	});
	return {
		...motor,
		status: "REVIEW",
		confidence: Math.min(motor.confidence, 0.5),
		issues,
	};
}
