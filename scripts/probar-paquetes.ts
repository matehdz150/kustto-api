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
		await servicio.archivar(taller.id, id);
		if ((await servicio.listarPublico()).some((p) => p.id === id))
			throw new Error("El paquete archivado sigue publicado");
		console.log(
			"Paquetes: propuesta, revisión, publicación, precio, conjunto completo y archivo correctos",
		);
	} finally {
		if (id) await db.delete(e.paquetes).where(eq(e.paquetes.id, id));
		await pool.end();
	}
}

principal().catch((e) => {
	console.error(e);
	process.exitCode = 1;
});
