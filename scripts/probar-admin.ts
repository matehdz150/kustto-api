/**
 * Prueba el backoffice por el CÓDIGO REAL.
 *
 * Como los otros: contexto de Nest y servicios inyectados, sin HTTP y sin
 * necesitar un token del pool de admins.
 */
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { CategoriasService } from "../src/admin/categorias.service";
import { PlantillasService } from "../src/admin/plantillas.service";
import { RevisionService } from "../src/admin/revision.service";
import { SubidasService } from "../src/admin/subidas.service";
import { AppModule } from "../src/app.module";
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
	const plantillas = app.get(PlantillasService);
	const categorias = app.get(CategoriasService);
	const revision = app.get(RevisionService);
	const subidas = app.get(SubidasService);

	const sufijo = Date.now().toString(36);

	/* ─── 1. Plantillas de prenda ─────────────────────────────────────── */
	console.log("\n1. Plantillas de prenda");

	const plana = {
		id: `prueba-plana-${sufijo}`,
		name: "Prueba plana",
		data: {
			sides: ["front", "back"],
			sideLabels: { front: "Delante", back: "Detrás" },
			mockups: { front: "/mockups/x/f.png", back: "/mockups/x/b.png" },
			editableAreas: {
				front: [
					{ id: "f", type: "rect", left: 0, top: 0, width: 10, height: 10 },
				],
				back: [
					{ id: "b", type: "rect", left: 0, top: 0, width: 10, height: 10 },
				],
			},
		},
	};

	await plantillas.crear(plana);
	const leida = await plantillas.obtener(plana.id);
	comprobar(
		"se crea y se lee con la forma que espera el editor",
		leida.name === "Prueba plana" && (leida.data as any).sides.length === 2,
	);
	comprobar(
		"sin forma declarada queda `plano`",
		(leida.data as any).forma === "plano",
		String((leida.data as any).forma),
	);

	await falla(
		"el mismo id dos veces se rechaza",
		() => plantillas.crear(plana),
		"Ya existe una plantilla",
	);

	await falla(
		"un cilindro con dos lados se rechaza",
		() =>
			plantillas.crear({
				...plana,
				id: `prueba-cil-${sufijo}`,
				data: { ...plana.data, forma: "cilindro" },
			}),
		"un solo lado",
	);

	await falla(
		"un lado sin mockup se rechaza",
		() =>
			plantillas.crear({
				...plana,
				id: `prueba-sinmock-${sufijo}`,
				data: { ...plana.data, mockups: { front: "/x.png" } },
			}),
		'"back" no tiene mockup',
	);

	await falla(
		"un lado sin área imprimible se rechaza",
		() =>
			plantillas.crear({
				...plana,
				id: `prueba-sinarea-${sufijo}`,
				data: {
					...plana.data,
					editableAreas: { front: (plana.data.editableAreas as any).front },
				},
			}),
		'"back" no tiene área',
	);

	await falla(
		"un id con mayúsculas se rechaza",
		() => plantillas.crear({ ...plana, id: "PruebaMal" }),
		"minúsculas",
	);

	await falla(
		"un PATCH a una plantilla inexistente NO la crea",
		() => plantillas.actualizar("no-existe-jamas", { name: "x" }),
		"no encontrada",
	);

	/* La que usan los productos migrados no se puede borrar. */
	const [enUso] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.estado, "activo"))
		.limit(1);

	await falla(
		"una plantilla en uso no se borra",
		() => plantillas.borrar(enUso.plantillaId!),
		"producto",
	);

	await plantillas.borrar(plana.id);
	comprobar("una sin usar sí se borra", true);

	/* ─── 2. Categorías ───────────────────────────────────────────────── */
	console.log("\n2. Categorías");

	await falla(
		"sin imagen se rechaza",
		() => categorias.crear({ name: "Sin foto" }),
		"Falta la imagen",
	);

	const c1 = await categorias.crear({
		name: `Gorras ${sufijo}`,
		image: "/medios/categorias/x.png",
	});
	const c2 = await categorias.crear({
		name: `Gorras ${sufijo}`,
		image: "/medios/categorias/y.png",
	});
	comprobar(
		"dos categorías con el mismo nombre conviven con slugs distintos",
		c1.slug !== c2.slug,
		`${c1.slug} / ${c2.slug}`,
	);

	const renombrada = await categorias.actualizar(c1.id, {
		name: "Otro nombre",
	});
	comprobar(
		"renombrar NO cambia el slug (es parte de una URL compartida)",
		renombrada.slug === c1.slug,
		renombrada.slug,
	);

	const [conProductos] = await db.select().from(e.productoCategorias).limit(1);

	await falla(
		"una categoría con productos dentro no se borra",
		() => categorias.borrar(conProductos.categoriaId),
		"producto",
	);

	await categorias.borrar(c2.id);
	comprobar("una vacía sí se borra", true);

	/* ─── 3. Revisión de productos ────────────────────────────────────── */
	console.log("\n3. Revisión de productos");

	await falla(
		"un estado inventado se rechaza",
		() => revision.listar("inventado"),
		"Estado desconocido",
	);

	/* Se manda uno a revisión para poder resolverlo. */
	const [producto] = await db
		.update(e.productos)
		.set({ estado: "en_revision", notaRevision: null })
		.where(eq(e.productos.id, enUso.id))
		.returning();

	const cola = await revision.listar();
	comprobar(
		"la cola por defecto son los que esperan revisión",
		cola.some((p) => p.id === producto.id),
		`${cola.length} en cola`,
	);

	const ficha = await revision.obtener(producto.id);
	comprobar(
		"la ficha trae lo que hay que mirar para decidir",
		Array.isArray((ficha as any).printSides) && (ficha as any).pricing !== null,
		`${(ficha as any).printSides.length} lados, base $${(ficha as any).pricing?.basePrice}`,
	);
	comprobar(
		"y el nombre del taller",
		Boolean(ficha.proveedor),
		String(ficha.proveedor),
	);

	await falla(
		"rechazar sin decir por qué se rechaza",
		() => revision.revisar(producto.id, { decision: "rechazar" }),
		"Escribe por qué",
	);

	const rechazado = await revision.revisar(producto.id, {
		decision: "rechazar",
		nota: "Falta el peso de la talla M",
	});
	comprobar(
		"rechazar deja la nota que verá el taller",
		rechazado.estado === "rechazado" &&
			rechazado.notaRevision === "Falta el peso de la talla M",
	);

	await falla(
		"no se puede revisar lo que ya no espera revisión",
		() => revision.revisar(producto.id, { decision: "aprobar" }),
		"ya no espera revisión",
	);

	await db
		.update(e.productos)
		.set({ estado: "en_revision" })
		.where(eq(e.productos.id, producto.id));

	const aprobado = await revision.revisar(producto.id, { decision: "aprobar" });
	comprobar(
		"aprobar publica y limpia la nota vieja",
		aprobado.estado === "activo" && aprobado.notaRevision === null,
	);

	/* ─── 4. Subidas ──────────────────────────────────────────────────── */
	console.log("\n4. Subidas a S3");

	const mockup = await subidas.urlParaMockup({
		contentType: "image/png",
		templateId: "tshirt",
		side: "front",
	});
	comprobar(
		"la ruta del mockup es relativa, nunca la de S3",
		mockup.path.startsWith("/mockups/tshirt/front-") &&
			!mockup.path.includes("amazonaws"),
		mockup.path,
	);
	comprobar(
		"y la URL firmada sí es de S3",
		mockup.uploadUrl.includes("X-Amz-Signature"),
	);

	await falla(
		"un tipo no soportado se rechaza",
		() =>
			subidas.urlParaMockup({
				contentType: "application/pdf",
				templateId: "x",
				side: "y",
			}),
		"Tipo no soportado",
	);

	await falla(
		"una carpeta fuera de la lista blanca se rechaza",
		() =>
			subidas.urlParaImagen({ contentType: "image/png", carpeta: "mockups" }),
		"Carpeta no permitida",
	);

	const limpiada = await subidas.urlParaMockup({
		contentType: "image/png",
		templateId: "../../otro",
		side: "front",
	});
	comprobar(
		"un `../` en el id se limpia antes de tocar S3",
		!limpiada.path.includes(".."),
		limpiada.path,
	);

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
