import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BordadoService } from "./bordado.service";
import {
	canonicalJson,
	contenidoDelOriginal,
	NUCLEO_VERSION,
	sha256,
} from "./contrato";
import { DigitalizadorService } from "./digitalizador.service";

/**
 * V6.2 — el cableado de los servicios, con dobles de la base, S3 y la cola,
 * el NÚCLEO REAL y un "motor" de mentira que guarda el diseño que recibió y
 * contesta READY sin mirar nada. Así se ve QUÉ diseño llega a coserse y quién
 * decide el estado, sin Ink/Stitch (eso lo cubre la prueba de punta a punta
 * con Docker del informe).
 */

const NUCLEO = join(__dirname, "../../servicios/bordado/nucleo.cjs");
let carpeta: string;
let motorFalso: string;
let recibido: string;

beforeAll(async () => {
	carpeta = await mkdtemp(join(tmpdir(), "digitalizador-"));
	recibido = join(carpeta, "recibido.json");
	motorFalso = join(carpeta, "motor.py");
	// Copia el diseño que le dan y responde READY: el peor motor posible.
	await writeFile(
		motorFalso,
		`import json, sys, shutil, pathlib
d = pathlib.Path(sys.argv[2])
shutil.copy(sys.argv[1], ${JSON.stringify(recibido)})
for n in ("design.dst", "preview.png", "metadata.json"): (d / n).write_bytes(b"x")
# V6.9.2: con etapas, anuncia las puntadas del primer cosido como el motor de verdad.
import os
if os.environ.get("KUSTTO_ETAPAS") == "1":
    (d / "etapa-puntadas.png").write_bytes(b"png")
    print("ETAPA " + json.dumps({"etapa": "puntadas", "archivo": "etapa-puntadas.png"}), file=sys.stderr, flush=True)
print(json.dumps({"status": "READY", "decision": "accept", "confidence": 0.94, "issues": [], "metrics": {"stitchCount": 1}, "artifacts": {"dst": "design.dst", "preview": "preview.png", "metadata": "metadata.json"}, "hashes": {}, "engineMs": 1}))
`,
	);
});
afterAll(async () => {
	await rm(carpeta, { recursive: true, force: true });
});

const fixture = async (id: string) =>
	JSON.parse(await readFile(join(__dirname, "pruebas", `${id}.json`), "utf8"));

const env = () =>
	({
		BORDADO_ACTIVO: true,
		BORDADO_PYTHON: "python3",
		BORDADO_MOTOR: motorFalso,
		BORDADO_TIMEOUT_MS: 60_000,
		BORDADO_NUCLEO: NUCLEO,
		BORDADO_NODE: process.execPath,
		BORDADO_NUCLEO_TIMEOUT_MS: 60_000,
		BORDADO_MAXIMO_CUERPO_BYTES: 16_000_000,
		BORDADO_RASTER_VECTORIAL: true,
	}) as never;

/** Un S3 en memoria. */
function almacen() {
	const datos = new Map<string, string | Buffer>();
	return {
		datos,
		guardarTexto: vi.fn(async (k: string, v: string) => {
			datos.set(k, v);
		}),
		leerTexto: vi.fn(async (k: string) => {
			const v = datos.get(k);
			if (v === undefined) throw new Error("NoSuchKey");
			return String(v);
		}),
		subirArchivo: vi.fn(async (k: string, v: Buffer) => {
			datos.set(k, v);
		}),
		urlParaLeer: vi.fn(async () => "https://firmada"),
	};
}

/** Lo que `crear` escribiría en la base, sin base. */
async function crear(cuerpo: unknown) {
	const s3 = almacen();
	let fila: Record<string, unknown> | null = null;
	const db = {
		select: () => ({
			from: () => ({ where: () => ({ limit: async () => [] }) }),
		}),
		insert: () => ({
			values: (v: Record<string, unknown>) => {
				fila = v;
				return {
					onConflictDoNothing: () => ({
						returning: async () => [
							{ ...v, incidencias: [], estado: "QUEUED" },
						],
					}),
				};
			},
		}),
	};
	const cola = { add: vi.fn(async () => undefined) };
	const servicio = new BordadoService(
		db as never,
		env(),
		cola as never,
		s3 as never,
		{ asegurar: async () => undefined } as never,
	);
	vi.spyOn(servicio as never, "comprobarContraElProducto").mockResolvedValue(
		undefined as never,
	);
	const salida = await servicio.crear(
		{ sub: "comprador-1" } as never,
		cuerpo as Record<string, unknown>,
	);
	return { salida, fila: fila as unknown as Record<string, string>, s3 };
}

