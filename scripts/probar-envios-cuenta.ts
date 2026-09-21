/**
 * Prueba envíos, correos, carrito y cuenta por el CÓDIGO REAL.
 *
 * Igual que `probar-pedidos.ts`: arranca un contexto de Nest y llama a los
 * servicios inyectados. Skydropx no está configurado en local, así que lo que
 * se prueba de envíos es lo NUESTRO —el limitador, la cotización guardada, el
 * webhook firmado— y no que su API conteste.
 */
import { createHmac } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import type IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { COLAS } from "../src/colas/colas";
import { COLA, REDIS } from "../src/colas/colas.module";
import type { Queue } from "bullmq";
import { CarritoService } from "../src/cuenta/carrito.service";
import { FavoritosService } from "../src/cuenta/favoritos.service";
import { PerfilService } from "../src/cuenta/perfil.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";
import { EnviosService } from "../src/envios/envios.service";
import { RastreoService } from "../src/envios/rastreo.service";
import { SkydropxClient } from "../src/envios/skydropx";
import { PedidosService } from "../src/pedidos/pedidos.service";

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
		comprobar(que, m.includes(esperado), m.slice(0, 90));
	}
}

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});

	const db = app.get<Db>(DB);
	const redis = app.get<IORedis>(REDIS);
	const envios = app.get(EnviosService);
	const skydropx = app.get(SkydropxClient);
	const rastreo = app.get(RastreoService);
	const pedidos = app.get(PedidosService);
	const carrito = app.get(CarritoService);
	const favoritos = app.get(FavoritosService);
	const perfil = app.get(PerfilService);
	const colaCorreo = app.get<Queue>(COLA(COLAS.correo));

	const quien = {
		sub: `prueba-${Date.now()}`,
		correo: `prueba.${Date.now()}@kustto.mx`,
		correoVerificado: true,
		grupos: [] as string[],
	};

	const [producto] = await db
		.select()
		.from(e.productos)
		.where(eq(e.productos.estado, "activo"))
		.limit(1);
	const [existencia] = await db
		.select()
		.from(e.productoExistencias)
		.where(eq(e.productoExistencias.productoId, producto.id))
		.limit(1);

	/* ─── 1. El limitador de Skydropx ─────────────────────────────────── */
	console.log("\n1. El limitador de Skydropx (2 por segundo)");
	{
		/* `turno()` es privado: se llama por su nombre a propósito, porque lo que
		   se está probando es justo esa mecánica y no la API de Skydropx. */
		const turno = () => (skydropx as any).turno();
		await redis.del(`skydropx:rps:${Math.floor(Date.now() / 1000)}`);

		/* SE CUENTA POR VENTANA, no se mide el tiempo que tardó.
		
		   Medir el tiempo era una prueba floja y fallaba sola: la espera va hasta
		   el borde del segundo siguiente, así que si las llamadas arrancan a 775
		   ms de la ventana sólo esperan 225 y el limitador es igual de correcto.
		   La propiedad de verdad es cuántas pasan en el mismo segundo. */
		const ventanas: number[] = [];
		await Promise.all(
			Array.from({ length: 6 }, () =>
				turno().then(() => ventanas.push(Math.floor(Date.now() / 1000))),
			),
		);

		const porVentana = new Map<number, number>();
		for (const v of ventanas) porVentana.set(v, (porVentana.get(v) ?? 0) + 1);
		const masLlena = Math.max(...porVentana.values());

		comprobar(
			"nunca pasan más de dos por segundo",
			masLlena <= 2,
			`${[...porVentana.values()].join("+")} en ${porVentana.size} ventanas`,
		);
		comprobar(
			"y las seis acaban pasando",
			ventanas.length === 6,
			`${ventanas.length}`,
		);
	}

	/* ─── 2. La cotización guardada ───────────────────────────────────── */
	console.log("\n2. La cotización guardada manda sobre el cuerpo");
	const [cotizacion] = await db
		.insert(e.cotizacionesDeEnvio)
		.values({
			estado: "lista",
			peticion: { skydropxId: "falsa" },
			respuesta: {
				tarifas: [
					{ id: "tarifa-1", paqueteria: "Paquetexpress", servicio: "Express", precio: 149.5, dias: 3 },
				],
			},
			expiraEn: new Date(Date.now() + 3_600_000),
		})
		.returning();

	const elegido = await envios.envioDelPedido({
		cotizacionId: cotizacion.id,
		tarifaId: "tarifa-1",
	});
	comprobar(
		"el precio sale de la cotización, no del cuerpo",
		elegido.precio === 149.5,
		`$${elegido.precio}`,
	);

	await falla(
		"una tarifa inventada se rechaza",
		() => envios.envioDelPedido({ cotizacionId: cotizacion.id, tarifaId: "no-existe" }),
		"ya no está disponible",
	);

	const [caducada] = await db
		.insert(e.cotizacionesDeEnvio)
		.values({
			estado: "lista",
			peticion: {},
			respuesta: { tarifas: [{ id: "t", paqueteria: "x", servicio: "y", precio: 1, dias: 1 }] },
			expiraEn: new Date(Date.now() - 1000),
		})
		.returning();

	await falla(
		"una cotización caducada es como si no existiera",
		() => envios.envioDelPedido({ cotizacionId: caducada.id, tarifaId: "t" }),
		"ya no está disponible",
	);

	/* ─── 3. Un checkout CON envío, y sus correos ─────────────────────── */
	console.log("\n3. Checkout con envío y sus correos");
	await colaCorreo.drain();

	const compra = await pedidos.crear({
		comprador: { nombre: "Prueba", email: quien.correo, whatsapp: "3312345678" },
		entrega: {
			metodo: "envio",
			direccion: {
				calle: "Av Chapultepec",
				numero: "120",
				colonia: "Americana",
				ciudad: "Guadalajara",
				estado: "Jalisco",
				cp: "44160",
			},
		},
		envio: { cotizacionId: cotizacion.id, tarifaId: "tarifa-1" },
		lineas: [
			{
				productoId: producto.id,
				colorPrenda: existencia.color,
				lados: [],
				tallas: [{ size: existencia.talla, piezas: 1 }],
			},
		],
	});

	const [pedidoCreado] = await db
		.select()
		.from(e.pedidos)
		.where(eq(e.pedidos.id, compra.pedidos[0].id));

	comprobar(
		"el envío se congela en el pedido",
		(pedidoCreado.envio as any)?.precio === 149.5,
		JSON.stringify(pedidoCreado.envio),
	);
	comprobar(
		"el total suma producto + envío",
		Number(pedidoCreado.total) ===
			Number(pedidoCreado.productosTotal) + 149.5,
		`${pedidoCreado.productosTotal} + 149.5 = ${pedidoCreado.total}`,
	);

	const encolados = await colaCorreo.getJobs(["waiting", "delayed", "active", "completed"]);
	const nombres = encolados.map((j) => j.name).sort();
	comprobar(
		"se encolan el correo del comprador y el del taller",
		nombres.includes("pedido-recibido") && nombres.includes("pedido-para-taller"),
		nombres.join(", "),
	);
	const alComprador = encolados.find((j) => j.name === "pedido-recibido");
	comprobar(
		"el del comprador lleva su enlace de seguimiento",
		String(alComprador?.data?.html ?? "").includes(compra.token),
	);
	comprobar(
		"y va a su correo",
		alComprador?.data?.para === quien.correo,
		String(alComprador?.data?.para),
	);

	/* ─── 4. El webhook de rastreo ────────────────────────────────────── */
	console.log("\n4. El webhook de la paquetería");
	const envioId = `envio-${Date.now()}`;
	await db
		.insert(e.enviosDePaqueteria)
		.values({ envioId, pedidoId: pedidoCreado.id });

	const secreto = process.env.SKYDROPX_WEBHOOK_SECRETO ?? "";
	const firmar = (cuerpo: unknown) =>
		`HMAC ${createHmac("sha512", secreto).update(JSON.stringify(cuerpo)).digest("hex")}`;

	const aviso = (estado: string) => ({
		data: {
			attributes: { status: estado, tracking_number: "ABC123" },
			relationships: { shipment: { data: { id: envioId } } },
		},
	});

	await falla(
		"sin firma se rechaza",
		() => rastreo.recibir(aviso("in_transit"), JSON.stringify(aviso("in_transit")), undefined),
		"Unauthorized",
	);
	await falla(
		"con firma equivocada se rechaza",
		() =>
			rastreo.recibir(
				aviso("in_transit"),
				JSON.stringify(aviso("in_transit")),
				"HMAC 00",
			),
		"Unauthorized",
	);

	/* El pedido está en `nuevo`; la paquetería lo lleva a `enviado`. */
	await rastreo.recibir(
		aviso("in_transit"),
		JSON.stringify(aviso("in_transit")),
		firmar(aviso("in_transit")),
	);
	const [trasEnviar] = await db
		.select()
		.from(e.pedidos)
		.where(eq(e.pedidos.id, pedidoCreado.id));
	comprobar("`in_transit` lleva el pedido a enviado", trasEnviar.estado === "enviado");

	/* Y ahora uno VIEJO que llega tarde: no debe retroceder. */
	await rastreo.recibir(
		aviso("picked_up"),
		JSON.stringify(aviso("picked_up")),
		firmar(aviso("picked_up")),
	);
	await rastreo.recibir(
		aviso("delivered"),
		JSON.stringify(aviso("delivered")),
		firmar(aviso("delivered")),
	);
	const [trasEntregar] = await db
		.select()
		.from(e.pedidos)
		.where(eq(e.pedidos.id, pedidoCreado.id));
	comprobar("`delivered` lo lleva a entregado", trasEntregar.estado === "entregado");

	await rastreo.recibir(
		aviso("in_transit"),
		JSON.stringify(aviso("in_transit")),
		firmar(aviso("in_transit")),
	);
	const [trasTardio] = await db
		.select()
		.from(e.pedidos)
		.where(eq(e.pedidos.id, pedidoCreado.id));
	comprobar(
		"un aviso viejo NO hace retroceder el estado",
		trasTardio.estado === "entregado",
		trasTardio.estado,
	);

	const bitacora = await db
		.select()
		.from(e.pedidoBitacora)
		.where(eq(e.pedidoBitacora.pedidoId, pedidoCreado.id));
	comprobar(
		"pero sí queda anotado en la bitácora",
		bitacora.filter((b) => b.autor === "paqueteria").length === 4,
		`${bitacora.filter((b) => b.autor === "paqueteria").length} avisos`,
	);

	/* ─── 5. Carrito ──────────────────────────────────────────────────── */
	console.log("\n5. Carrito");
	await perfil.guardar(quien, { nombre: "Prueba", whatsapp: "3312345678" });

	const guardado = await carrito.guardar(quien, {
		articulos: [
			{ productoId: producto.id, colorPrenda: existencia.color, talla: existencia.talla, piezas: 2 },
			{ productoId: "00000000-0000-4000-8000-000000000000", piezas: 1 },
		],
	});
	comprobar(
		"un producto que ya no existe se cae del carrito",
		guardado.articulos.length === 1,
		`${guardado.articulos.length} artículos`,
	);
	comprobar("y el bueno se queda con sus piezas", guardado.articulos[0].piezas === 2);

	await falla(
		"no admite más de 30 artículos",
		() =>
			carrito.guardar(quien, {
				articulos: Array.from({ length: 31 }, () => ({ productoId: producto.id })),
			}),
		"no admite más de 30",
	);

	const reemplazado = await carrito.guardar(quien, {
		articulos: [{ productoId: producto.id, piezas: 5 }],
	});
	comprobar(
		"guardar reemplaza, no acumula",
		reemplazado.articulos.length === 1 && reemplazado.articulos[0].piezas === 5,
		`${reemplazado.articulos.length} artículos`,
	);

	await carrito.vaciar(quien);
	comprobar("vaciar lo deja vacío", (await carrito.obtener(quien)).articulos.length === 0);

	/* ─── 6. Perfil y favoritos ───────────────────────────────────────── */
	console.log("\n6. Perfil y favoritos");
	const nuevo = { ...quien, sub: `sin-perfil-${Date.now()}` };
	const vacio = await perfil.obtener(nuevo);
	comprobar(
		"sin perfil devuelve el esqueleto, no un 404",
		vacio.nombre === null && vacio.id === nuevo.sub,
	);

	await falla(
		"un CP mal escrito se rechaza aunque sea un borrador",
		() => perfil.guardar(quien, { nombre: "Prueba", direccion: { calle: "x", colonia: "y", ciudad: "z", cp: "441" } }),
		"cinco dígitos",
	);

	const favs = await favoritos.guardar(quien, {
		ids: [producto.id, "no-es-un-id-valido!!", producto.id],
	});
	comprobar(
		"los ids raros se limpian sin tirar la lista",
		favs.ids.length === 1 && favs.ids[0] === producto.id,
		JSON.stringify(favs.ids),
	);

	const sinFavs = await favoritos.guardar(quien, { ids: [] });
	comprobar("y se pueden quitar todos", sinFavs.ids.length === 0);

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
