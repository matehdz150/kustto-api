/**
 * Saca de la base local el catálogo que usa `pnpm db:sembrar`.
 *
 *   pnpm db:exportar-semilla
 *
 * Escribe `semilla/catalogo.json`: plantillas, categorías, productos con todo
 * lo suyo, y los archivos de producción de pedidos ya hechos. Se corre cuando
 * la base local tiene un catálogo que vale la pena repetir, y el JSON se sube
 * al repo.
 *
 * SÓLO LLEVA REFERENCIAS A S3 QUE EXISTEN. Cada ruta (`/medios/…`,
 * `/mockups/…`) se pide al bucket a través de la API antes de escribirla: la
 * base local tenía productos de prueba apuntando a `/medios/productos/x.png`,
 * que nunca existió, y una semilla que los copie siembra fichas sin foto. Un
 * producto al que le falta una imagen se queda fuera entero; una partida de
 * pedido cuyo arte no está, también.
 *
 * NO LLEVA DATOS DE PERSONAS. Ni correos, ni nombres, ni direcciones de quien
 * compró: de los pedidos sólo se toma el arte (qué se imprimió, en qué lado,
 * con qué archivo). Los compradores de la semilla los inventa `sembrar.ts`.
 * Los talleres tampoco viajan: la semilla crea los suyos y les reparte los
 * productos.
 *
 * Y NO LLEVA CATEGORÍAS VACÍAS: una categoría sin foto y sin productos es
 * resto de pruebas ("Otro nombre", cuatro veces) y sólo ensucia la cabecera.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { Pool } from "pg";

const API = process.env.KUSTTO_API ?? "http://localhost:8001";

/** Los estados que se exportan. `archivado` no le sirve a nadie en local. */
const ESTADOS = ["activo", "en_revision", "borrador", "rechazado"];

/** Cuántas rutas se comprueban a la vez contra el bucket. */
const EN_PARALELO = 6;

/** `/medios/x` → `/publico/medios/x`, igual que el rewrite del sitio. */
function urlPublica(ruta: string) {
	if (ruta.startsWith("/medios/") || ruta.startsWith("/mockups/"))
		return `${API}/publico${ruta}`;
	return null;
}

const comprobadas = new Map<string, Promise<boolean>>();

/** Si el objeto está en el bucket. Una ruta que no es nuestra se da por buena. */
function existe(ruta: string | null | undefined): Promise<boolean> {
	if (!ruta) return Promise.resolve(true);
	const url = urlPublica(ruta);
	if (!url) return Promise.resolve(true);
	let pendiente = comprobadas.get(url);
	if (!pendiente) {
		pendiente = fetch(url)
			.then(async (r) => {
				await r.body?.cancel();
				return r.ok;
			})
			.catch(() => false);
		comprobadas.set(url, pendiente);
	}
	return pendiente;
}

async function todas(rutas: (string | null | undefined)[]) {
	const resultados: boolean[] = [];
	for (let i = 0; i < rutas.length; i += EN_PARALELO) {
		resultados.push(
			...(await Promise.all(rutas.slice(i, i + EN_PARALELO).map(existe))),
		);
	}
	return resultados.every(Boolean);
}

/** Las rutas de S3 que hay dentro de una plantilla (sus mockups). */
function rutasDePlantilla(datos: unknown): string[] {
	const mockups = (datos as { mockups?: Record<string, unknown> })?.mockups;
	return Object.values(mockups ?? {}).filter(
		(v): v is string => typeof v === "string",
	);
}

