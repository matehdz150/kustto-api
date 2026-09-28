import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { type Contexto, correrNucleo, despojar, veredicto } from "./autoridad";
import type { TrabajoDeBordado } from "./bordado.service";
import {
	canonicalJson,
	contenidoDelOriginal,
	type EmbroideryDesign,
	type EmbroideryIssue,
	validarSolicitudOriginal,
	validateDesign,
} from "./contrato";
import { MAXIMO_PISTA } from "./frontera";

/** Lo que el motor de Python imprime al terminar. */
type Resultado = {
	status: "READY" | "REVIEW";
	decision: string;
	confidence: number;
	issues: unknown[];
	metrics: Record<string, number>;
	// `identity` (V6.3): qué puntadas del DST son de qué objeto. Sólo lo trae
	// el perfil con verificación estructural.
	artifacts: {
		dst: string;
		preview: string;
		metadata: string;
		identity?: string;
		/** V6.9.2: la vista del bordado definitivo, para el previsualizador. */
		embroidered?: string;
	};
	hashes: Record<string, string>;
	engineMs: number;
};

const NOMBRES: Record<keyof Resultado["artifacts"], string> = {
	dst: "design.dst",
	preview: "preview.png",
	metadata: "metadata.json",
	identity: "identity.json",
	embroidered: "embroideredPreview.png",
};

const TIPOS: Record<keyof Resultado["artifacts"], string> = {
	dst: "application/octet-stream",
	preview: "image/png",
	metadata: "application/json",
	identity: "application/json",
	embroidered: "image/png",
};

/** El diseño de entrada tiene un techo: no es un archivo que suba nadie. */
const MAXIMO_ENTRADA = 750_000;

/**
 * El envoltorio del motor de bordado.
 *
 * EL MOTOR ES PYTHON —Ink/Stitch y pyembroidery— y no se reescribe: no hay
 * equivalente en TypeScript de lo que hace, y ni lo habrá. Lo que sí cambia es
 * quién habla con el mundo.
 *
 * ANTES el Python lo hacía TODO: leía de SQS, tomaba el trabajo en DynamoDB
 * con una escritura condicional, bajaba el diseño de S3, digitalizaba, subía
 * los artefactos y escribía el resultado. Eran tres sistemas dentro de un
 * script que además tenía que saber qué nombres son palabras reservadas de
 * DynamoDB — y ya falló por eso: `metrics` lo es, y el trabajo moría en la
 * última línea DESPUÉS de que el motor hubiera corrido setenta y cinco
 * segundos, con el DST ya hecho.
 *
 * AHORA el Python es una FUNCIÓN: recibe un diseño y un directorio, deja los
 * archivos y escribe el resultado por su salida. Todo lo demás —la cola, la
 * base, S3— lo hace este proceso, que es el que ya sabe hacerlo. El Python no
 * conoce ninguna credencial.
 */
