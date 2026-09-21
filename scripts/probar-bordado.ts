/**
 * Prueba la API de bordado por el CÓDIGO REAL.
 *
 * NO PRUEBA EL MOTOR: Ink/Stitch vive en otra imagen y digitalizar de verdad
 * tarda más de un minuto. Lo que se prueba aquí es todo lo demás — el
 * interruptor, la validación del contrato, la idempotencia, el reintento y la
 * toma atómica del trabajo — con un motor de mentira que devuelve lo que
 * devolvería el de verdad.
 */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { AlmacenService } from "../src/almacen/almacen.service";
import { AppModule } from "../src/app.module";
import { BordadoService } from "../src/bordado/bordado.service";
import { embroideryDesignHash, embroideryJobId } from "../src/bordado/contrato";
import { DigitalizadorService } from "../src/bordado/digitalizador.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

let fallos = 0;

function comprobar(que: string, bien: boolean, detalle = "") {
	console.log(
		`  ${bien ? "ok  " : "FALLA"}  ${que}${detalle ? ` — ${detalle}` : ""}`,
	);
	if (!bien) fallos++;
}

async function falla(
	que: string,
	fn: () => Promise<unknown>,
	esperado: string,
) {
	try {
		await fn();
		comprobar(que, false, "no lanzó");
	} catch (error) {
		const m = (error as Error).message ?? "";
		comprobar(que, m.includes(esperado), m.slice(0, 95));
	}
}

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});

	const db = app.get<Db>(DB);
	const bordado = app.get(BordadoService);
	const digitalizador = app.get(DigitalizadorService);
	const almacen = app.get(AlmacenService);

	const quien = {
		sub: `bordado-${Date.now()}`,
		correo: `bordado.${Date.now()}@kustto.mx`,
		correoVerificado: true,
		grupos: [] as string[],
	};

	/* ─── 1. El interruptor ───────────────────────────────────────────── */
	console.log("\n1. El interruptor");

	const env = (bordado as any).env;
	comprobar(
		"`BORDADO_ACTIVO=false` apaga de verdad (no lo hacía: ver el commit)",
		env.BORDADO_ACTIVO === false,
		`leído como ${env.BORDADO_ACTIVO}`,
	);

	await falla(
		"apagado, la ruta no existe (404, no 403)",
		() => bordado.crear(quien, {}),
		"no disponible",
	);

	/* A partir de aquí se enciende a mano: lo que sigue es la lógica. */
	env.BORDADO_ACTIVO = true;

	/* ─── 2. El contrato ──────────────────────────────────────────────── */
	console.log("\n2. La validación del contrato");

	await falla(
		"un diseño vacío se rechaza",
		() => bordado.crear(quien, { design: {} }),
		"no es válido",
	);

	/* Se prepara un producto de bordado de verdad para lo que sigue. */
	const [producto] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.estado, "activo"))
		.limit(1);

	const [lado] = await db
		.update(e.productoLados)
		.set({ tecnica: "bordado", anchoCm: 8, altoCm: 5 })
		.where(eq(e.productoLados.productoId, producto.id))
		.returning();

	/* Un diseño que cumple el contrato entero. Se arma a mano y no con un
	   ayudante: es LA forma que el editor tiene que mandar, y tenerla escrita
	   aquí hace que si el contrato cambia, esta prueba lo diga. */
	const diseno = {
		schemaVersion: 1,
		engineVersion: "inkstitch-3.3.0",
		profileVersion: "experimental-v1-2026-09-05",
		productId: producto.id,
		sideId: lado.clave,
		sourceSnapshotHash: "a".repeat(64),
		/* Dentro del techo del perfil (90 x 60 mm): más grande y lo rechaza
		   antes de llegar a comparar con el producto. */
		physical: { widthMm: 80, heightMm: 50 },
		bounds: { xMm: 5, yMm: 5, widthMm: 70, heightMm: 40 },
		colors: [{ id: "c1", sourceHex: "#112233", displayHex: "#112233" }],
		objects: [
			{
				id: "o1",
				sourceObjectId: "s1",
				colorId: "c1",
				sourceType: "vector",
				geometry: { kind: "path", d: "M 10 10 L 70 10 L 70 40 Z" },
				bounds: { xMm: 10, yMm: 10, widthMm: 60, heightMm: 30 },
				stitch: { type: "satin", spacingMm: 0.4, maxStitchLengthMm: 6 },
				nodeCount: 3,
			},
		],
	};

	await falla(
		"unas medidas que no cuadran con el producto se rechazan",
		() =>
			bordado.crear(quien, {
				design: {
					...diseno,
					physical: { widthMm: 60, heightMm: 40 },
					bounds: { xMm: 5, yMm: 5, widthMm: 50, heightMm: 30 },
					objects: [
						{
							...diseno.objects[0],
							bounds: { xMm: 10, yMm: 10, widthMm: 40, heightMm: 20 },
						},
					],
				},
			}),
		"no coinciden con el producto",
	);

	await db
		.update(e.productoLados)
		.set({ tecnica: "dtf" })
		.where(eq(e.productoLados.id, lado.id));

	await falla(
		"un lado que no se borda se rechaza",
		() => bordado.crear(quien, { design: diseno }),
		"no usa técnica de bordado",
	);

	await db
		.update(e.productoLados)
		.set({ tecnica: "bordado" })
		.where(eq(e.productoLados.id, lado.id));

	/* ─── 3. Idempotencia ─────────────────────────────────────────────── */
	console.log("\n3. Idempotencia");

	const uno = await bordado.crear(quien, { design: diseno });
	comprobar("se crea en cola", uno.status === "QUEUED", uno.status);
	comprobar(
		"con un id derivado, no un uuid",
		/^emb_[a-f0-9]{40}$/.test(uno.jobId),
		uno.jobId,
	);

	const dos = await bordado.crear(quien, { design: diseno });
	comprobar(
		"pedirlo dos veces NO digitaliza dos veces",
		dos.jobId === uno.jobId,
		`${uno.jobId.slice(0, 16)}… == ${dos.jobId.slice(0, 16)}…`,
	);

	/* Se cuenta por COMPRADOR y no por hash: el hash es del contenido, así que
	   corridas anteriores de esta misma prueba dejaron trabajos con el mismo
	   hash y otro dueño. Eso es justo lo que se quiere —el artefacto se
	   comparte— pero no es lo que esta comprobación mira. */
	const cuantos = await db
		.select()
		.from(e.trabajosDeBordado)
		.where(eq(e.trabajosDeBordado.compradorId, quien.sub));
	comprobar(
		"y sólo hay un trabajo suyo en la base",
		cuantos.length === 1,
		`${cuantos.length}`,
	);

	const ajeno = { ...quien, sub: `otro-${Date.now()}` };
	await falla(
		"el trabajo de otra persona no se abre",
		() => bordado.obtener(ajeno, uno.jobId),
		"Job no encontrado",
	);

	/* El mismo diseño de OTRA persona es otro trabajo: el id lleva el dueño. */
	const deOtro = await embroideryJobId(
		ajeno.sub,
		await embroideryDesignHash(diseno as never),
	);
	comprobar(
		"pero el mismo diseño de otra persona es otro trabajo",
		deOtro !== uno.jobId,
	);

	/* ─── 4. La toma del trabajo ──────────────────────────────────────── */
	console.log("\n4. Tomar el trabajo");

	/* Un motor de mentira: escribe los tres artefactos EN LA CARPETA QUE
	   RECIBE —la crea `procesar`, no esta prueba— y devuelve lo que devolvería
	   Ink/Stitch. Así se recorre todo el camino sin coser nada. */
	const artefactos: Record<string, Buffer> = {
		"design.dst": Buffer.from("DST de mentira"),
		"preview.png": Buffer.from("PNG de mentira"),
		"metadata.json": Buffer.from('{"de":"mentira"}'),
	};
	const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

	(digitalizador as any).correrMotor = async (
		_diseno: string,
		carpeta: string,
	) => {
		for (const [nombre, cuerpo] of Object.entries(artefactos)) {
			await writeFile(join(carpeta, nombre), cuerpo);
		}

		return {
			status: "REVIEW",
			decision: "revisar",
			confidence: 0.62,
			issues: [{ code: "DENSIDAD_ALTA" }],
			metrics: { stitchCount: 4210, colorCount: 2 },
			artifacts: {
				dst: "design.dst",
				preview: "preview.png",
				metadata: "metadata.json",
			},
			hashes: {
				dst: sha(artefactos["design.dst"]),
				preview: sha(artefactos["preview.png"]),
				metadata: sha(artefactos["metadata.json"]),
			},
			engineMs: 41_000,
		};
	};

	const primera = await digitalizador.procesar({
		jobId: uno.jobId,
		disenoHash: uno.designHash,
	});
	comprobar(
		"lo toma y lo procesa",
		primera.tomado === true,
		JSON.stringify(primera),
	);

	const segunda = await digitalizador.procesar({
		jobId: uno.jobId,
		disenoHash: uno.designHash,
	});
	comprobar(
		"un mensaje DUPLICADO no lo vuelve a procesar",
		segunda.tomado === false,
		JSON.stringify(segunda),
	);

	const [tras] = await db
		.select()
		.from(e.trabajosDeBordado)
		.where(eq(e.trabajosDeBordado.id, uno.jobId));

	comprobar(
		"queda en REVIEW, que también es un éxito",
		tras.estado === "REVIEW",
		tras.estado,
	);
	comprobar(
		"con su confianza y sus métricas",
		tras.confianza === 0.62 && (tras.metricas as any).stitchCount === 4210,
	);
	comprobar(
		"el contador de intentos sube al TOMARLO",
		tras.intentos === 1,
		`${tras.intentos}`,
	);
	comprobar(
		"y los artefactos quedan bajo el hash del diseño",
		tras.claveDst?.startsWith(`embroidery/${uno.designHash}/`) === true,
		tras.claveDst ?? "",
	);

	const visto = await bordado.obtener(quien, uno.jobId);
	comprobar(
		"la vista previa se firma sólo cuando hay algo que ver",
		Boolean(visto.previewUrl?.includes("X-Amz-Signature")),
	);

	/* ─── 5. Fallos y reintento ───────────────────────────────────────── */
	console.log("\n5. Fallos y reintento");

	await db
		.update(e.trabajosDeBordado)
		.set({ estado: "QUEUED" })
		.where(eq(e.trabajosDeBordado.id, uno.jobId));

	(digitalizador as any).correrMotor = async () => {
		throw new Error("ENGINE_TIMEOUT");
	};

	await digitalizador
		.procesar({ jobId: uno.jobId, disenoHash: uno.designHash })
		.catch(() => undefined);

	const [fallado] = await db
		.select()
		.from(e.trabajosDeBordado)
		.where(eq(e.trabajosDeBordado.id, uno.jobId));

	comprobar(
		"un fallo del motor deja el trabajo FAILED",
		fallado.estado === "FAILED",
	);
	comprobar(
		"con un código accionable, no un 'falló'",
		fallado.codigoError === "ENGINE_TIMEOUT",
		fallado.codigoError ?? "",
	);

	const sinReintento = await bordado.crear(quien, { design: diseno });
	comprobar(
		"sin pedir reintento, sigue fallado",
		sinReintento.status === "FAILED",
		sinReintento.status,
	);

	const reintentado = await bordado.crear(quien, {
		design: diseno,
		retry: true,
	});
	comprobar(
		"pidiendo reintento, vuelve a la cola",
		reintentado.status === "QUEUED",
		reintentado.status,
	);

	/* ─── Limpieza ────────────────────────────────────────────────────── */
	for (const clave of [
		tras.claveDst,
		tras.claveVista,
		tras.claveMetadatos,
		tras.claveEntrada,
	]) {
		if (clave) await almacen.borrar(clave);
	}

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