async function principal() {
	const url = process.env.DATABASE_URL;
	if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
		throw new Error("Sólo se exporta desde la base local");

	const pool = new Pool({ connectionString: url });
	const q = async <T>(sql: string, params: unknown[] = []) =>
		(await pool.query(sql, params)).rows as T[];

	try {
		/* ─── Plantillas y categorías ─────────────────────────────────────── */
		const plantillas = [];
		for (const p of await q<{ id: string; nombre: string; datos: unknown }>(
			"select id, nombre, datos from plantillas_de_prenda order by id",
		)) {
			if (await todas(rutasDePlantilla(p.datos))) plantillas.push(p);
			else console.warn(`Plantilla fuera, le falta un mockup: ${p.id}`);
		}
		const plantillasValidas = new Set(plantillas.map((p) => p.id));

		const categorias = [];
		for (const c of await q<{
			id: string;
			nombre: string;
			slug: string;
			descripcion: string | null;
			imagen_url: string | null;
			orden: number;
		}>(
			"select id, nombre, slug, descripcion, imagen_url, orden from categorias order by orden, nombre",
		)) {
			/* Una categoría sin foto sigue siendo útil: se queda, sin la foto. */
			const foto = (await existe(c.imagen_url)) ? c.imagen_url : null;
			if (c.imagen_url && !foto)
				console.warn(`Categoría sin foto (no está en S3): ${c.nombre}`);
			categorias.push({
				id: c.id,
				nombre: c.nombre,
				slug: c.slug,
				descripcion: c.descripcion,
				imagenUrl: foto,
				orden: c.orden,
			});
		}

		/* ─── Productos ───────────────────────────────────────────────────── */
		const filas = await q<Record<string, unknown>>(
			`select id, taller_id, nombre, nombre_interno, sku, descripcion, slug,
			        estado, plantilla_id, personalizable, minimo_alerta,
			        dias_extra_sin_stock, caja, reglas_personalizacion,
			        lados_de_plantilla, nota_revision
			   from productos
			  where estado = any($1)
			  order by creado_en`,
			[ESTADOS],
		);

		const hijos = async (tabla: string, columnas: string, orden = "") =>
			q<Record<string, unknown>>(
				`select producto_id, ${columnas} from ${tabla} ${orden}`,
			);
		const agrupar = (lista: Record<string, unknown>[]) => {
			const m = new Map<string, Record<string, unknown>[]>();
			for (const { producto_id, ...resto } of lista) {
				const id = String(producto_id);
				m.set(id, [...(m.get(id) ?? []), resto]);
			}
			return m;
		};
		const imagenes = agrupar(
			await hijos("producto_imagenes", "url, orden", "order by orden"),
		);
		const colores = agrupar(await hijos("producto_colores", "nombre, hex"));
		const tallas = agrupar(
			await hijos(
				"producto_tallas",
				"talla, ancho_in, largo_in, peso_g, orden",
				"order by orden",
			),
		);
		const lados = agrupar(
			await hijos(
				"producto_lados",
				"clave, ancho_cm, alto_cm, dpi, sangrado_cm, tecnica, recargo, activo",
			),
		);
		const precios = agrupar(
			await hijos("producto_precios", "precio_base, precio_por_lado"),
		);
		const produccion = agrupar(
			await hijos("producto_produccion", "dias, minimo_piezas"),
		);
		const existencias = agrupar(
			await hijos("producto_existencias", "color, talla, cantidad"),
		);
		const fotosReales = agrupar(
			await hijos(
				"producto_fotos_reales",
				"lado, color, url, esquinas, banda, orden",
				"order by orden",
			),
		);
		const categoriasDe = agrupar(
			await hijos("producto_categorias", "categoria_id"),
		);

		const productos = [];
		for (const p of filas) {
			const id = String(p.id);
			const suyas = imagenes.get(id) ?? [];
			const fotos = fotosReales.get(id) ?? [];
			const rutas = [
				...suyas.map((i) => i.url as string),
				...fotos.map((f) => f.url as string),
			];
			if (suyas.length === 0 || !(await todas(rutas))) {
				console.warn(`Producto fuera, le falta una imagen: ${p.nombre}`);
				continue;
			}
			const plantilla = p.plantilla_id ? String(p.plantilla_id) : null;
			productos.push({
				...p,
				id,
				taller_id: undefined,
				/* Una plantilla que se quedó fuera no puede quedar apuntada. */
				plantilla_id:
					plantilla && plantillasValidas.has(plantilla) ? plantilla : null,
				imagenes: suyas,
				colores: colores.get(id) ?? [],
				tallas: tallas.get(id) ?? [],
				lados: lados.get(id) ?? [],
				precio: precios.get(id)?.[0] ?? null,
				produccion: produccion.get(id)?.[0] ?? null,
				existencias: existencias.get(id) ?? [],
				fotosReales: fotos,
				categorias: (categoriasDe.get(id) ?? []).map((c) => c.categoria_id),
			});
		}
		const exportados = new Set(productos.map((p) => String(p.id)));
		const conProductos = new Set(
			productos.flatMap((p) => p.categorias.map(String)),
		);
		const categoriasUtiles = categorias.filter(
			(c) => c.imagenUrl || conProductos.has(c.id),
		);

		/* ─── El arte de pedidos ya hechos ────────────────────────────────── */
		const arte = [];
		for (const a of await q<Record<string, unknown>>(
			`select producto_id, nombre, sku, imagen_url, plantilla_id, color,
			        color_hex, lados, arte, diseno_ruta, bordados, dias_prometidos
			   from pedido_partidas
			  where producto_id is not null
			    and jsonb_array_length(arte) > 0`,
		)) {
			if (!exportados.has(String(a.producto_id))) continue;
			const archivos = (a.arte as Record<string, unknown>[]).flatMap((x) =>
				["ruta", "prenda", "colocacion"].map((k) => x[k] as string),
			);
			if (
				!(await todas([
					a.imagen_url as string,
					a.diseno_ruta as string,
					...archivos,
				]))
			) {
				console.warn(`Arte fuera, falta un archivo: ${a.nombre}`);
				continue;
			}
			arte.push(a);
		}

		await mkdir("semilla", { recursive: true });
		await writeFile(
			"semilla/catalogo.json",
			`${JSON.stringify(
				{
					plantillas,
					categorias: categoriasUtiles,
					productos,
					arte,
				},
				null,
				"\t",
			)}\n`,
		);
		console.log(
			`semilla/catalogo.json: ${plantillas.length} plantillas, ${categoriasUtiles.length} categorías, ` +
				`${productos.length} productos, ${arte.length} artes de pedido`,
		);
	} finally {
		await pool.end();
	}
}

principal().catch((error) => {
	console.error((error as Error).message);
	process.exit(1);
});
