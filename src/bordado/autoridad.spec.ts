import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type Contexto,
	correrNucleo,
	despojar,
	type ResultadoDelNucleo,
	veredicto,
} from "./autoridad";
import { canonicalJson, type EmbroideryDesign } from "./contrato";
import {
	ErrorDeFrontera,
	excedeProfundidad,
	leerPeticionDeBordado,
	pistaAcotada,
} from "./frontera";

/**
 * V6.2 — la autoridad del servidor, probada con el NÚCLEO REAL: el mismo
 * `servicios/bordado/nucleo.cjs` que corre el worker, como proceso aparte.
 *
 * Las fixtures (`pruebas/*.json`) son originales sintéticos y la pista que
 * el navegador prepararía con ellos (`kustto-web/scripts/bordado/
 * fixtures-autoridad.mts`). Cada prueba intenta engañar al servidor con la
 * pista o con el cuerpo de la petición; ninguna debe cambiar lo autoritativo.
 */

const NUCLEO = join(__dirname, "../../servicios/bordado/nucleo.cjs");
let carpeta: string;
beforeAll(async () => {
	carpeta = await mkdtemp(join(tmpdir(), "autoridad-"));
});
afterAll(async () => {
	await rm(carpeta, { recursive: true, force: true });
});

const fixture = async (id: string) =>
	JSON.parse(
		await readFile(join(__dirname, "pruebas", `${id}.json`), "utf8"),
	) as {
		original: Record<string, any>;
		pista: Record<string, any> | null;
	};

const nucleo = (original: unknown, pista: unknown) =>
	correrNucleo({ original, pista }, carpeta, {
		node: process.execPath,
		nucleo: NUCLEO,
		timeoutMs: 60_000,
	});

/** Lo que decide: estado, diseño que se cose, incidencias con procedencia, verdad y autoridad. */
function autoritativo(r: ResultadoDelNucleo) {
	if (r.estado !== "preparado")
		return r.estado === "rechazado"
			? { estado: r.estado, i: r.incidencias }
			: { estado: r.estado, codigo: r.codigo };
	return {
		estado: r.estado,
		diseno: canonicalJson(r.design),
		revision: (r.design.preparation?.issues ?? [])
			.filter((i) => i.severity === "review")
			.map((i) => `${i.code}:${i.source}`)
			.sort(),
		verdad: canonicalJson(r.design.preparation?.verdad ?? []),
		autoridad: r.autoridad,
	};
}

/** Pistas que intentan engañar al servidor. */
function trampas(pista: Record<string, any> | null): Array<[string, unknown]> {
	const con = (f: (x: any) => void) => {
		const x = JSON.parse(JSON.stringify(pista ?? {}));
		x.preparation ??= {};
		f(x);
		return x;
	};
	return [
		["correcta", pista],
		["sin-pista", null],
		["vacia", {}],
		["preparation-vacia", con((x) => (x.preparation = {}))],
		["sin-verdad (A)", con((x) => delete x.preparation.verdad)],
		[
			"mentira: sin piezas, huecos, ejes ni incidencias (B)",
			con(
				(x) => (
					(x.preparation.verdad = [
						{ id: "o0", componentes: [], counters: [] },
					]),
					(x.preparation.estructura = []),
					(x.preparation.issues = [])
				),
			),
		],
		[
			"incidencias 'del servidor' inventadas",
			con(
				(x) =>
					(x.preparation.issues = [
						{
							code: "OK",
							message: "todo bien",
							severity: "info",
							source: "SERVER_STRUCTURAL",
						},
					]),
			),
		],
		[
			"métricas y autoridad falsas",
			con(
				(x) => (
					(x.metrics = { componentCount: 0 }),
					(x.preparation.autoridad = { algoritmo: "yo", nucleo: "yo" })
				),
			),
		],
		[
			"cliente V5 (D)",
			con(
				(x) => (
					(x.profileVersion = "experimental-vector-v5-2026-09-25"),
					delete x.preparation.verdad,
					delete x.preparation.estructura
				),
			),
		],
		[
			"cliente futuro (E)",
			con(
				(x) => (
					(x.v9 = { forzar: "READY" }), (x.preparation.verdadV9 = { ok: true })
				),
			),
		],
	];
}