@Injectable()
export class DigitalizadorService {
	private readonly log = new Logger(DigitalizadorService.name);

	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(ENTORNO) private readonly env: Entorno,
		private readonly almacen: AlmacenService,
	) {}

	async procesar({ jobId, disenoHash }: TrabajoDeBordado) {
		const trabajo = await this.tomar(jobId, disenoHash);

		/* Nadie lo tomó: o ya está en curso en otro proceso, o alguien lo
		   canceló. No es un error, es que no había nada que hacer. */
		if (!trabajo) return { tomado: false };

		const carpeta = await mkdtemp(
			join(tmpdir(), `bordado-${jobId.slice(-12)}-`),
		);
		const arranque = Date.now();
		/* V6.9.2: LAS ETAPAS SE PUBLICAN MIENTRAS EL TRABAJO SIGUE, para que el
		   previsualizador del editor enseñe la forma y las puntadas antes del
		   veredicto. En orden (una cola) y sin poder tumbar el trabajo: una
		   etapa que no se sube se pierde, el bordado no. */
		const prefijo = `embroidery/${trabajo.disenoHash}/${trabajo.id}`;
		let etapas: Promise<void> = Promise.resolve();
		const formas: string[] = [];
		const publicarEtapa = (etapa: string, ruta?: string, datos?: unknown) => {
			const ms = Date.now() - arranque;
			etapas = etapas
				.then(async () => {
					if (etapa === "colores") {
						await this.sumarEtapas(jobId, { colores: datos });
						return;
					}
					if (!ruta || (etapa !== "forma" && etapa !== "puntadas")) return;
					const cuerpo = await readFile(ruta);
					const nombre = basename(ruta);
					const clave = `${prefijo}/${nombre.startsWith("etapa-") ? nombre : `etapa-${nombre}`}`;
					await this.almacen.subirArchivo(
						clave,
						cuerpo,
						ruta.endsWith(".svg") ? "image/svg+xml" : "image/png",
						createHash("sha256").update(cuerpo).digest("hex"),
					);
					if (etapa === "forma") {
						formas.push(clave);
						await this.sumarEtapas(jobId, {
							forma: { claves: [...formas], ms },
						});
					} else await this.sumarEtapas(jobId, { puntadas: { clave, ms } });
				})
				.catch((error) =>
					this.log.warn(
						`Etapa ${etapa} de ${jobId} sin publicar: ${(error as Error).message}`,
					),
				);
		};

		try {
			const esOriginal = trabajo.claveEntrada.endsWith("/original.json");
			const crudo = await this.leerEntrada(
				trabajo.claveEntrada,
				disenoHash,
				esOriginal ? this.env.BORDADO_MAXIMO_CUERPO_BYTES : MAXIMO_ENTRADA,
			);
			const preparado = await this.prepararConAutoridad(
				trabajo,
				crudo,
				esOriginal,
				carpeta,
				publicarEtapa,
			);
			if (preparado.diseno)
				publicarEtapa(
					"colores",
					undefined,
					(JSON.parse(preparado.diseno) as EmbroideryDesign).colors.map(
						(c) => c.displayHex,
					),
				);
			if (preparado.rechazo) {
				await etapas;
				await this.fallar(jobId, "DESIGN_REJECTED", preparado.rechazo);
				this.log.log(`Rechazado por el servidor: ${jobId}`);
				return { tomado: true, estado: "FAILED" };
			}
			const delMotor = await this.correrMotor(
				preparado.diseno,
				carpeta,
				publicarEtapa,
			);
			/* EL ESTADO FINAL LO DECIDE LA AUTORIDAD: el motor sólo vio el diseño
			   del servidor (o, sin autoridad, uno despojado), y encima se aplica
			   `veredicto`. */
			const resultado = {
				...veredicto(delMotor, preparado.contexto),
				metrics: {
					...delMotor.metrics,
					authority: preparado.resumen,
				} as unknown as Resultado["metrics"],
			};
			const claves = await this.publicar(trabajo, resultado, carpeta);
			await this.almacen.subirArchivo(
				`embroidery/${trabajo.disenoHash}/${trabajo.id}/design.json`,
				Buffer.from(preparado.diseno),
				"application/json",
				createHash("sha256").update(preparado.diseno).digest("hex"),
			);

			// Lo que quedara en la cola de etapas, antes del estado final.
			await etapas;
			await this.terminar(jobId, resultado, claves, Date.now() - arranque);

			this.log.log(
				`${resultado.status} ${jobId} en ${Date.now() - arranque} ms ` +
					`(motor ${resultado.engineMs} ms, ${resultado.metrics.stitchCount ?? 0} puntadas)`,
			);

			return { tomado: true, estado: resultado.status };
		} catch (error) {
			const codigo = this.codigoDe(error);
			await etapas;
			await this.fallar(jobId, codigo);

			this.log.error(
				`FAILED ${jobId}: ${codigo} — ${(error as Error).message}`,
			);
			throw error;
		} finally {
			await rm(carpeta, { recursive: true, force: true });
		}
	}

	/**
	 * Toma el trabajo, de forma atómica.
	 *
	 * SÓLO PASA DE `QUEUED` A `PROCESSING` Y SÓLO SI EL HASH CUADRA. Lo primero
	 * es lo que hace que un mensaje duplicado sea inocuo: el segundo no
	 * encuentra fila que actualizar y se va. Lo segundo defiende de un mensaje
	 * viejo que apunte a un diseño que ya se reemplazó.
	 *
	 * EL CONTADOR DE INTENTOS SUBE AQUÍ, al tomarlo, y no al encolarlo: un
	 * trabajo puede volver a la cola sin que nadie lo haya procesado —el
	 * proceso muere, el contenedor se reinicia— y contar eso gastaría los
	 * reintentos sin que el motor hubiera corrido.
	 */
	private async tomar(jobId: string, disenoHash: string) {
		const [tomado] = await this.db
			.update(e.trabajosDeBordado)
			.set({
				estado: "PROCESSING",
				empezadoEn: new Date(),
				intentos: sql`${e.trabajosDeBordado.intentos} + 1`,
				actualizadoEn: new Date(),
			})
			.where(
				and(
					eq(e.trabajosDeBordado.id, jobId),
					eq(e.trabajosDeBordado.estado, "QUEUED"),
					eq(e.trabajosDeBordado.disenoHash, disenoHash),
				),
			)
			.returning();

		return tomado ?? null;
	}

	/**
	 * El diseño de entrada, comprobado.
	 *
	 * SE VUELVE A COMPROBAR EL HASH aunque lo escribiéramos nosotros: entre que
	 * se guardó y ahora, el objeto pudo cambiar. Es barato y cierra la puerta a
	 * que el motor cosa algo distinto de lo que se validó.
	 */
	private async leerEntrada(clave: string, disenoHash: string, maximo: number) {
		const crudo = await this.almacen.leerTexto(clave);

		if (crudo.length > maximo) throw new Error("INPUT_TOO_LARGE");

		/* Un original se comprueba por la huella de su contenido (sus imágenes,
		   por el sha256 de sus píxeles crudos); los bytes de esas imágenes los
		   comprueba el núcleo al abrirlas contra ese mismo sha256. */
		const huella = clave.endsWith("/original.json")
			? createHash("sha256")
					.update(
						canonicalJson(
							contenidoDelOriginal(validarSolicitudOriginal(JSON.parse(crudo))),
						),
					)
					.digest("hex")
			: createHash("sha256").update(crudo).digest("hex");
		if (huella !== disenoHash) {
			throw new Error("DESIGN_HASH_MISMATCH");
		}

		return crudo;
	}

	/**
	 * V6.2: el diseño que se cose y con qué autoridad.
	 *
	 * CON ORIGINAL, el núcleo lo prepara en el servidor (misma implementación
	 * que el navegador) y ése es el diseño. La pista del navegador sólo se usa
	 * para el diagnóstico de deriva.
	 *
	 * SIN AUTORIDAD (cliente viejo, o una ruta que el servidor no puede
	 * preparar), se cose el diseño del navegador despojado de todo lo que
	 * afirmaba, y `veredicto` lo deja en REVIEW.
	 */
	private async prepararConAutoridad(
		trabajo: typeof e.trabajosDeBordado.$inferSelect,
		crudo: string,
		esOriginal: boolean,
		carpeta: string,
		alEtapa?: (etapa: string, ruta: string) => void,
	): Promise<{
		diseno: string;
		contexto: Contexto;
		resumen: Record<string, unknown>;
		rechazo?: EmbroideryIssue[];
	}> {
		if (!esOriginal) {
			const { design, delCliente } = despojar(
				JSON.parse(crudo) as EmbroideryDesign,
			);
			return {
				diseno: canonicalJson(design),
				contexto: {
					autoridad: "ninguna",
					motivo: "SERVER_ORIGINAL_MISSING",
					delCliente,
				},
				resumen: {
					authority: "none",
					reason: "SERVER_ORIGINAL_MISSING",
					clientIssues: delCliente,
				},
			};
		}
		const pista = await this.leerPista(
			trabajo.claveEntrada.replace(/original\.json$/, "pista.json"),
		);
		const nucleo = await correrNucleo(
			{
				original: JSON.parse(crudo),
				pista,
				politica: { rasterVectorial: this.env.BORDADO_RASTER_VECTORIAL },
			},
			carpeta,
			{
				node: this.env.BORDADO_NODE,
				nucleo: this.env.BORDADO_NUCLEO,
				timeoutMs: this.env.BORDADO_NUCLEO_TIMEOUT_MS,
				alEtapa,
			},
		);
		if (nucleo.estado === "preparado")
			return {
				diseno: canonicalJson(nucleo.design),
				contexto: { autoridad: "servidor", diagnostico: nucleo.diagnostico },
				resumen: {
					authority: "server",
					...nucleo.autoridad,
					nucleusMs: nucleo.ms,
					client: nucleo.diagnostico.cliente,
				},
			};
		if (nucleo.estado === "rechazado")
			return {
				diseno: "",
				contexto: { autoridad: "servidor", diagnostico: nucleo.diagnostico },
				resumen: {},
				rechazo: nucleo.incidencias,
			};
		// El original no pasó la frontera del núcleo: el trabajo falla con su código.
		if (nucleo.estado === "invalido") throw new Error(nucleo.codigo);
		/* No verificable: sin pista válida no hay nada que coser; con ella, se
		   cose despojada y sin autoridad. */
		try {
			validateDesign(pista);
		} catch {
			throw new Error("SERVER_CANNOT_PREPARE");
		}
		const { design, delCliente } = despojar(pista as EmbroideryDesign);
		return {
			diseno: canonicalJson(design),
			contexto: {
				autoridad: "ninguna",
				motivo: "SERVER_CANNOT_VERIFY",
				delCliente,
				detalle: nucleo.codigo,
			},
			resumen: {
				authority: "none",
				reason: nucleo.codigo,
				clientIssues: delCliente,
			},
		};
	}

	/** La pista del navegador, si hay y cabe. Nunca decide nada. */
	private async leerPista(clave: string): Promise<unknown> {
		try {
			const crudo = await this.almacen.leerTexto(clave);
			return crudo.length <= MAXIMO_PISTA ? JSON.parse(crudo) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Llama al motor y espera su veredicto.
	 *
	 * EL DISEÑO VA POR ARCHIVO Y NO POR ARGUMENTO: son cientos de kilobytes de
	 * JSON y la lista de argumentos tiene un tope del sistema operativo que no
	 * avisa bien cuando se pasa.
	 *
	 * EL TIEMPO LÍMITE ES DEL MOTOR, no de la petición. Aquí ya no hay ningún
	 * máximo de función encima —era lo que obligaba a exprimir los 75 segundos—
	 * pero el tope se queda: un diseño que tarda cinco minutos no es un diseño
	 * lento, es uno que no se va a poder coser.
	 */
	private correrMotor(
		diseno: string,
		carpeta: string,
		alEtapa?: (etapa: string, ruta: string) => void,
	): Promise<Resultado> {
		return new Promise((resolver, rechazar) => {
			writeFile(join(carpeta, "design.json"), diseno)
				.then(() => {
					const proceso = spawn(
						this.env.BORDADO_PYTHON,
						[this.env.BORDADO_MOTOR, join(carpeta, "design.json"), carpeta],
						{
							stdio: ["ignore", "pipe", "pipe"],
							/* V6.9.2: con etapas, el motor anuncia por su salida de errores
							   las puntadas del primer cosido (`ETAPA {...}`), antes de
							   validar y reparar. */
							env: alEtapa
								? { ...process.env, KUSTTO_ETAPAS: "1" }
								: process.env,
						},
					);

					let salida = "";
					let errores = "";

					proceso.stdout.on("data", (d) => {
						salida += d;
					});
					let pendiente = "";
					proceso.stderr.on("data", (d) => {
						errores += d;
						if (!alEtapa) return;
						pendiente += d;
						for (
							let i = pendiente.indexOf("\n");
							i >= 0;
							i = pendiente.indexOf("\n")
						) {
							const linea = pendiente.slice(0, i);
							pendiente = pendiente.slice(i + 1);
							if (!linea.startsWith("ETAPA ")) continue;
							try {
								const { etapa, archivo } = JSON.parse(linea.slice(6)) as {
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
								// Una línea rota no es una etapa.
							}
						}
					});

					const corte = setTimeout(() => {
						proceso.kill("SIGKILL");
						rechazar(new Error("ENGINE_TIMEOUT"));
					}, this.env.BORDADO_TIMEOUT_MS);

					proceso.on("error", () => {
						clearTimeout(corte);
						rechazar(new Error("ENGINE_NOT_AVAILABLE"));
					});

					proceso.on("close", (codigo) => {
						clearTimeout(corte);

						if (codigo !== 0) {
							/* El motor escribe su motivo en la última línea del error
							   cuando lo sabe. Si no, es un fallo genérico. */
							const ultima = errores.trim().split("\n").at(-1) ?? "";
							const conocido = /^[A-Z_]+$/.test(ultima)
								? ultima
								: "WORKER_FAILED";

							this.log.error(
								`El motor salió con ${codigo}: ${errores.slice(-500)}`,
							);
							rechazar(new Error(conocido));
							return;
						}

						try {
							resolver(JSON.parse(salida) as Resultado);
						} catch {
							rechazar(new Error("ENGINE_BAD_OUTPUT"));
						}
					});
				})
				.catch(rechazar);
		});
	}

	/**
	 * Sube los artefactos y comprueba que llegaron enteros.
	 *
	 * SE COMPRUEBA EL sha256 DESPUÉS DE SUBIR. Un DST truncado no se ve roto:
	 * se ve como un diseño más corto, y eso lo descubre la máquina de bordar
	 * con el hilo puesto.
	 *
	 * EL PREFIJO LLEVA EL HASH DEL DISEÑO, así que dos trabajos del mismo
	 * dibujo comparten destino y el segundo no tiene que volver a digitalizar.
	 * Es una caché, no un archivo: `embroidery/` caduca a los 90 días, y por eso
	 * el DST se COPIA al pedido cuando se compra en vez de enlazarse.
	 */
	private async publicar(
		trabajo: typeof e.trabajosDeBordado.$inferSelect,
		resultado: Resultado,
		carpeta: string,
	) {
		const prefijo = `embroidery/${trabajo.disenoHash}/${trabajo.id}`;
		const claves: Record<string, string> = {};

		for (const tipo of Object.keys(
			NOMBRES,
		) as (keyof Resultado["artifacts"])[]) {
			const ruta = resultado.artifacts[tipo];
			if (!ruta) continue;

			const cuerpo = await readFile(join(carpeta, ruta));
			const esperado = resultado.hashes[tipo];
			const real = createHash("sha256").update(cuerpo).digest("hex");

			if (esperado && esperado !== real)
				throw new Error("ARTIFACT_HASH_MISMATCH");

			const clave = `${prefijo}/${NOMBRES[tipo]}`;
			await this.almacen.subirArchivo(clave, cuerpo, TIPOS[tipo], real);

			claves[tipo] = clave;
		}

		return claves;
	}

	/**
	 * Escribe el resultado.
	 *
	 * SÓLO SI SIGUE EN `PROCESSING`: si alguien lo reintentó mientras tanto, el
	 * resultado viejo no puede pisar al nuevo.
	 */
	private async terminar(
		jobId: string,
		resultado: Resultado,
		claves: Record<string, string>,
		ms: number,
	) {
		/* La vista del bordado definitivo, como etapa: la que el previsualizador
		   pone en lugar de las puntadas provisionales. */
		const final = claves.embroidered
			? { final: { clave: claves.embroidered, ms } }
			: {};
		await this.db
			.update(e.trabajosDeBordado)
			.set({
				etapas: sql`coalesce(${e.trabajosDeBordado.etapas}, '{}'::jsonb) || ${JSON.stringify(final)}::jsonb`,
				estado: resultado.status,
				decision: resultado.decision,
				confianza: resultado.confidence,
				incidencias: resultado.issues ?? [],
				metricas: resultado.metrics ?? null,
				claveDst: claves.dst ?? null,
				claveVista: claves.preview ?? null,
				claveMetadatos: claves.metadata ?? null,
				hashes: resultado.hashes ?? null,
				codigoError: null,
				terminadoEn: new Date(),
				actualizadoEn: new Date(),
			})
			.where(
				and(
					eq(e.trabajosDeBordado.id, jobId),
					eq(e.trabajosDeBordado.estado, "PROCESSING"),
				),
			);
	}

	/** Suma etapas a las que ya tenía el trabajo (sólo mientras sigue en curso). */
	private async sumarEtapas(jobId: string, parcial: Record<string, unknown>) {
		await this.db
			.update(e.trabajosDeBordado)
			.set({
				etapas: sql`coalesce(${e.trabajosDeBordado.etapas}, '{}'::jsonb) || ${JSON.stringify(parcial)}::jsonb`,
				actualizadoEn: new Date(),
			})
			.where(
				and(
					eq(e.trabajosDeBordado.id, jobId),
					eq(e.trabajosDeBordado.estado, "PROCESSING"),
				),
			);
	}

	private async fallar(
		jobId: string,
		codigo: string,
		incidencias?: EmbroideryIssue[],
	) {
		await this.db
			.update(e.trabajosDeBordado)
			.set({
				estado: "FAILED",
				codigoError: codigo,
				...(incidencias ? { incidencias } : {}),
				terminadoEn: new Date(),
				actualizadoEn: new Date(),
			})
			.where(
				and(
					eq(e.trabajosDeBordado.id, jobId),
					eq(e.trabajosDeBordado.estado, "PROCESSING"),
				),
			);
	}

	/**
	 * Un código accionable, no un "falló".
	 *
	 * `ENGINE_TIMEOUT` es lo único que dice si hay que subirle el presupuesto al
	 * motor o si hay un fallo de verdad. Antes caía en el genérico y en los
	 * registros no había forma de distinguir "tardó demasiado" de "se rompió":
	 * un logo monocromo agotaba los setenta y cinco segundos y parecía un error
	 * cualquiera.
	 */
	private codigoDe(error: unknown) {
		const mensaje = (error as Error)?.message ?? "";
		return /^[A-Z_]+$/.test(mensaje) ? mensaje : "WORKER_FAILED";
	}
}
