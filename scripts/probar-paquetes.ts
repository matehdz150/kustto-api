/** Prueba funcional local. Nunca se ejecuta contra una base remota. */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as e from "../src/db/esquema";
import { PaquetesService } from "../src/paquetes/paquetes.service";
import { centavosDelPaquete } from "../src/paquetes/precio";
import type { ProductoParaPedir } from "../src/pedidos/lineas";
import { PedidosService } from "../src/pedidos/pedidos.service";

async function principal() {
	const url = process.env.DATABASE_URL;
	if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
		throw new Error("Sólo se prueba contra la base local");
	const pool = new Pool({ connectionString: url });
	const db = drizzle(pool, { schema: e, casing: "snake_case" });
	let id: string | undefined;
	try {
		const [primero] = await db
			.select({ id: e.productos.id, tallerId: e.productos.tallerId })
			.from(e.productos)
			.where(eq(e.productos.estado, "activo"))
			.limit(1);
		if (!primero)
			throw new Error(
				"Falta un taller con productos publicados para la prueba",
			);
		const taller = { id: primero.tallerId };
		const productos = await db
			.select({ id: e.productos.id })
			.from(e.productos)
			.where(
				and(
					eq(e.productos.tallerId, taller.id),
					eq(e.productos.estado, "activo"),
				),
			)
			.limit(2);
		const [categoria] = await db
			.select({ id: e.categoriasPaquete.id })
			.from(e.categoriasPaquete)
			.where(eq(e.categoriasPaquete.activa, true))
			.limit(1);
		if (productos.length < 2 || !categoria)
			throw new Error("Faltan dos productos publicados y una categoría local");
		const servicio = new PaquetesService(db);
		const creado = await servicio.crear(taller.id, {
			nombre: "Prueba temporal de paquetes",
			descripcion: "Se elimina al terminar",
			precioBase: 100.01,
			descuentoPorcentaje: 10,
			categorias: [categoria.id],
			productos: productos.map((p) => ({ productoId: p.id, cantidad: 2 })),
			enviar: true,
		});
		id = creado.id;
		if (creado.estado !== "en_revision" || creado.precioFinal !== 90.01)
			throw new Error("La propuesta o el descuento son incorrectos");
		const aprobado = await servicio.revisar(id, { decision: "aprobar" });
		if (
			aprobado.estado !== "activo" ||
			!(await servicio.listarPublico()).some((p) => p.id === id)
		)
			throw new Error("El paquete no se publicó");
		const pedidos = new PedidosService(
			db,
			undefined as never,
			undefined as never,
			undefined as never,
		);
		const internos = pedidos as unknown as {
			leerProductosPublicados(ids: string[]): Promise<ProductoParaPedir[]>;
			validarPaquetes(
				lineas: Record<string, unknown>[],
				productos: ProductoParaPedir[],
			): Promise<Map<string, { centavos: number }>>;
		};
		const productosParaPedir = await internos.leerProductosPublicados(
			productos.map((p) => p.id),
		);
		const grupo = randomUUID();
		const lineas = productos.map((p) => ({
			productoId: p.id,
			paqueteId: id,
			paqueteGrupo: grupo,
			paquetePrecioVisto: creado.precioFinal,
			tallas: [{ size: "M", piezas: 2 }],
		}));
		const validado = await internos.validarPaquetes(lineas, productosParaPedir);
		if (validado.get(grupo)?.centavos !== centavosDelPaquete(100.01, 10))
			throw new Error("El checkout no respetó el precio del paquete");
		let incompletoRechazado = false;
		try {
			await internos.validarPaquetes(
				lineas.slice(0, 1),
				productosParaPedir.slice(0, 1),
			);
		} catch {
			incompletoRechazado = true;
		}
		if (!incompletoRechazado)
			throw new Error("El checkout aceptó un paquete incompleto");
		let precioViejoRechazado = false;
		try {
			await internos.validarPaquetes(
				lineas.map((l) => ({ ...l, paquetePrecioVisto: 90.02 })),
				productosParaPedir,
			);
		} catch {
			precioViejoRechazado = true;
		}
		if (!precioViejoRechazado)
			throw new Error("El checkout aceptó un precio de carrito desactualizado");

		/* Un producto del paquete partido en dos líneas —una por diseño— es un
		   paquete completo si la suma cuadra, y cobra lo mismo. */
		const partidos = [productos[0].id, productos[0].id, productos[1].id];
		const productosPartidos = await internos.leerProductosPublicados(partidos);
		const lineasPartidas = [
			{ ...lineas[0], tallas: [{ size: "M", piezas: 1 }] },
			{ ...lineas[0], tallas: [{ size: "L", piezas: 1 }] },
			lineas[1],
		];
		const partido = await internos.validarPaquetes(
			lineasPartidas,
			productosPartidos,
		);
		if (partido.get(grupo)?.centavos !== centavosDelPaquete(100.01, 10))
			throw new Error("Partir un producto en dos diseños cambió el precio");

		let sumaMalRechazada = false;
		try {
			await internos.validarPaquetes(
				[
					...lineasPartidas.slice(0, 2),
					{ ...lineas[0], tallas: [{ size: "S", piezas: 1 }] },
					lineas[1],
				],
				await internos.leerProductosPublicados([
					productos[0].id,
					productos[0].id,
					productos[0].id,
					productos[1].id,
				]),
			);
		} catch {
			sumaMalRechazada = true;
		}
		if (!sumaMalRechazada)
			throw new Error("El checkout aceptó más piezas de las del paquete");
		await servicio.archivar(taller.id, id);
		if ((await servicio.listarPublico()).some((p) => p.id === id))
			throw new Error("El paquete archivado sigue publicado");
		console.log(
			"Paquetes: propuesta, revisión, publicación, precio, conjunto completo, productos partidos por diseño y archivo correctos",
		);
		await probarBanner(servicio, db);
	} finally {
		if (id) await db.delete(e.paquetes).where(eq(e.paquetes.id, id));
		await pool.end();
	}
}