describe("autoridad del servidor (núcleo real)", () => {
	it.each(["aro-256", "counter-cerrado", "t-limpia"])(
		"%s: ninguna pista cambia el veredicto autoritativo",
		async (id) => {
			const { original, pista } = await fixture(id);
			const referencia = autoritativo(await nucleo(original, null));
			expect(referencia.estado).toBe("preparado");
			for (const [nombre, trampa] of trampas(pista)) {
				const r = await nucleo(original, trampa);
				expect(autoritativo(r), `${id} con ${nombre}`).toEqual(referencia);
			}
		},
		120_000,
	);

	it("C: el falso READY raster de V6.1 (aro a 256 px) lo detecta el servidor aunque la pista diga que todo está bien", async () => {
		const { original, pista } = await fixture("aro-256");
		const todoBien = {
			...pista,
			preparation: {
				profileVersion: pista?.profileVersion,
				issues: [],
				verdad: [],
				estructura: [],
			},
		};
		const r = await nucleo(original, todoBien);
		expect(r.estado).toBe("preparado");
		if (r.estado !== "preparado") return;
		const codigos = (r.design.preparation?.issues ?? [])
			.filter(
				(i) => i.severity === "review" && i.source === "SERVER_STRUCTURAL",
			)
			.map((i) => i.code);
		expect(codigos).toContain("TOPOLOGY_COMPONENT_LOST");
		expect(codigos).toContain("TOPOLOGY_HOLE_LOST");
		// La mentira queda a la vista como deriva, sin decidir nada.
		expect(
			r.diagnostico.deriva.map((d) => [d.code, d.severity, d.source]),
		).toEqual([["CLIENT_SERVER_DRIFT", "info", "SERVER_DIAGNOSTIC"]]);
		// Y el veredicto: con un motor que diera READY, sigue siendo REVIEW porque el diseño lleva las incidencias.
		expect(r.design.preparation?.autoridad?.originalHash).toMatch(
			/^[0-9a-f]{64}$/,
		);
	});

	it("A: sin `preparation.verdad` el servidor calcula la suya y conserva la misma causa", async () => {
		const { original, pista } = await fixture("counter-cerrado");
		const sinVerdad = JSON.parse(JSON.stringify(pista));
		delete sinVerdad.preparation.verdad;
		const r = await nucleo(original, sinVerdad);
		if (r.estado !== "preparado") throw new Error(r.estado);
		expect((r.design.preparation?.issues ?? []).map((i) => i.code)).toContain(
			"TOPOLOGY_HOLE_LOST",
		);
		expect(r.design.preparation?.verdad?.[0]?.counters.length).toBe(1);
	});

	it("quitar `vectorizar` del original no manda la imagen por la ruta sin verdad: la ruta es del servidor", async () => {
		const { original } = await fixture("aro-256");
		const sin = JSON.parse(JSON.stringify(original));
		delete sin.fuentes[0].vectorizar;
		const politica = { rasterVectorial: true };
		const a = await correrNucleo({ original, pista: null, politica }, carpeta, {
			node: process.execPath,
			nucleo: NUCLEO,
			timeoutMs: 60_000,
		});
		const b = await correrNucleo(
			{ original: sin, pista: null, politica },
			carpeta,
			{
				node: process.execPath,
				nucleo: NUCLEO,
				timeoutMs: 60_000,
			},
		);
		expect(autoritativo(b)).toEqual(autoritativo(a));
	});

	it("V6.9.2: con etapas, la forma de la imagen se anuncia escrita entera y el resultado no cambia", async () => {
		const { original } = await fixture("aro-256");
		const politica = { rasterVectorial: true };
		const opciones = {
			node: process.execPath,
			nucleo: NUCLEO,
			timeoutMs: 60_000,
		};
		const sin = await correrNucleo(
			{ original, pista: null, politica },
			carpeta,
			opciones,
		);
		const vistas: Array<[string, string]> = [];
		const con = await correrNucleo(
			{ original, pista: null, politica },
			carpeta,
			{
				...opciones,
				alEtapa: (etapa, ruta) => vistas.push([etapa, ruta]),
			},
		);
		expect(autoritativo(con)).toEqual(autoritativo(sin));
		expect(vistas.map(([e]) => e)).toEqual(["forma"]);
		expect(vistas[0][1]).toBe(join(carpeta, "forma-0.svg"));
		const svg = await readFile(vistas[0][1], "utf8");
		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).toContain("<path");
	});

	it("una ruta que el servidor no puede preparar (texto v4) no tiene autoridad", async () => {
		const { original } = await fixture("texto-v4");
		const r = await nucleo(original, null);
		expect(r.estado).toBe("no-verificable");
	});

	it("un original que no pasa la frontera del núcleo es inválido, sin preparar nada", async () => {
		const { original } = await fixture("aro-256");
		const roto = JSON.parse(JSON.stringify(original));
		roto.fuentes[0].rgba.sha256 = "a".repeat(64);
		expect(await nucleo(roto, null)).toMatchObject({
			estado: "invalido",
			codigo: "RASTER_HASH_INCORRECTO",
		});
	});
});

