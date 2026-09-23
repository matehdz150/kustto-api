/**
 * Llena una base local con un Kustto que se puede usar: cuentas con
 * contraseña conocida, catálogo con fotos de S3 y pedidos en todos los estados.
 *
 *   pnpm db:sembrar                 # sobre una base vacía (recién migrada)
 *   pnpm db:sembrar --desde-cero    # VACÍA la base local y siembra
 *
 * La contraseña de todas las cuentas es `SEMILLA_CONTRASENA`, o
 * `kustto-local-2026` si no se define.
 *
 * QUÉ SIEMBRA
 *
 *   - Un admin, tres talleres y un comprador, todos con correo `@kustto.test`
 *     (un dominio reservado: nunca le llega un correo a nadie de verdad).
 *   - El catálogo de `semilla/catalogo.json` (lo escribe `db:exportar-semilla`):
 *     plantillas, categorías y productos con sus imágenes, lados, tallas,
 *     precios y fotos reales. Las rutas apuntan a objetos que EXISTEN en el
 *     bucket; el exportador las comprobó una por una.
 *   - Compras y pedidos en todos los estados, con su bitácora, con
 *     compradores y direcciones inventados pero con ARTE REAL: cada partida
 *     usa los archivos de producción de un pedido que sí se hizo, así que el
 *     panel del taller abre el archivo de verdad y no un 404.
 *
 * LOS PRECIOS NO SE INVENTAN: salen del producto y de `extraPorLados`, la misma
 * regla que usa la API al cobrar. Un pedido de semilla con un total que la API
 * no daría confundiría a quien lo mire.
 *
 * ES DETERMINISTA: los ids salen de un hash y el azar de una semilla fija, así
 * que dos corridas dan los mismos pedidos con los mismos folios, y un folio se
 * puede citar en un issue. Sólo las fechas se mueven: se cuentan hacia atrás
 * desde hoy, para que la bandeja siempre tenga pedidos "de ayer".
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { hashear } from "../src/cuentas/contrasenas";
import * as e from "../src/db/esquema";
import { extraPorLados } from "../src/precios/precios";

const CONTRASENA = process.env.SEMILLA_CONTRASENA ?? "kustto-local-2026";
const DESDE_CERO = process.argv.includes("--desde-cero");

/** Cuántas compras. Unas treinta llenan las bandejas sin hacer scroll eterno. */
const COMPRAS = 30;

/* ─── Utilidades deterministas ──────────────────────────────────────────── */