/**
 * El banner publicitario de una categoría: que guarde lo que el admin escribe
 * y que rechace lo que no puede aceptar.
 *
 * LAS DOS COSAS QUE SE PRUEBAN DE VERDAD son la imagen de fuera y el enlace
 * absoluto: son las que convierten el banner en un redirector con la cara de
 * Kustto o en una foto que alguien más puede cambiar después.
 */
async function probarBanner(
	servicio: PaquetesService,
	db: ReturnType<typeof drizzle>,
) {
	const creada = await servicio.crearCategoria({
		nombre: `Prueba de banner ${randomUUID().slice(0, 8)}`,
	});
	try {
		await servicio.actualizarCategoria(creada.id, {
			banner: {
				titulo: "Que se lleven algo más que la foto",
				texto: "Totes para los invitados y detalles para los padrinos.",
				etiqueta: "Temporada",
				imagen: "/medios/banners/abc123.jpg",
				alt: "Novios con playeras conmemorativas",
				lado: "izquierda",
				colorFondo: "#233328",
				colorTexto: "#FFFFFF",
				colorAcento: "#aeff6e",
				boton: { texto: "Ver paquetes", enlace: "/paquetes?categoria=bodas" },
			},
		});
		const guardada = (await servicio.categorias()).find(
			(c) => c.id === creada.id,
		);
		if (
			guardada?.banner?.titulo !== "Que se lleven algo más que la foto" ||
			guardada.banner.lado !== "izquierda" ||
			/* Se normaliza a minúsculas para que el color se pueda comparar. */
			guardada.banner.colorTexto !== "#ffffff" ||
			guardada.banner.boton?.enlace !== "/paquetes?categoria=bodas"
		)
			throw new Error("El banner no se guardó como se mandó");

		const invalidos: [string, Record<string, unknown>][] = [
			["imagen de otro sitio", { imagen: "https://ejemplo.com/foto.jpg" }],
			["enlace absoluto", { boton: { texto: "Ir", enlace: "https://x.com" } }],
			[
				"enlace protocolo relativo",
				{ boton: { texto: "Ir", enlace: "//x.com" } },
			],
			["color inventado", { colorFondo: "verde" }],
			["lado inventado", { lado: "arriba" }],
			["sin título", { titulo: "" }],
		];
		for (const [caso, cambio] of invalidos) {
			let rechazado = false;
			try {
				await servicio.actualizarCategoria(creada.id, {
					banner: { titulo: "Título", lado: "derecha", ...cambio },
				});
			} catch {
				rechazado = true;
			}
			if (!rechazado) throw new Error(`El banner aceptó ${caso}`);
		}

		await servicio.actualizarCategoria(creada.id, { banner: null });
		const vacia = (await servicio.categorias()).find((c) => c.id === creada.id);
		if (vacia?.banner !== null) throw new Error("El banner no se pudo borrar");
		console.log(
			"Banner de categoría: guardado, normalizado, borrado y rechazos correctos",
		);
	} finally {
		await db
			.delete(e.categoriasPaquete)
			.where(eq(e.categoriasPaquete.id, creada.id));
	}
}

principal().catch((e) => {
	console.error(e);
	process.exitCode = 1;
});