describe("veredicto", () => {
	const motor = {
		status: "READY" as const,
		confidence: 0.94,
		issues: [] as unknown[],
	};
	it("con autoridad del servidor manda el motor; la deriva es info y no cambia el estado", () => {
		const ctx: Contexto = {
			autoridad: "servidor",
			diagnostico: {
				cliente: { presente: true },
				deriva: [
					{
						code: "CLIENT_SERVER_DRIFT",
						message: "",
						severity: "info",
						source: "SERVER_DIAGNOSTIC",
					},
				],
			},
		};
		const v = veredicto(motor, ctx);
		expect(v.status).toBe("READY");
		expect(v.issues.map((i) => i.code)).toEqual(["CLIENT_SERVER_DRIFT"]);
	});
	it("sin autoridad (cliente viejo o ruta no verificable) nunca es READY", () => {
		for (const motivo of [
			"SERVER_ORIGINAL_MISSING",
			"SERVER_CANNOT_VERIFY",
		] as const) {
			const v = veredicto(motor, {
				autoridad: "ninguna",
				motivo,
				delCliente: [],
			});
			expect(v.status).toBe("REVIEW");
			expect(v.issues.at(-1)).toMatchObject({
				code: motivo,
				severity: "review",
				source: "SERVER_VALIDATION",
			});
		}
	});
	it("despojar quita todo lo que el navegador afirmaba", async () => {
		const { pista } = await fixture("counter-cerrado");
		const conAutoridad = JSON.parse(JSON.stringify(pista));
		conAutoridad.preparation.autoridad = { algoritmo: "falso" };
		const { design, delCliente } = despojar(conAutoridad as EmbroideryDesign);
		expect(design.preparation).toEqual({
			profileVersion: pista?.preparation.profileVersion,
			issues: [],
		});
		expect(design.objects).toEqual(pista?.objects);
		expect(delCliente.every((i) => i.source === "CLIENT_PREVIEW")).toBe(true);
	});
});

describe("frontera de la petición", () => {
	it("acepta el original, quita lo que no es del contrato y acota la pista", async () => {
		const { original, pista } = await fixture("t-limpia");
		const cuerpo = {
			original: {
				...original,
				admin: true,
				fuentes: [{ ...original.fuentes[0], forzar: "READY" }],
			},
			design: pista,
			extra: { x: 1 },
		};
		const p = leerPeticionDeBordado(JSON.parse(JSON.stringify(cuerpo)));
		expect(p.tipo).toBe("original");
		if (p.tipo !== "original") return;
		expect(canonicalJson(p.original)).toBe(canonicalJson(original));
		expect(p.pista).not.toBeNull();
	});
	it("rechaza lo absurdo antes de gastar CPU", async () => {
		const { original } = await fixture("t-limpia");
		const falla = (mutar: (x: any) => void) => {
			const x = JSON.parse(JSON.stringify(original));
			mutar(x);
			expect(() => leerPeticionDeBordado({ original: x })).toThrow(
				ErrorDeFrontera,
			);
		};
		falla((x) => (x.widthMm = JSON.parse("1e999"))); // Infinity tras parsear
		falla((x) => (x.fuentes[0].cajaMm.x = -1e12));
		falla(
			(x) => (x.fuentes = Array.from({ length: 1000 }, () => x.fuentes[0])),
		);
		falla((x) => (x.fuentes[0].marcado = `<svg>${"<g>".repeat(20_000)}</svg>`));
		falla(
			(x) =>
				(x.fuentes[0] = {
					tipo: "raster",
					sourceObjectId: "r",
					ancho: 10_000,
					alto: 10_000,
					mmPorPx: 0.01,
					desplazamientoMm: 0,
					rgba: { codificacion: "deflate", datos: "", sha256: "0".repeat(64) },
				}),
		);
		expect(() => leerPeticionDeBordado(null)).toThrow(ErrorDeFrontera);
		expect(() => leerPeticionDeBordado([])).toThrow(ErrorDeFrontera);
	});
	it("una pista gigante o profundísima se descarta sin recorrerla con recursión", () => {
		let profundo: unknown = 0;
		for (let i = 0; i < 100_000; i++) profundo = [profundo];
		expect(excedeProfundidad(profundo)).toBe(true);
		expect(pistaAcotada(profundo)).toBeNull();
		expect(pistaAcotada({ objects: "x".repeat(3_000_000) })).toBeNull();
		expect(pistaAcotada({ ok: 1 })).toEqual({ ok: 1 });
	});
	it("D: un cliente viejo (sólo `design`) se acepta como legado; un diseño profundísimo no", async () => {
		const { pista } = await fixture("t-limpia");
		expect(leerPeticionDeBordado({ design: pista }).tipo).toBe("legado");
		let profundo: unknown = 0;
		for (let i = 0; i < 10_000; i++) profundo = { a: profundo };
		expect(() => leerPeticionDeBordado({ design: profundo })).toThrow(
			ErrorDeFrontera,
		);
	});
});