/** Procesa el trabajo creado, con la base doblada y el S3 en memoria de `crear`. */
async function procesar(
	fila: Record<string, string>,
	s3: ReturnType<typeof almacen>,
) {
	const servicio = new DigitalizadorService({} as never, env(), s3 as never);
	vi.spyOn(servicio as never, "tomar").mockResolvedValue(fila as never);
	const terminar = vi
		.spyOn(servicio as never, "terminar")
		.mockResolvedValue(undefined as never);
	const fallar = vi
		.spyOn(servicio as never, "fallar")
		.mockResolvedValue(undefined as never);
	await servicio.procesar({ jobId: fila.id, disenoHash: fila.disenoHash });
	const cosido = JSON.parse(await readFile(recibido, "utf8"));
	return { terminar, fallar, cosido };
}

describe("crear: el original decide el trabajo", () => {
	it("guarda el original canónico y la pista aparte; el id lleva el núcleo y la política", async () => {
		const { original, pista } = await fixture("aro-256");
		const { salida, fila, s3 } = await crear({ original, design: pista });
		const hash = await sha256(canonicalJson(contenidoDelOriginal(original)));
		expect(salida.designHash).toBe(hash);
		expect(salida.originalHash).toBe(hash);
		expect(fila.claveEntrada).toMatch(/\/original\.json$/);
		expect(s3.datos.get(fila.claveEntrada)).toBe(canonicalJson(original));
		expect(
			s3.datos.has(fila.claveEntrada.replace("original.json", "pista.json")),
		).toBe(true);
		expect(fila.versionPerfil).toBe("experimental-vector-v5-2026-09-25");
		// Con otro núcleo sería otro trabajo: la versión entra en el id.
		const otro = await crear({ original: { ...original } });
		expect(otro.fila.id).toBe(fila.id);
		expect(NUCLEO_VERSION).toMatch(/^[0-9a-f]{64}$/);
	});

	it("el mismo arte comprimido de otra forma es el mismo trabajo", async () => {
		const { original } = await fixture("aro-256");
		const { deflateSync, inflateSync } = await import("node:zlib");
		const f = original.fuentes[0];
		const otro = {
			...original,
			fuentes: [
				{
					...f,
					rgba: {
						...f.rgba,
						datos: deflateSync(
							inflateSync(Buffer.from(f.rgba.datos, "base64")),
							{ level: 1 },
						).toString("base64"),
					},
				},
			],
		};
		expect(otro.fuentes[0].rgba.datos).not.toBe(f.rgba.datos);
		const a = await crear({ original });
		const b = await crear({ original: otro });
		expect(b.fila.id).toBe(a.fila.id);
		expect(b.salida.designHash).toBe(a.salida.designHash);
	});

	it("un original roto no se guarda ni se encola", async () => {
		const { original } = await fixture("aro-256");
		await expect(
			crear({ original: { ...original, widthMm: -1 } }),
		).rejects.toThrow();
	});
});

describe("V6.9.2: etapas para el previsualizador del editor", () => {
	it("procesar publica la forma, los colores y las puntadas mientras el trabajo sigue", async () => {
		const { original } = await fixture("aro-256");
		const { fila, s3 } = await crear({ original });
		const servicio = new DigitalizadorService({} as never, env(), s3 as never);
		vi.spyOn(servicio as never, "tomar").mockResolvedValue(fila as never);
		vi.spyOn(servicio as never, "terminar").mockResolvedValue(
			undefined as never,
		);
		vi.spyOn(servicio as never, "fallar").mockResolvedValue(undefined as never);
		const sumar = vi
			.spyOn(servicio as never, "sumarEtapas")
			.mockResolvedValue(undefined as never);
		await servicio.procesar({ jobId: fila.id, disenoHash: fila.disenoHash });
		const prefijo = `embroidery/${fila.disenoHash}/${fila.id}`;
		const llamadas = sumar.mock.calls.map((c) => c[1] as Record<string, any>);
		expect(llamadas.map((x) => Object.keys(x)[0])).toEqual([
			"forma",
			"colores",
			"puntadas",
		]);
		expect(llamadas[0].forma.claves).toEqual([`${prefijo}/etapa-forma-0.svg`]);
		expect(llamadas[1].colores.length).toBeGreaterThan(0);
		expect(llamadas[2].puntadas.clave).toBe(`${prefijo}/etapa-puntadas.png`);
		expect(String(s3.datos.get(`${prefijo}/etapa-forma-0.svg`))).toMatch(
			/^<svg/,
		);
		expect(String(s3.datos.get(`${prefijo}/etapa-puntadas.png`))).toBe("png");
	}, 120_000);

	it("la respuesta pública firma las etapas; las puntadas son provisionales hasta terminar", async () => {
		const fila = (estado: string, extra: Record<string, unknown> = {}) => ({
			id: "emb_1",
			disenoHash: "h",
			claveEntrada: "inputs/h/emb_1/original.json",
			estado,
			incidencias: [],
			claveVista: "v.png",
			etapas: {
				forma: { claves: ["a.svg"], ms: 900 },
				colores: ["#111111"],
				puntadas: { clave: "p.png", ms: 5000 },
				final: { clave: "f.png", ms: 9000 },
			},
			...extra,
		});
		const servicio = (t: Record<string, unknown>) =>
			new BordadoService(
				{
					select: () => ({
						from: () => ({ where: () => ({ limit: async () => [t] }) }),
					}),
				} as never,
				env(),
				{} as never,
				almacen() as never,
				{} as never,
			);
		const enCurso = await servicio(fila("PROCESSING")).obtener(
			{ sub: "c" } as never,
			"emb_1",
		);
		expect(enCurso.stages).toEqual({
			shape: { urls: ["https://firmada"], ms: 900 },
			colors: ["#111111"],
			stitches: { url: "https://firmada", ms: 5000, provisional: true },
		});
		const listo = await servicio(fila("REVIEW")).obtener(
			{ sub: "c" } as never,
			"emb_1",
		);
		expect(listo.stages?.stitches?.provisional).toBe(false);
		expect(listo.stages?.final).toEqual({ url: "https://firmada", ms: 9000 });
		// Un diseño que el servidor rechazó es un rechazo con motivo, no un fallo.
		const rechazado = await servicio(
			fila("FAILED", { codigoError: "DESIGN_REJECTED" }),
		).obtener({ sub: "c" } as never, "emb_1");
		expect(rechazado.status).toBe("REJECTED");
		expect(rechazado.stages?.final).toBeUndefined();
		const fallado = await servicio(
			fila("FAILED", { codigoError: "ENGINE_TIMEOUT" }),
		).obtener({ sub: "c" } as never, "emb_1");
		expect(fallado.status).toBe("FAILED");
	});
});

