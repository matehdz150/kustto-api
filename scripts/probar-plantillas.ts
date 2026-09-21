/**
 * Prueba las plantillas de compra por el CÓDIGO REAL.
 *
 * Incluye el camino de vuelta al carrito CONTRA S3 DE VERDAD: se firma una
 * subida, se sube un PNG diminuto, se arma una plantilla con ese arte y se
 * carga. Es la única forma de comprobar que la copia de servidor a servidor
 * funciona; al final se borra lo subido.
 */
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { AlmacenService } from "../src/almacen/almacen.service";
import { PlantillasDeCompraService } from "../src/cuenta/plantillas.service";
import { PerfilService } from "../src/cuenta/perfil.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

let fallos = 0;

function comprobar(que: string, bien: boolean, detalle = "") {
	console.log(`  ${bien ? "ok  " : "FALLA"}  ${que}${detalle ? ` — ${detalle}` : ""}`);
	if (!bien) fallos++;
}

async function falla(que: string, fn: () => Promise<unknown>, esperado: string) {
	try {
		await fn();
		comprobar(que, false, "no lanzó");
	} catch (error) {
		const m = (error as Error).message ?? "";
		comprobar(que, m.includes(esperado), m.slice(0, 95));
	}
}

/** Un PNG de 1×1, transparente. Lo mínimo que S3 acepta como imagen. */
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});

	const db = app.get<Db>(DB);
	const plantillas = app.get(PlantillasDeCompraService);
	const perfil = app.get(PerfilService);
	const almacen = app.get(AlmacenService);

	const quien = {
		sub: `prueba-plantillas-${Date.now()}`,
		correo: `plantillas.${Date.now()}@kustto.mx`,
		correoVerificado: true,
		grupos: [] as string[],
	};
	await perfil.guardar(quien, { nombre: "Prueba" });

	const [producto] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.estado, "activo"))
		.limit(1);

	const item = (extra: Record<string, unknown> = {}) => ({
		productoId: producto.id,
		nombre: producto.nombre,
		colorPrenda: "Negro",
		tallas: [{ size: "S", piezas: 2 }, { size: "M", piezas: 3 }],
		...extra,
	});

	/* ─── 1. Validaciones ─────────────────────────────────────────────── */
	console.log("\n1. Validaciones");

	await falla(
		"sin nombre se rechaza",
		() => plantillas.crear(quien, { items: [item()] }),
		"Ponle un nombre",
	);
	await falla(
		"vacía se rechaza",
		() => plantillas.crear(quien, { nombre: "X", items: [] }),
		"no sirve para nada",
	);
	await falla(
		"sin cantidades se rechaza",
		() => plantillas.crear(quien, { nombre: "X", items: [item({ tallas: [] })] }),
		"le faltan las cantidades",
	);
	await falla(
		"media referencia de origen se rechaza",
		() =>
			plantillas.crear(quien, {
				nombre: "X",
				items: [item({ origen: { pedidoId: "abc" } })],
			}),
		"origen del producto 1 no es válido",
	);
	await falla(
		"más de 20 productos se rechaza",
		() =>
			plantillas.crear(quien, {
				nombre: "X",
				items: Array.from({ length: 21 }, () => item()),
			}),
		"no admite más de 20",
	);

	/* ─── 2. Alta, edición y aislamiento ──────────────────────────────── */
	console.log("\n2. Alta, edición y aislamiento");

	const creada = await plantillas.crear(quien, {
		nombre: "Kit de bienvenida",
		items: [item()],
	});
	comprobar("se crea con su receta", creada.items.length === 1);
	comprobar(
		"y guarda las tallas, que es lo que la distingue de repetir",
		creada.items[0].tallas.length === 2 &&
			creada.items[0].tallas.reduce((n, t) => n + t.piezas, 0) === 5,
		JSON.stringify(creada.items[0].tallas),
	);
	comprobar(
		"sin arte, el ítem no apunta a nada",
		creada.items[0].itemId === null && creada.items[0].origen === null,
	);

	const editada = await plantillas.actualizar(quien, creada.id, {
		nombre: "Kit v2",
		items: [item({ tallas: [{ size: "L", piezas: 7 }] })],
	});
	comprobar(
		"guardar reemplaza la receta entera",
		editada.nombre === "Kit v2" &&
			editada.items[0].tallas.length === 1 &&
			editada.items[0].tallas[0].piezas === 7,
	);

	const otro = { ...quien, sub: `otro-${Date.now()}` };
	await falla(
		"la plantilla de otra persona no se abre",
		() => plantillas.actualizar(otro, creada.id, { nombre: "mía", items: [item()] }),
		"No encontramos esa plantilla",
	);
	await falla(
		"ni se borra",
		() => plantillas.borrar(otro, creada.id),
		"No encontramos esa plantilla",
	);

	/* ─── 3. Firmar el arte propio ────────────────────────────────────── */
	console.log("\n3. El arte propio");

	await falla(
		"un tipo desconocido se rechaza",
		() =>
			plantillas.firmarSubidas(quien, {
				archivos: [{ tipo: "video", lado: "front", bytes: 10 }],
			}),
		"Tipo de archivo desconocido",
	);
	await falla(
		"un arte de 30 MB se rechaza",
		() =>
			plantillas.firmarSubidas(quien, {
				archivos: [{ tipo: "arte", lado: "front", bytes: 30 * 1024 * 1024 }],
			}),
		"que es el máximo",
	);
	await falla(
		"demasiados archivos de una vez se rechaza",
		() =>
			plantillas.firmarSubidas(quien, {
				archivos: Array.from({ length: 17 }, () => ({
					tipo: "arte",
					lado: "front",
					bytes: 10,
				})),
			}),
		"Demasiados archivos",
	);

	const firmadas = await plantillas.firmarSubidas(quien, {
		archivos: [
			{ tipo: "arte", lado: "front", bytes: PNG.length },
			{ tipo: "colocacion", lado: "front", bytes: PNG.length },
		],
	});

	comprobar(
		"la carpeta sale del token, no del cuerpo",
		firmadas.subidas.every((s) =>
			s.url.startsWith(`/medios/plantillas/${quien.sub}/${firmadas.itemId}/`),
		),
		firmadas.subidas[0].url,
	);
	comprobar(
		"y no caduca como `carritos/`",
		!firmadas.subidas[0].url.startsWith("/carritos/"),
	);

	/* Se sube de verdad: es la única forma de probar la copia de después. */
	for (const s of firmadas.subidas) {
		const res = await fetch(s.uploadUrl, {
			method: "PUT",
			headers: { "content-type": "image/png", "content-length": String(PNG.length) },
			body: PNG,
		});
		if (!res.ok) throw new Error(`No se pudo subir a S3: ${res.status}`);
	}
	comprobar("el PNG se sube a S3 con la URL firmada", true);

	/* ─── 4. De la plantilla al carrito ───────────────────────────────── */
	console.log("\n4. De la plantilla al carrito");

	const conArte = await plantillas.crear(quien, {
		nombre: "Con arte",
		items: [
			item({
				itemId: firmadas.itemId,
				lados: [{ lado: "front", anchoPx: 3307, altoPx: 4134, dpi: 300 }],
			}),
		],
	});

	const cargada = await plantillas.alCarrito(quien, conArte.id);
	comprobar(
		"el ítem con arte llega al carrito",
		cargada.articulos.length === 1 && cargada.porDisenar.length === 0,
		`${cargada.articulos.length} artículos, ${cargada.porDisenar.length} por diseñar`,
	);
	comprobar(
		"con su carpeta nueva de carrito (no la de la plantilla)",
		Boolean(cargada.articulos[0].carritoId) &&
			cargada.articulos[0].carritoId !== firmadas.itemId,
	);
	comprobar(
		"y con los píxeles del archivo, no los cm del área",
		cargada.articulos[0].lados[0].anchoPx === 3307,
		JSON.stringify(cargada.articulos[0].lados[0]),
	);
	comprobar(
		"el taller sale del producto, no de la plantilla",
		cargada.articulos[0].proveedorId === producto.tallerId,
	);
	comprobar(
		"y el precio NO viaja en el artículo (lo pone el checkout)",
		!("precioUnitario" in cargada.articulos[0]),
	);

	/* El arte llegó de verdad al prefijo del carrito. */
	const copiado = await almacen
		.leer("publico", `carritos/${cargada.articulos[0].carritoId}/front-arte.png`)
		.then(() => true, () => false);
	comprobar("el arte está copiado en S3, no sólo apuntado", copiado);

	const sinArte = await plantillas.alCarrito(quien, creada.id);
	comprobar(
		"un ítem sin arte va a `porDisenar`",
		sinArte.porDisenar.length === 1 && sinArte.articulos.length === 0,
		sinArte.porDisenar[0]?.porque,
	);

	/* Un producto que ya no se publica: es el único que obliga a decidir. */
	await db
		.update(e.productos)
		.set({ estado: "archivado" })
		.where(eq(e.productos.id, producto.id));

	const conPerdido = await plantillas.alCarrito(quien, creada.id);
	comprobar(
		"un producto despublicado va a `perdidos`",
		conPerdido.perdidos.length === 1,
		JSON.stringify(conPerdido.perdidos[0]),
	);

	await db
		.update(e.productos)
		.set({ estado: "activo" })
		.where(eq(e.productos.id, producto.id));

	/* ─── 5. El contador de uso ───────────────────────────────────────── */
	console.log("\n5. El contador de uso");

	const [tras] = await db
		.select()
		.from(e.plantillasDeCompra)
		.where(eq(e.plantillasDeCompra.id, creada.id));

	comprobar(
		"cargarla cuenta, aunque no se llegue a pedir",
		tras.vecesPedida === 2,
		`${tras.vecesPedida} veces`,
	);
	comprobar("y anota cuándo fue la última", tras.ultimaVez !== null);

	/* ─── Limpieza ────────────────────────────────────────────────────── */
	for (const s of firmadas.subidas) {
		await almacen.borrar(s.url.replace(/^\//, ""));
	}
	await almacen.borrar(`carritos/${cargada.articulos[0].carritoId}/front-arte.png`);
	await almacen.borrar(`carritos/${cargada.articulos[0].carritoId}/front-colocacion.png`);

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