/** Un uuid estable a partir de un texto: la misma semilla, el mismo id. */
function idDe(texto: string) {
	const h = createHash("sha1").update(`kustto-semilla:${texto}`).digest("hex");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** mulberry32: pequeño, rápido y siempre la misma secuencia para la misma semilla. */
function azar(semilla: number) {
	let a = semilla;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const r = azar(2026);
const entre = (min: number, max: number) =>
	Math.floor(r() * (max - min + 1)) + min;
const uno = <T>(lista: readonly T[]) => lista[Math.floor(r() * lista.length)];
const hace = (dias: number, horas = 0) =>
	new Date(Date.now() - dias * 86_400_000 - horas * 3_600_000);
const dinero = (n: number) => n.toFixed(2);

/* ─── Las cuentas ───────────────────────────────────────────────────────── */

const ADMIN = { correo: "admin@kustto.test" };

const TALLERES = [
	{
		correo: "hilo-norte@kustto.test",
		nombre: "Hilo Norte",
		slug: "hilo-norte",
		bio: "Bordado computarizado y serigrafía en Monterrey desde 2014.",
		whatsapp: "8112345678",
		recoleccion: {
			calle: "Av. Constitución",
			numero: "1450",
			interior: null,
			colonia: "Centro",
			ciudad: "Monterrey",
			estado: "Nuevo León",
			cp: "64000",
			referencias: "Portón negro junto a la papelería",
		},
	},
	{
		correo: "la-prensa@kustto.test",
		nombre: "La Prensa GDL",
		slug: "la-prensa-gdl",
		bio: "Taller de estampado en Guadalajara. Tirajes cortos y pedidos de grupo.",
		whatsapp: "3312345678",
		recoleccion: {
			calle: "Calle Libertad",
			numero: "1820",
			interior: "Local 3",
			colonia: "Americana",
			ciudad: "Guadalajara",
			estado: "Jalisco",
			cp: "44160",
			referencias: null,
		},
	},
	{
		correo: "punto-y-aparte@kustto.test",
		nombre: "Punto y Aparte",
		slug: "punto-y-aparte",
		bio: "Grabado y sublimación en la Ciudad de México.",
		whatsapp: "5512345678",
		/* Sin recolección a propósito: así se ve el aviso de "no estás
		   recibiendo pedidos con envío" y sus pedidos son para recoger. */
		recoleccion: null,
	},
];

const COMPRADOR = {
	correo: "comprador@kustto.test",
	nombre: "Andrea Salinas",
	whatsapp: "5587654321",
};

/* ─── Gente y lugares inventados para los pedidos ───────────────────────── */

const NOMBRES = [
	"Mariana López",
	"Diego Hernández",
	"Sofía Ramírez",
	"Luis Torres",
	"Valeria Castillo",
	"Jorge Mendoza",
	"Fernanda Ruiz",
	"Pablo Aguilar",
	"Camila Ortega",
	"Emilio Vargas",
];

const DIRECCIONES = [
	{
		calle: "Av. Reforma",
		numero: "222",
		colonia: "Juárez",
		ciudad: "Ciudad de México",
		estado: "CDMX",
		cp: "06600",
	},
	{
		calle: "Calle Morelos",
		numero: "35",
		colonia: "Centro",
		ciudad: "Querétaro",
		estado: "Querétaro",
		cp: "76000",
	},
	{
		calle: "Av. Vallarta",
		numero: "3040",
		colonia: "Vallarta Poniente",
		ciudad: "Guadalajara",
		estado: "Jalisco",
		cp: "44110",
	},
	{
		calle: "Calle 60",
		numero: "488",
		colonia: "Centro",
		ciudad: "Mérida",
		estado: "Yucatán",
		cp: "97000",
	},
	{
		calle: "Blvd. Díaz Ordaz",
		numero: "140",
		colonia: "Santa María",
		ciudad: "Monterrey",
		estado: "Nuevo León",
		cp: "64650",
	},
	{
		calle: "Av. Juárez",
		numero: "12",
		colonia: "Centro",
		ciudad: "Puebla",
		estado: "Puebla",
		cp: "72000",
	},
];

const PAQUETERIAS = [
	{
		nombre: "Paquetexpress",
		clave: "paquetexpress",
		servicio: "Express",
		url: "https://www.paquetexpress.com.mx/rastreo/",
	},
	{
		nombre: "Estafeta",
		clave: "estafeta",
		servicio: "Día siguiente",
		url: "https://www.estafeta.com/rastrear-envio?guia=",
	},
	{
		nombre: "DHL",
		clave: "dhl",
		servicio: "Express",
		url: "https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=",
	},
];

type Estado = (typeof e.estadoPedido.enumValues)[number];
const RECORRIDO: Estado[] = [
	"nuevo",
	"produccion",
	"listo",
	"enviado",
	"entregado",
];

/** Cuántos de cada estado, y hace cuántos días pudo haberse hecho la compra. */
const REPARTO: { estado: Estado; cuantos: number; dias: [number, number] }[] = [
	{ estado: "nuevo", cuantos: 7, dias: [0, 2] },
	{ estado: "produccion", cuantos: 6, dias: [1, 5] },
	{ estado: "listo", cuantos: 4, dias: [3, 8] },
	{ estado: "enviado", cuantos: 4, dias: [6, 12] },
	{ estado: "entregado", cuantos: 7, dias: [14, 45] },
	{ estado: "cancelado", cuantos: 2, dias: [4, 30] },
];

/* ─── El catálogo exportado ─────────────────────────────────────────────── */

type Fila = Record<string, unknown>;
type ProductoExportado = Fila & {
	id: string;
	nombre: string;
	estado: (typeof e.estadoProducto.enumValues)[number];
	imagenes: Fila[];
	colores: Fila[];
	tallas: Fila[];
	lados: Fila[];
	precio: Fila | null;
	produccion: Fila | null;
	existencias: Fila[];
	fotosReales: Fila[];
	categorias: string[];
};
type Catalogo = {
	plantillas: { id: string; nombre: string; datos: unknown }[];
	categorias: {
		id: string;
		nombre: string;
		slug: string;
		descripcion: string | null;
		imagenUrl: string | null;
		orden: number;
	}[];
	productos: ProductoExportado[];
	arte: Fila[];
};

const num = (v: unknown) => (v == null ? null : Number(v));
const texto = (v: unknown) => (v == null ? null : String(v));

async function principal() {
	const url = process.env.DATABASE_URL;
	if (
		!url ||
		!["localhost", "127.0.0.1", "postgres"].includes(new URL(url).hostname)
	)
		throw new Error("Sólo se siembra la base local");
	if (CONTRASENA.length < 8)
		throw new Error("SEMILLA_CONTRASENA necesita al menos 8 caracteres");

	const catalogo = JSON.parse(
		await readFile("semilla/catalogo.json", "utf8"),
	) as Catalogo;

	const pool = new Pool({ connectionString: url });
	const db = drizzle(pool, { schema: e, casing: "snake_case" });

	try {
		/* ─── ¿Se puede sembrar aquí? ───────────────────────────────────────── */
		const { rows } = await pool.query(
			"select (select count(*) from productos) + (select count(*) from usuarios) as filas",
		);
		if (Number(rows[0].filas) > 0 && !DESDE_CERO)
			throw new Error(
				"La base ya tiene datos. Corre con --desde-cero para vaciarla y sembrar (sólo local).",
			);
		if (DESDE_CERO) {
			const tablas = await pool.query(
				"select tablename from pg_tables where schemaname = 'public'",
			);
			const lista = tablas.rows.map((t) => `"${t.tablename}"`).join(", ");
			if (lista)
				await pool.query(`truncate table ${lista} restart identity cascade`);
			console.log(`Base vaciada (${tablas.rowCount} tablas).`);
		}

		const hash = await hashear(CONTRASENA);
		const verificado = hace(60);

		await db.transaction(async (tx) => {
			/* ─── Cuentas ────────────────────────────────────────────────── */
			await tx.insert(e.usuarios).values({
				id: idDe(ADMIN.correo),
				tipo: "admin",
				correo: ADMIN.correo,
				contrasenaHash: hash,
				correoVerificadoEn: verificado,
			});

			for (const t of TALLERES) {
				/* El taller y su cuenta comparten id, como en `TalleresService.crear`. */
				const id = idDe(t.correo);
				await tx.insert(e.usuarios).values({
					id,
					tipo: "taller",
					correo: t.correo,
					contrasenaHash: hash,
					correoVerificadoEn: verificado,
				});
				await tx.insert(e.talleres).values({
					id,
					correo: t.correo,
					nombre: t.nombre,
					nombrePublico: t.nombre,
					slug: t.slug,
					bio: t.bio,
					whatsapp: t.whatsapp,
					recoleccion: t.recoleccion,
				});
			}

			const idComprador = idDe(COMPRADOR.correo);
			await tx.insert(e.usuarios).values({
				id: idComprador,
				tipo: "comprador",
				correo: COMPRADOR.correo,
				contrasenaHash: hash,
				correoVerificadoEn: verificado,
			});
			await tx.insert(e.compradores).values({
				id: idComprador,
				correo: COMPRADOR.correo,
				nombre: COMPRADOR.nombre,
				whatsapp: COMPRADOR.whatsapp,
				direccion: {
					...DIRECCIONES[0],
					interior: "Depto 4",
					referencias: null,
				},
			});

			/* ─── Catálogo ───────────────────────────────────────────────── */
			if (catalogo.plantillas.length)
				await tx.insert(e.plantillasDePrenda).values(catalogo.plantillas);
			if (catalogo.categorias.length)
				await tx.insert(e.categorias).values(catalogo.categorias);

			/* Los productos se reparten entre los talleres en orden: el primero
			   al primero, el segundo al segundo… Así cada taller tiene algo que
			   vender y, con el catálogo de hoy, algo con arte para sus pedidos. */
			const dueno = new Map(
				catalogo.productos.map((p, i) => [
					p.id,
					idDe(TALLERES[i % TALLERES.length].correo),
				]),
			);

			for (const p of catalogo.productos) {
				await tx.insert(e.productos).values({
					id: p.id,
					tallerId: dueno.get(p.id) as string,
					nombre: p.nombre,
					nombreInterno: texto(p.nombre_interno),
					sku: texto(p.sku),
					descripcion: texto(p.descripcion),
					slug: String(p.slug),
					estado: p.estado,
					plantillaId: texto(p.plantilla_id),
					personalizable: Boolean(p.personalizable),
					minimoAlerta: num(p.minimo_alerta),
					diasExtraSinStock: num(p.dias_extra_sin_stock),
					caja: p.caja ?? null,
					reglasPersonalizacion: p.reglas_personalizacion ?? null,
					ladosDePlantilla: p.lados_de_plantilla ?? null,
					notaRevision: texto(p.nota_revision),
				});
				const de = { productoId: p.id };
				if (p.imagenes.length)
					await tx.insert(e.productoImagenes).values(
						p.imagenes.map((i) => ({
							...de,
							url: String(i.url),
							orden: Number(i.orden),
						})),
					);
				if (p.colores.length)
					await tx.insert(e.productoColores).values(
						p.colores.map((c) => ({
							...de,
							nombre: String(c.nombre),
							hex: texto(c.hex),
						})),
					);
				if (p.tallas.length)
					await tx.insert(e.productoTallas).values(
						p.tallas.map((t) => ({
							...de,
							talla: String(t.talla),
							anchoIn: num(t.ancho_in),
							largoIn: num(t.largo_in),
							pesoG: num(t.peso_g),
							orden: Number(t.orden),
						})),
					);
				if (p.lados.length)
					await tx.insert(e.productoLados).values(
						p.lados.map((l) => ({
							...de,
							clave: String(l.clave),
							anchoCm: Number(l.ancho_cm),
							altoCm: Number(l.alto_cm),
							dpi: Number(l.dpi),
							sangradoCm: Number(l.sangrado_cm),
							tecnica: texto(l.tecnica),
							recargo: texto(l.recargo),
							activo: Boolean(l.activo),
						})),
					);
				if (p.precio)
					await tx.insert(e.productoPrecios).values({
						...de,
						precioBase: String(p.precio.precio_base),
						precioPorLado: texto(p.precio.precio_por_lado),
					});
				if (p.produccion)
					await tx.insert(e.productoProduccion).values({
						...de,
						dias: num(p.produccion.dias),
						minimoPiezas: num(p.produccion.minimo_piezas),
					});
				if (p.existencias.length)
					await tx.insert(e.productoExistencias).values(
						p.existencias.map((x) => ({
							...de,
							color: texto(x.color),
							talla: String(x.talla),
							cantidad: Number(x.cantidad),
						})),
					);
				if (p.fotosReales.length)
					await tx.insert(e.productoFotosReales).values(
						p.fotosReales.map((f) => ({
							...de,
							lado: String(f.lado),
							color: texto(f.color),
							url: String(f.url),
							esquinas: f.esquinas ?? null,
							banda: f.banda ?? null,
							orden: Number(f.orden),
						})),
					);
				if (p.categorias.length)
					await tx
						.insert(e.productoCategorias)
						.values(
							p.categorias.map((categoriaId) => ({ ...de, categoriaId })),
						);
			}

			/* ─── Pedidos ────────────────────────────────────────────────── */

			/* Sólo se piden productos activos que tengan arte real: una partida
			   sin archivo de producción es un pedido que el taller no puede
			   hacer, y en el panel se ve roto. */
			const porId = new Map(catalogo.productos.map((p) => [p.id, p]));
			const artePorTaller = new Map<string, Fila[]>();
			for (const a of catalogo.arte) {
				const p = porId.get(String(a.producto_id));
				if (p?.estado !== "activo") continue;
				const taller = dueno.get(p.id) as string;
				artePorTaller.set(taller, [...(artePorTaller.get(taller) ?? []), a]);
			}
			const talleresConArte = [...artePorTaller.keys()];
			if (talleresConArte.length === 0)
				throw new Error(
					"semilla/catalogo.json no trae arte de pedidos para productos activos",
				);

			const folios = new Set<string>();
			const nuevoFolio = () => {
				let f: string;
				do f = String(entre(100_000, 999_999));
				while (folios.has(f));
				folios.add(f);
				return f;
			};

			const plan = REPARTO.flatMap((x) =>
				Array.from({ length: x.cuantos }, () => x),
			).slice(0, COMPRAS);

			for (const [n, paso] of plan.entries()) {
				const creado = hace(entre(paso.dias[0], paso.dias[1]), entre(0, 20));
				const delComprador = n % 3 === 0;
				const nombre = delComprador ? COMPRADOR.nombre : uno(NOMBRES);
				const correo = delComprador
					? COMPRADOR.correo
					: `${nombre
							.normalize("NFD")
							.replace(/[̀-ͯ]/g, "")
							.toLowerCase()
							.replace(" ", ".")}@ejemplo.test`;
				const whatsapp = delComprador
					? COMPRADOR.whatsapp
					: `55${entre(10_000_000, 99_999_999)}`;

				/* Una de cada cinco compras va a dos talleres: así se ve que una
				   compra son VARIOS pedidos, uno por taller, cada uno con su folio. */
				const talleres =
					n % 5 === 4 && talleresConArte.length > 1
						? [
								talleresConArte[n % talleresConArte.length],
								talleresConArte[(n + 1) % talleresConArte.length],
							]
						: [talleresConArte[n % talleresConArte.length]];

				const folio = nuevoFolio();
				const compraId = idDe(`compra:${folio}`);
				const pedidosDeLaCompra = [];

				for (const [i, tallerId] of talleres.entries()) {
					const taller = TALLERES.find((t) => idDe(t.correo) === tallerId);
					/* Un taller sin recolección no puede enviar: todo lo suyo es para
					   recoger, igual que en el checkout de verdad. */
					const conEnvio = Boolean(taller?.recoleccion) && r() < 0.75;
					const direccion = conEnvio
						? { ...uno(DIRECCIONES), interior: null, referencias: null }
						: null;
					const paqueteria = uno(PAQUETERIAS);
					const envio = conEnvio
						? {
								precio: entre(99, 189) + 0.5,
								servicio: paqueteria.servicio,
								tarifaId: `tarifa-${entre(1, 4)}`,
								paqueteria: paqueteria.nombre,
								cotizacionId: idDe(`cotizacion:${folio}-${i}`),
								diasEstimados: entre(2, 5),
							}
						: null;

					/* Una o dos partidas, del arte real de ese taller. */
					const artes = artePorTaller.get(tallerId) ?? [];
					const elegidos =
						r() < 0.3 && artes.length > 1 ? [artes[0], artes[1]] : [uno(artes)];
					const partidas = elegidos.map((a, orden) => {
						const p = porId.get(String(a.producto_id)) as ProductoExportado;
						const lados = (a.lados as string[]) ?? [];
						const precioBase = Number(p.precio?.precio_base ?? 0);
						const unitario =
							precioBase +
							extraPorLados(
								lados,
								p.lados.map((l) => ({
									sideKey: String(l.clave),
									recargo: l.recargo == null ? null : Number(l.recargo),
								})),
								{ perSidePrice: num(p.precio?.precio_por_lado) },
							);
						const tallas = p.tallas.length
							? p.tallas.map((t) => String(t.talla))
							: ["U"];
						const porTalla = tallas
							.map((talla) => ({ talla, piezas: entre(0, 4) }))
							.filter((t) => t.piezas > 0);
						if (porTalla.length === 0)
							porTalla.push({ talla: tallas[0], piezas: entre(1, 3) });
						const piezas = porTalla.reduce((s, t) => s + t.piezas, 0);
						return {
							id: idDe(`partida:${folio}-${i}-${orden}`),
							producto: p,
							arte: a,
							lados,
							unitario,
							piezas,
							porTalla,
							orden,
						};
					});

					const productosTotal = partidas.reduce(
						(s, x) => s + x.unitario * x.piezas,
						0,
					);
					const total = productosTotal + (envio?.precio ?? 0);
					/* Un pedido para recoger nunca pasa por "enviado": se queda listo
					   en el taller hasta que lo recogen. */
					const estado: Estado =
						paso.estado === "enviado" && !conEnvio ? "listo" : paso.estado;
					const guia =
						envio && (estado === "enviado" || estado === "entregado")
							? {
									costo: Number((envio.precio * 0.85).toFixed(2)),
									error: null,
									estado: estado === "entregado" ? "delivered" : "in_transit",
									envioId: idDe(`envio:${folio}-${i}`),
									rastreo: String(entre(10_000_000_000, 99_999_999_999)),
									compradaEn: new Date(
										creado.getTime() + 2 * 86_400_000,
									).toISOString(),
									paqueteria: paqueteria.clave,
									rastreoUrl: null,
									/* Sin etiqueta: una URL inventada abriría un error de la
									   paquetería al pulsar "descargar guía". */
									etiquetaUrl: null,
								}
							: null;

					pedidosDeLaCompra.push({
						id: idDe(`pedido:${folio}-${i + 1}`),
						tallerId,
						folio: `${folio}-${i + 1}`,
						estado,
						direccion,
						envio,
						guia,
						partidas,
						productosTotal,
						total,
						conEnvio,
					});
				}

				const piezasCompra = pedidosDeLaCompra.reduce(
					(s, p) => s + p.partidas.reduce((t, x) => t + x.piezas, 0),
					0,
				);
				const productosCompra = pedidosDeLaCompra.reduce(
					(s, p) => s + p.productosTotal,
					0,
				);
				const totalCompra = pedidosDeLaCompra.reduce((s, p) => s + p.total, 0);
				const primero = pedidosDeLaCompra[0];

				await tx.insert(e.compras).values({
					id: compraId,
					folio,
					correo,
					nombre,
					whatsapp,
					piezas: piezasCompra,
					productosTotal: dinero(productosCompra),
					total: dinero(totalCompra),
					metodoEntrega: primero.conEnvio ? "envio" : "recoger",
					direccion: primero.direccion,
					creadoEn: creado,
					actualizadoEn: creado,
				});

				for (const p of pedidosDeLaCompra) {
					/* La bitácora recorre los estados hasta el actual, cada paso un
					   poco después del anterior. Un cancelado se cancela desde nuevo. */
					const recorrido = p.conEnvio
						? RECORRIDO
						: RECORRIDO.filter((x) => x !== "enviado");
					const pasos: Estado[] =
						p.estado === "cancelado"
							? ["nuevo", "cancelado"]
							: recorrido.slice(0, recorrido.indexOf(p.estado) + 1);
					/* Cada paso DESPUÉS del anterior, sumando: con intervalos sueltos
					   desde la compra, un paso podía caer antes que el previo y la
					   bitácora terminaba en otro estado que el del pedido. */
					let reloj = creado.getTime();
					const fechas = pasos.map((_, k) => {
						if (k > 0) reloj += entre(18, 40) * 3_600_000;
						return new Date(reloj);
					});
					const ultima = fechas[fechas.length - 1];

					await tx.insert(e.pedidos).values({
						id: p.id,
						compraId,
						tallerId: p.tallerId,
						folio: p.folio,
						estado: p.estado,
						correo,
						nombre,
						whatsapp,
						notas:
							r() < 0.25
								? "Si se puede, que el bordado vaya un poco más arriba."
								: null,
						piezas: p.partidas.reduce((s, x) => s + x.piezas, 0),
						metodoEntrega: p.conEnvio ? "envio" : "recoger",
						direccion: p.direccion,
						envio: p.envio,
						guia: p.guia,
						productosTotal: dinero(p.productosTotal),
						total: dinero(p.total),
						creadoEn: creado,
						actualizadoEn: ultima,
					});

					for (const x of p.partidas) {
						await tx.insert(e.pedidoPartidas).values({
							id: x.id,
							pedidoId: p.id,
							productoId: x.producto.id,
							nombre: x.producto.nombre,
							sku: texto(x.arte.sku),
							imagenUrl: texto(x.arte.imagen_url),
							plantillaId: texto(x.arte.plantilla_id),
							color: texto(x.arte.color),
							colorHex: texto(x.arte.color_hex),
							lados: x.lados,
							piezas: x.piezas,
							precioUnitario: dinero(x.unitario),
							importe: dinero(x.unitario * x.piezas),
							arte: x.arte.arte ?? [],
							disenoRuta: texto(x.arte.diseno_ruta),
							bordados: x.arte.bordados ?? null,
							diasPrometidos:
								num(x.arte.dias_prometidos) ?? num(x.producto.produccion?.dias),
							orden: x.orden,
						});
						await tx.insert(e.pedidoPartidaTallas).values(
							x.porTalla.map((t) => ({
								partidaId: x.id,
								talla: t.talla,
								piezas: t.piezas,
							})),
						);
					}

					await tx.insert(e.pedidoBitacora).values(
						pasos.map((estado, k) => ({
							pedidoId: p.id,
							estado,
							nota:
								estado === "enviado" && p.guia
									? "Recolectado por la paquetería"
									: estado === "entregado" && p.guia
										? "Rastreo: delivered"
										: null,
							autor:
								estado === "nuevo"
									? "cliente"
									: p.guia && (estado === "entregado" || estado === "enviado")
										? "paqueteria"
										: "taller",
							creadoEn: fechas[k],
						})),
					);
				}
			}
		});

		const cuenta = async (tabla: string) =>
			Number((await pool.query(`select count(*) from ${tabla}`)).rows[0].count);
		console.log(
			[
				"",
				"Semilla lista.",
				`  ${await cuenta("productos")} productos, ${await cuenta("categorias")} categorías, ${await cuenta("plantillas_de_prenda")} plantillas`,
				`  ${await cuenta("compras")} compras, ${await cuenta("pedidos")} pedidos, ${await cuenta("pedido_partidas")} partidas`,
				"",
				`Contraseña de todas las cuentas: ${CONTRASENA}`,
				`  admin      ${ADMIN.correo}          → /admin/entrar`,
				...TALLERES.map(
					(t) => `  taller     ${t.correo.padEnd(26)} → /proveedor/login`,
				),
				`  comprador  ${COMPRADOR.correo}      → /cuenta/entrar`,
			].join("\n"),
		);
	} finally {
		await pool.end();
	}
}

principal().catch((error) => {
	console.error((error as Error).message);
	process.exit(1);
});