describe("procesar: lo que se cose es lo del servidor", () => {
	it("con original, el motor recibe el diseño del SERVIDOR aunque la pista mienta", async () => {
		const { original, pista } = await fixture("aro-256");
		const mentira = {
			...pista,
			objects: [],
			preparation: {
				profileVersion: pista.profileVersion,
				issues: [],
				verdad: [],
			},
		};
		const { fila, s3 } = await crear({ original, design: mentira });
		const { cosido, terminar } = await procesar(fila, s3);
		// El diseño cosido trae la verdad y las incidencias del servidor, no las de la pista.
		expect(cosido.objects.length).toBeGreaterThan(0);
		expect(cosido.preparation.autoridad.nucleo).toBe(NUCLEO_VERSION);
		expect(
			cosido.preparation.issues
				.filter((i: { source: string }) => i.source === "SERVER_STRUCTURAL")
				.map((i: { code: string }) => i.code),
		).toContain("TOPOLOGY_COMPONENT_LOST");
		// La deriva queda registrada como diagnóstico.
		const [, resultado] = terminar.mock.calls[0] as unknown as [
			string,
			{ issues: Array<{ code: string }> },
		];
		expect(resultado.issues.map((i) => i.code)).toContain(
			"CLIENT_SERVER_DRIFT",
		);
		// El diseño autoritativo se publica junto al DST.
		expect(
			[...s3.datos.keys()].some((k) => k.endsWith(`/${fila.id}/design.json`)),
		).toBe(true);
	});

	it("original que el servidor no puede preparar (texto v4): sin autoridad, REVIEW aunque la pista sea válida", async () => {
		const { original } = await fixture("texto-v4");
		const { pista } = await fixture("t-limpia");
		const { fila, s3 } = await crear({ original, design: pista });
		const { cosido, terminar } = await procesar(fila, s3);
		expect(cosido.preparation.issues).toEqual([]);
		const [, resultado] = terminar.mock.calls[0] as unknown as [
			string,
			{ status: string; issues: Array<{ code: string }> },
		];
		expect(resultado.status).toBe("REVIEW");
		expect(resultado.issues.map((i) => i.code)).toContain(
			"SERVER_CANNOT_VERIFY",
		);
	});

	it("cliente viejo (sólo `design`): se cose despojado y el estado es REVIEW aunque el motor diga READY", async () => {
		const { pista } = await fixture("t-limpia");
		const conMentiras = {
			...pista,
			preparation: {
				...pista.preparation,
				autoridad: { algoritmo: "yo" },
				issues: [
					{
						code: "OK",
						severity: "info",
						message: "",
						source: "SERVER_STRUCTURAL",
					},
				],
			},
		};
		const { fila, s3 } = await crear({ design: conMentiras });
		expect(fila.claveEntrada).toMatch(/\/design\.json$/);
		const { cosido, terminar } = await procesar(fila, s3);
		expect(cosido.preparation.issues).toEqual([]);
		expect(cosido.preparation.autoridad).toBeUndefined();
		const [, resultado] = terminar.mock.calls[0] as unknown as [
			string,
			{ status: string; issues: Array<{ code: string }> },
		];
		expect(resultado.status).toBe("REVIEW");
		expect(resultado.issues.map((i) => i.code)).toContain(
			"SERVER_ORIGINAL_MISSING",
		);
	});
});
