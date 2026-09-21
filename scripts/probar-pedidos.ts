/**
 * Prueba el ciclo de un pedido por el CÓDIGO REAL, no por HTTP.
 *
 * Arranca un contexto de Nest —igual que hacen los workers— y llama a los
 * servicios ya inyectados. Así se prueba la máquina de estados, el descuento
 * de existencias y la carrera entre dos personas del taller sin tener que
 * conseguir un token de Cognito, que es lo único que separa esto de la ruta.
 *
 *   DATABASE_URL=... pnpm exec tsx scripts/probar-pedidos.ts
 */
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";
import { PedidosCompradorService } from "../src/pedidos/pedidos-comprador.service";
import { PedidosTallerService } from "../src/pedidos/pedidos-taller.service";
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
		const mensaje = (error as Error).message ?? "";
		comprobar(que, mensaje.includes(esperado), mensaje.slice(0, 80));
	}
}

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});

	const db = app.get<Db>(DB);
	const pedidos = app.get(PedidosService);
	const taller = app.get(PedidosTallerService);
	const comprador = app.get(PedidosCompradorService);

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

	const correo = `prueba.${Date.now()}@kustto.mx`;

	const pedir = (metodo: "recoger" | "envio" = "recoger", piezas = 2) =>
		pedidos.crear({
			comprador: { nombre: "Prueba", email: correo, whatsapp: "3312345678" },
			entrega: { metodo },
			lineas: [
				{
					productoId: producto.id,
					colorPrenda: existencia.color,
					lados: [],
					tallas: [{ size: existencia.talla, piezas }],
				},
			],
		});

	const antes = existencia.cantidad;
	console.log(`\nProducto: ${producto.nombre} — existencias ${antes}\n`);

	/* ─── 1. El descuento de existencias ──────────────────────────────── */
	console.log("1. Existencias");
	const a = await pedir("recoger", 2);
	const tras = await cantidad(db, existencia.id);
	comprobar("pedir 2 descuenta 2", tras === antes - 2, `${antes} -> ${tras}`);

	/* ─── 2. La máquina de estados ────────────────────────────────────── */
	console.log("\n2. Transiciones");
	const pedidoId = a.pedidos[0].id;
	const tallerId = a.pedidos[0].proveedorId;

	await falla(
		"nuevo -> entregado se rechaza",
		() => taller.cambiarEstado(tallerId, pedidoId, { estado: "entregado" }),
		"sólo puede pasar a",
	);

	const enProduccion = await taller.cambiarEstado(tallerId, pedidoId, {
		estado: "produccion",
	});
	comprobar("nuevo -> produccion", enProduccion.estado === "produccion");
	comprobar(
		"la bitácora lo anota",
		enProduccion.bitacora.length === 2 &&
			enProduccion.bitacora[1].por === "taller",
		enProduccion.bitacora.map((b) => b.estado).join(" -> "),
	);

	await falla(
		"produccion -> cancelado se rechaza (ya se está fabricando)",
		() => taller.cambiarEstado(tallerId, pedidoId, { estado: "cancelado" }),
		"sólo puede pasar a",
	);

	await taller.cambiarEstado(tallerId, pedidoId, { estado: "listo" });

	await falla(
		"con `recoger`, listo -> enviado se rechaza",
		() => taller.cambiarEstado(tallerId, pedidoId, { estado: "enviado" }),
		"sólo puede pasar a entregado",
	);

	const entregado = await taller.cambiarEstado(tallerId, pedidoId, {
		estado: "entregado",
	});
	comprobar("con `recoger`, listo -> entregado", entregado.estado === "entregado");

	await falla(
		"un pedido entregado ya no se mueve",
		() => taller.cambiarEstado(tallerId, pedidoId, { estado: "cancelado" }),
		"ya no se mueve",
	);

	/* ─── 3. Cancelar devuelve las existencias ────────────────────────── */
	console.log("\n3. Cancelar");
	const b = await pedir("recoger", 3);
	const trasPedir = await cantidad(db, existencia.id);
	await taller.cambiarEstado(b.pedidos[0].proveedorId, b.pedidos[0].id, {
		estado: "cancelado",
	});
	const trasCancelar = await cantidad(db, existencia.id);
	comprobar(
		"cancelar devuelve las 3 piezas",
		trasCancelar === trasPedir + 3,
		`${trasPedir} -> ${trasCancelar}`,
	);

	/* ─── 4. La carrera entre dos personas del taller ─────────────────── */
	console.log("\n4. Dos personas a la vez");
	const c = await pedir("recoger", 1);
	const resultados = await Promise.allSettled([
		taller.cambiarEstado(c.pedidos[0].proveedorId, c.pedidos[0].id, {
			estado: "produccion",
		}),
		taller.cambiarEstado(c.pedidos[0].proveedorId, c.pedidos[0].id, {
			estado: "produccion",
		}),
	]);
	const ok = resultados.filter((r) => r.status === "fulfilled").length;
	comprobar("sólo una de las dos pasa", ok === 1, `${ok} de 2`);
	const perdedora = resultados.find((r) => r.status === "rejected") as
		| PromiseRejectedResult
		| undefined;
	comprobar(
		"a la otra se le dice que recargue",
		(perdedora?.reason?.message ?? "").includes("mientras lo mirabas"),
	);
	const bitacora = await db
		.select()
		.from(e.pedidoBitacora)
		.where(eq(e.pedidoBitacora.pedidoId, c.pedidos[0].id));
	comprobar(
		"la bitácora no cuenta el intento perdido",
		bitacora.length === 2,
		`${bitacora.length} entradas`,
	);

	/* ─── 5. El pedido de otro taller no se ve ni se mueve ────────────── */
	console.log("\n5. Aislamiento entre talleres");
	await falla(
		"otro taller no lo encuentra",
		() => taller.obtener("otro-taller-inventado", pedidoId),
		"No encontramos ese pedido",
	);
	await falla(
		"otro taller no lo mueve",
		() =>
			taller.cambiarEstado("otro-taller-inventado", pedidoId, {
				estado: "produccion",
			}),
		"No encontramos ese pedido",
	);

	/* ─── 6. El comprador ─────────────────────────────────────────────── */
	console.log("\n6. El comprador");
	const quien = {
		sub: "comprador-de-prueba",
		correo,
		correoVerificado: true,
		grupos: [],
	};

	const suyos = await comprador.listar(quien);
	comprobar("ve sus tres pedidos", suyos.length === 3, `${suyos.length}`);
	comprobar(
		"no se le devuelve la huella del token",
		suyos.every((p) => !("huellaDeToken" in p)),
	);

	await falla(
		"sin el correo verificado no ve nada",
		() => comprador.listar({ ...quien, correoVerificado: false }),
		"Verifica tu correo",
	);

	const ajeno = { ...quien, correo: "otra.persona@kustto.mx" };
	await falla(
		"el pedido de otra persona no se abre",
		() => comprador.obtener(ajeno, pedidoId),
		"No encontramos ese pedido",
	);

	const repetir = await comprador.repetir(quien, pedidoId);
	comprobar(
		"repetir compara contra el catálogo de hoy",
		repetir.lineas.length === 1 && repetir.totalAhora === repetir.totalAntes,
		`antes ${repetir.totalAntes} / ahora ${repetir.totalAhora} — estado ${repetir.lineas[0].estado}`,
	);

	console.log(`\n${fallos === 0 ? "TODO BIEN" : `${fallos} FALLOS`}\n`);
	await app.close();
	process.exit(fallos === 0 ? 0 : 1);
}

async function cantidad(db: Db, id: string) {
	const [fila] = await db
		.select()
		.from(e.productoExistencias)
		.where(eq(e.productoExistencias.id, id));
	return fila.cantidad;
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
