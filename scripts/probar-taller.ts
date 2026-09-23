/**
 * Prueba el panel del taller y el canal en vivo por el CÓDIGO REAL.
 *
 * Del canal se prueba el reparto —Redis publica, la instancia que tiene la
 * conexión la escribe— metiendo una conexión falsa en el mapa. Lo que NO se
 * prueba aquí es la autenticación del socket, porque haría falta un token de
 * verdad del pool de talleres; eso se comprueba por HTTP (`/eventos` sin token
 * y con token falso devuelven 401).
 */
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { AvisosService } from "../src/avisos/avisos.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";
import { TallerService } from "../src/taller/perfil.service";
import { ProductosTallerService } from "../src/taller/productos.service";
import { VivoGateway } from "../src/vivo/vivo.gateway";

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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});
	/* El gateway se suscribe a Redis en `onModuleInit`, que un contexto sin
	   `init()` no dispara. */
	await app.init();

	const db = app.get<Db>(DB);
	const productos = app.get(ProductosTallerService);
	const taller = app.get(TallerService);
	const avisos = app.get(AvisosService);
	const vivo = app.get(VivoGateway);

	const [fila] = await db.select().from(e.talleres).limit(1);
	const tallerId = fila.id;
	const quien = {
		sub: tallerId,
		correo: fila.correo,
		correoVerificado: true,
		grupos: [] as string[],
	};
	const [plantilla] = await db.select().from(e.plantillasDePrenda).limit(1);
	const [categoria] = await db.select().from(e.categorias).limit(1);
	const sufijo = Date.now().toString(36);

	const base = (nombre: string) => ({
		name: nombre,
		description: "Prueba",
		templateId: plantilla.id,
		categoryIds: [categoria.id],
		images: [{ url: "/medios/productos/x.png", order: 0 }],
		colors: [{ name: "Negro", hex: "#000" }],
		sizes: [
			{ size: "S", widthIn: 18, lengthIn: 27 },
			{ size: "M", widthIn: 20, lengthIn: 28 },
		],
		pesoPorTalla: { S: 180, M: 200 },
		printSides: [
			{
				sideKey: "front",
				widthCm: 28,
				heightCm: 35,
				dpi: 300,
				tecnica: "dtf",
				recargo: 25,
			},
		],
		pricing: { basePrice: 199.9, perSidePrice: 30 },
		production: { meta: { diasProduccion: 7 } },
		existencias: { "Negro|S": 10, "Negro|M": 4 },
		caja: { largo: 30, ancho: 25, alto: 3 },
	});

	/* ─── 1. Alta ─────────────────────────────────────────────────────── */
	console.log("\n1. Alta de producto");

	const borrador = await productos.crear(tallerId, base(`Playera ${sufijo}`));
	comprobar(
		"sin `enviar`, nace en borrador",
		borrador.estado === "borrador",
		borrador.estado,
	);
	comprobar(
		"guarda sus piezas",
		borrador.colors.length === 1 &&
			borrador.sizes.length === 2 &&
			borrador.printSides.length === 1,
	);
	comprobar(
		"el precio conserva los centavos",
		borrador.pricing?.basePrice === 199.9,
		`$${borrador.pricing?.basePrice}`,
	);
	comprobar(
		"el recargo del lado y el general conviven",
		borrador.printSides[0].recargo === 25 &&
			borrador.pricing?.perSidePrice === 30,
	);
	comprobar(
		"el peso va por talla, no por variante",
		borrador.pesoPorTalla.S === 180 && borrador.pesoPorTalla.M === 200,
		JSON.stringify(borrador.pesoPorTalla),
	);
	comprobar(
		"las existencias quedan por variante",
		borrador.existencias["Negro|S"] === 10 &&
			borrador.existencias["Negro|M"] === 4,
		JSON.stringify(borrador.existencias),
	);

	const enviado = await productos.crear(tallerId, {
		...base(`Playera ${sufijo}`),
		enviar: true,
	});
	comprobar(
		"con `enviar`, va a revisión",
		enviado.estado === "en_revision",
		enviado.estado,
	);
	comprobar(
		"dos productos con el mismo nombre conviven con slugs distintos",
		borrador.slug !== enviado.slug,
		`${borrador.slug} / ${enviado.slug}`,
	);

	await falla(
		"el taller NO puede publicarse a sí mismo",
		async () => {
			const p = await productos.crear(tallerId, base(`X ${sufijo}`));
			if (p.estado === "activo") throw new Error("se publicó solo");
			throw new Error("nunca queda activo");
		},
		"nunca queda activo",
	);

	/* ─── 2. Validaciones ─────────────────────────────────────────────── */
	console.log("\n2. Validaciones");

	await falla(
		"una técnica inventada se rechaza",
		() =>
			productos.crear(tallerId, {
				...base(`T ${sufijo}`),
				printSides: [
					{
						sideKey: "front",
						widthCm: 28,
						heightCm: 35,
						tecnica: "laser-magico",
					},
				],
			}),
		"No conocemos la técnica",
	);

	await falla(
		"un recargo negativo se rechaza",
		() =>
			productos.crear(tallerId, {
				...base(`R ${sufijo}`),
				printSides: [
					{ sideKey: "front", widthCm: 28, heightCm: 35, recargo: -10 },
				],
			}),
		"de 0 en adelante",
	);

	await falla(
		"una foto de prenda enlazada de fuera se rechaza",
		() =>
			productos.crear(tallerId, {
				...base(`F ${sufijo}`),
				fotosReales: [
					{
						lado: "front",
						color: "Negro",
						url: "https://otro.com/x.png",
						esquinas: [
							{ x: 0, y: 0 },
							{ x: 1, y: 0 },
							{ x: 1, y: 1 },
							{ x: 0, y: 1 },
						],
					},
				],
			}),
		"no enlazada de fuera",
	);

	await falla(
		"unas esquinas en píxeles se rechazan",
		() =>
			productos.crear(tallerId, {
				...base(`E ${sufijo}`),
				fotosReales: [
					{
						lado: "front",
						color: "Negro",
						url: "/medios/x.png",
						esquinas: [
							{ x: 120, y: 80 },
							{ x: 1, y: 0 },
							{ x: 1, y: 1 },
							{ x: 0, y: 1 },
						],
					},
				],
			}),
		"fracciones de 0 a 1",
	);

	await falla(
		"una foto sin dónde cae lo impreso se rechaza",
		() =>
			productos.crear(tallerId, {
				...base(`G ${sufijo}`),
				fotosReales: [{ lado: "front", color: "Negro", url: "/medios/x.png" }],
			}),
		"no dice dónde cae",
	);

	const conBanda = await productos.crear(tallerId, {
		...base(`Termo ${sufijo}`),
		fotosReales: [
			{
				lado: "wrap",
				color: "Negro",
				url: "/medios/x.png",
				banda: { arriba: 0.2, abajo: 0.5, bombeo: -0.08 },
			},
		],
	});
	comprobar(
		"una foto cilíndrica con `banda` sí pasa",
		(conBanda.fotosReales[0] as any).banda?.bombeo === -0.08,
	);

	/* ─── 3. Edición ──────────────────────────────────────────────────── */
	console.log("\n3. Edición");

	await db
		.update(e.productos)
		.set({ estado: "activo" })
		.where(eq(e.productos.id, borrador.id));

	const editado = await productos.actualizar(tallerId, borrador.id, {
		description: "Otra descripción",
	});
	comprobar(
		"tocar un producto ACTIVO lo devuelve a revisión",
		editado.estado === "en_revision",
		editado.estado,
	);
	comprobar("y lo que no se manda se queda", editado.colors.length === 1);

	const reemplazado = await productos.actualizar(tallerId, borrador.id, {
		colors: [
			{ name: "Blanco", hex: "#FFF" },
			{ name: "Azul", hex: "#00F" },
		],
	});
	comprobar(
		"mandar una lista la reemplaza entera",
		reemplazado.colors.length === 2,
		reemplazado.colors.map((c) => c.name).join(", "),
	);

	/* ─── 4. Existencias ──────────────────────────────────────────────── */
	console.log("\n4. Existencias");

	const antes = reemplazado.existencias["Negro|S"];

	/* Se publica a propósito: lo que hay que demostrar es que contar el stock
	   NO lo despublica. Con el producto ya en revisión la comprobación no
	   probaría nada. */
	await db
		.update(e.productos)
		.set({ estado: "activo" })
		.where(eq(e.productos.id, borrador.id));

	const sumado = await productos.moverExistencias(tallerId, borrador.id, {
		clave: "Negro|S",
		operacion: "agregar",
		cantidad: 5,
	});
	comprobar(
		"agregar suma",
		sumado.existencias["Negro|S"] === antes + 5,
		`${antes} -> ${sumado.existencias["Negro|S"]}`,
	);
	comprobar(
		"un producto ACTIVO sigue activo tras contar su stock",
		sumado.estado === "activo",
		sumado.estado,
	);

	const corregido = await productos.moverExistencias(tallerId, borrador.id, {
		clave: "Negro|S",
		operacion: "corregir",
		cantidad: 14,
	});
	comprobar(
		"corregir escribe el absoluto",
		corregido.existencias["Negro|S"] === 14,
	);

	await falla(
		"una variante que no existe se rechaza",
		() =>
			productos.moverExistencias(tallerId, borrador.id, {
				clave: "Rosa|XXL",
				operacion: "agregar",
				cantidad: 1,
			}),
		"no está en este producto",
	);

	await falla(
		"un `agregar -5` disfrazado se rechaza",
		() =>
			productos.moverExistencias(tallerId, borrador.id, {
				clave: "Negro|S",
				operacion: "agregar",
				cantidad: -5,
			}),
		"mayor que cero",
	);

	/* ─── 5. Aislamiento y borrado ────────────────────────────────────── */
	console.log("\n5. Aislamiento y borrado");

	await falla(
		"otro taller no ve el producto",
		() => productos.obtener("otro-taller-inventado", borrador.id),
		"no existe o no es tuyo",
	);
	await falla(
		"ni lo edita",
		() =>
			productos.actualizar("otro-taller-inventado", borrador.id, {
				name: "mío",
			}),
		"no existe o no es tuyo",
	);

	const archivado = await productos.borrar(tallerId, borrador.id);
	comprobar(
		"un producto que estuvo publicado se ARCHIVA, no se borra",
		archivado.estado === "archivado",
		archivado.estado,
	);
	const [sigue] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.id, borrador.id));
	comprobar("y su fila sigue ahí (la lee 'volver a pedir')", Boolean(sigue));

	const borrado = await productos.borrar(tallerId, conBanda.id);
	comprobar("un borrador se borra de verdad", borrado.estado === "borrado");
	const [ya] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.id, conBanda.id));
	comprobar("y su fila desaparece", !ya);

	const lista = await productos.listar(tallerId);
	comprobar(
		"lo archivado no sale en su lista",
		!lista.some((p) => p.id === borrador.id),
		`${lista.length} en lista`,
	);

	/* ─── 6. Perfil ───────────────────────────────────────────────────── */
	console.log("\n6. Perfil del taller");

	await falla(
		"una recolección sin colonia se rechaza (Skydropx la exige)",
		() =>
			taller.actualizar(quien, {
				recoleccion: {
					calle: "x",
					numero: "1",
					ciudad: "GDL",
					estado: "Jalisco",
					cp: "44160",
				},
			}),
		"Falta la colonia",
	);

	await falla(
		"un avatar enlazado de fuera se rechaza",
		() => taller.actualizar(quien, { avatarUrl: "https://otro.com/a.png" }),
		"no enlazado de fuera",
	);

	const perfil = await taller.actualizar(quien, {
		displayName: "Taller Nuevo",
		bio: "Hola",
	});
	comprobar(
		"se puede editar lo que sí está en la lista blanca",
		perfil.displayName === "Taller Nuevo",
	);
	comprobar("y el correo NO se toca desde aquí", perfil.email === fila.correo);

	const foto = await taller.urlParaFoto(quien, { contentType: "image/png" });
	comprobar(
		"la carpeta de la foto sale del token, no del cuerpo",
		foto.path.startsWith(`/medios/productos/${tallerId}/`),
		foto.path,
	);

	const ajeno = await taller.urlParaFoto(
		{ ...quien, sub: "otro-taller" },
		{ contentType: "image/png", carpeta: `medios/productos/${tallerId}` },
	);
	comprobar(
		"aunque el cuerpo pida la carpeta de otro",
		ajeno.path.startsWith("/medios/productos/otro-taller/"),
		ajeno.path,
	);

	/* ─── 7. El canal en vivo ─────────────────────────────────────────── */
	console.log("\n7. El canal en vivo");

	const recibidos: string[] = [];
	const falso = {
		readyState: 1, // OPEN
		send: (m: string) => recibidos.push(m),
		/* El cierre ordenado del gateway la llama; sin esto el proceso muere
		   DESPUÉS de decir que todo fue bien, que es la peor forma de fallar. */
		close: () => {},
	};

	/* Se mete una conexión en el mapa del gateway para probar el REPARTO: lo
	   que va de Redis al socket. La autenticación del socket se comprueba por
	   HTTP, no aquí. */
	(vivo as any).porTaller.set(tallerId, new Set([falso]));

	await avisos.alTaller(tallerId, {
		tipo: "pedido-nuevo",
		pedidoId: "abc",
		folio: "481902-1",
	});
	await esperar(300);

	comprobar(
		"el aviso llega a la conexión del taller",
		recibidos.length === 1,
		recibidos[0],
	);
	const aviso = JSON.parse(recibidos[0] ?? "{}");
	comprobar(
		"y es un aviso corto, no el pedido entero",
		aviso.tipo === "pedido-nuevo" &&
			aviso.folio === "481902-1" &&
			!("lineas" in aviso),
		Object.keys(aviso).join(", "),
	);

	await avisos.alTaller("otro-taller-cualquiera", {
		tipo: "pedido-movido",
		pedidoId: "x",
		estado: "listo",
	});
	await esperar(300);
	comprobar("el aviso de OTRO taller no le llega", recibidos.length === 1);

	/* Y que el canal es el que se espera, mirándolo desde fuera. */
	const espia = new IORedis(process.env.REDIS_URL!);
	const visto: string[] = [];
	await espia.psubscribe("taller:*");
	espia.on("pmessage", (_p, canal) => visto.push(canal));
	await avisos.alTaller(tallerId, {
		tipo: "pedido-movido",
		pedidoId: "y",
		estado: "listo",
	});
	await esperar(300);
	comprobar(
		"se publica en `taller:<id>`",
		visto[0] === `taller:${tallerId}`,
		visto[0],
	);
	await espia.quit();

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
