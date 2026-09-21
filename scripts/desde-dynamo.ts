/**
 * Traer lo que hay en DynamoDB a Postgres.
 *
 *   AWS_PROFILE=kustto-admin pnpm db:desde-dynamo
 *
 * SE PUEDE CORRER VARIAS VECES, y hace falta: la primera vez esto casi nunca
 * sale entero.
 *
 * Lo que tiene id propio entra con `onConflictDoNothing` y la segunda pasada
 * lo salta. Pero las COLECCIONES HIJAS —las partidas de un pedido, las
 * imágenes de un producto, el carrito de alguien— no tienen id en el origen:
 * son elementos de una lista dentro del ítem padre. Con un uuid generado aquí,
 * `onConflictDoNothing` no choca nunca y la segunda pasada las DUPLICA. Ya
 * pasó: 24 partidas se volvieron 48 en la segunda corrida.
 *
 * Por eso cada hija se BORRA POR SU PADRE antes de escribirse. El origen es la
 * verdad; lo que hubiera aquí de una pasada anterior sobra.
 *
 * NO BORRA NADA de DynamoDB. La tabla se queda como está hasta que alguien
 * mire los dos lados y decida; un script de migración que borra el origen no
 * se puede volver a correr.
 *
 * EL ORDEN IMPORTA y no es alfabético: las claves foráneas mandan. Talleres y
 * categorías antes que productos; compras antes que pedidos; pedidos antes que
 * partidas. Si algo falla a mitad, lo ya escrito se queda y la siguiente
 * pasada lo salta.
 *
 * LO QUE NO SE TRAE, a propósito: los ítems `LOCK`. `SLUG#`, `ORDER_FOLIO#`,
 * `PROVIDER_EMAIL#` y `EVENT_CODE#` existían porque en DynamoDB no hay UNIQUE.
 * Aquí son índices únicos y esos 38 ítems ya no representan nada. `ENVIO#`
 * sí se trae: ése no era un candado, era el apunte del envío al pedido.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as e from "../src/db/esquema";

type Item = Record<string, any>;

const TABLA = process.env.KUSTTO_TABLA ?? "kustto-prod";

const dynamo = DynamoDBDocumentClient.from(
	new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" }),
);

async function leerTodo(): Promise<Item[]> {
	const items: Item[] = [];
	let desde: Item | undefined;

	do {
		const pagina = await dynamo.send(
			new ScanCommand({ TableName: TABLA, ExclusiveStartKey: desde }),
		);
		items.push(...(pagina.Items ?? []));
		desde = pagina.LastEvaluatedKey;
	} while (desde);

	return items;
}

/** `PRODUCT#abc` / `META` → `PRODUCT/META`, para agrupar por tipo. */
function tipo(it: Item) {
	const corta = (s: string) => s.replace(/#.*/, "");
	return `${corta(it.pk)}/${corta(it.sk)}`;
}

/** Lo que va después del `#`. `PRODUCT#abc` → `abc`. */
function idDe(llave: string) {
	const i = llave.indexOf("#");
	return i === -1 ? llave : llave.slice(i + 1);
}

/**
 * Una fecha ISO, o ahora.
 *
 * En DynamoDB todo eran cadenas ISO, pero no todos los ítems llevan todas las
 * marcas: los más viejos son de antes de que existiera `actualizadoEn`. Sin
 * esto, la columna NOT NULL los rechaza y se pierde el ítem entero por no
 * tener una fecha que nadie mira.
 */
function fecha(valor: unknown, respaldo = new Date()): Date {
	/* `expiraEn` no es una cadena ISO como todo lo demás: es el TTL de DynamoDB,
	   que se declara en segundos desde epoch. Sin este caso se caía al respaldo
	   y todos los diseños de evento quedaban caducando hoy. */
	if (typeof valor === "number") return new Date(valor * 1000);
	if (typeof valor !== "string") return respaldo;

	const d = new Date(valor);
	return Number.isNaN(d.getTime()) ? respaldo : d;
}

function opcional(valor: unknown): string | null {
	return typeof valor === "string" && valor.trim() ? valor : null;
}

/** Pesos como cadena, que es lo que quiere NUMERIC. */
function pesos(valor: unknown): string {
	const n = Number(valor ?? 0);
	return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function aSlug(texto: string) {
	return texto
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * La llave de una variante dentro del mapa `existencias`: `"Negro|M"` o `"M"`.
 * Espejo de `variante()` en las Lambdas; si aquello cambia, esto también.
 */
function partirVariante(llave: string): { color: string | null; talla: string } {
	const partes = llave.split("|");
	return partes.length > 1
		? { color: partes[0], talla: partes.slice(1).join("|") }
		: { color: null, talla: partes[0] };
}

async function principal() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("Falta DATABASE_URL");

	const pool = new Pool({ connectionString: url, max: 1 });
	const db = drizzle(pool, { schema: e, casing: "snake_case" });

	const items = await leerTodo();
	const porTipo = new Map<string, Item[]>();
	for (const it of items) {
		const t = tipo(it);
		const lista = porTipo.get(t);
		if (lista) lista.push(it);
		else porTipo.set(t, [it]);
	}

	const de = (t: string) => porTipo.get(t) ?? [];
	const cuenta: Record<string, number> = {};
	const anotar = (que: string, n: number) => {
		cuenta[que] = (cuenta[que] ?? 0) + n;
	};

	try {
		/* ─── Talleres ─────────────────────────────────────────────────────── */
		for (const it of de("PROVIDER/META")) {
			await db
				.insert(e.talleres)
				.values({
					id: it.id,
					correo: String(it.email ?? "").toLowerCase(),
					nombre: it.name ?? "(sin nombre)",
					slug: it.slug ?? aSlug(it.name ?? it.id),
					nombrePublico: opcional(it.displayName),
					bio: opcional(it.bio),
					avatarUrl: opcional(it.avatarUrl),
					bannerUrl: opcional(it.bannerUrl),
					whatsapp: opcional(it.whatsapp),
					saldoEnvios: pesos(it.saldoEnvios),
					cargosEnvio: it.cargosEnvio ?? null,
					recoleccion: it.recoleccion ?? null,
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
				})
				.onConflictDoNothing();
			anotar("talleres", 1);
		}

		/* ─── Categorías ───────────────────────────────────────────────────── */
		const slugsUsados = new Set<string>();
		for (const [i, it] of de("CATEGORY/CAT").entries()) {
			/* El slug se inventa aquí: en DynamoDB no existía. Con el índice
			   único delante, dos categorías que se llamen igual chocarían, así
			   que la repetida lleva sufijo en vez de tumbar la migración. */
			let slug = aSlug(it.name ?? `categoria-${i}`);
			while (slugsUsados.has(slug)) slug = `${slug}-${i}`;
			slugsUsados.add(slug);

			await db
				.insert(e.categorias)
				.values({
					id: it.id,
					nombre: it.name ?? "(sin nombre)",
					slug,
					descripcion: opcional(it.description),
					imagenUrl: opcional(it.image),
					orden: i,
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.createdAt),
				})
				.onConflictDoNothing();
			anotar("categorias", 1);
		}

		/* ─── Plantillas de prenda ─────────────────────────────────────────── */
		for (const it of de("TEMPLATE/TPL")) {
			await db
				.insert(e.plantillasDePrenda)
				.values({
					id: it.id,
					nombre: it.name ?? "(sin nombre)",
					datos: it.data ?? {},
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
				})
				.onConflictDoNothing();
			anotar("plantillas_de_prenda", 1);
		}

		/* ─── Productos y sus piezas ───────────────────────────────────────── */
		for (const it of de("PRODUCT/META")) {
			await db
				.insert(e.productos)
				.values({
					id: it.id,
					tallerId: it.proveedorId,
					nombre: it.name ?? "(sin nombre)",
					nombreInterno: opcional(it.internalName),
					sku: opcional(it.sku),
					descripcion: opcional(it.description),
					slug: it.slug ?? aSlug(it.name ?? it.id),
					estado: it.estado ?? "borrador",
					plantillaId: opcional(it.templateId),
					personalizable: it.isCustomizable !== false,
					minimoAlerta: it.minimoAlerta ?? null,
					diasExtraSinStock: it.diasExtraSinStock ?? null,
					caja: it.caja ?? null,
					reglasPersonalizacion: it.customizationRules ?? null,
					ladosDePlantilla: it.templateSides ?? null,
					notaRevision: opcional(it.notaRevision),
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
				})
				.onConflictDoNothing();
			anotar("productos", 1);

			/* Ver la cabecera: las hijas se borran por su padre para que una
			   segunda pasada no las duplique. */
			await db
				.delete(e.productoImagenes)
				.where(eq(e.productoImagenes.productoId, it.id));

			for (const catId of it.categoryIds ?? []) {
				await db
					.insert(e.productoCategorias)
					.values({ productoId: it.id, categoriaId: catId })
					.onConflictDoNothing();
			}

			for (const [i, img] of (it.images ?? []).entries()) {
				await db
					.insert(e.productoImagenes)
					.values({ productoId: it.id, url: img.url, orden: img.order ?? i })
					.onConflictDoNothing();
			}

			for (const c of it.colors ?? []) {
				await db
					.insert(e.productoColores)
					.values({ productoId: it.id, nombre: c.name, hex: opcional(c.hex) })
					.onConflictDoNothing();
			}

			for (const [i, t] of (it.sizes ?? []).entries()) {
				await db
					.insert(e.productoTallas)
					.values({
						productoId: it.id,
						talla: t.size,
						anchoIn: t.widthIn ?? null,
						largoIn: t.lengthIn ?? null,
						/* El peso vive fuera de `sizes`, en su propio mapa por talla:
						   el color no cambia lo que pesa una prenda. */
						pesoG: it.pesoPorTalla?.[t.size] ?? null,
						orden: i,
					})
					.onConflictDoNothing();
			}

			for (const l of it.printSides ?? []) {
				await db
					.insert(e.productoLados)
					.values({
						productoId: it.id,
						clave: l.sideKey,
						anchoCm: l.widthCm,
						altoCm: l.heightCm,
						dpi: l.dpi ?? 300,
						sangradoCm: l.sangradoCm ?? 0,
						tecnica: opcional(l.tecnica),
						recargo:
							l.recargo === undefined || l.recargo === null
								? null
								: pesos(l.recargo),
						/* Sólo `=== false` apaga: un lado sin la clave es de antes de
						   que existiera el interruptor, y ésos SÍ se ofrecen. */
						activo: l.enabled !== false,
					})
					.onConflictDoNothing();
			}

			if (it.pricing) {
				await db
					.insert(e.productoPrecios)
					.values({
						productoId: it.id,
						precioBase: pesos(it.pricing.basePrice),
						/* Se perdía entero, y es lo que cobra cada lado además del
						   primero: sin él, una playera con cuatro estampados costaba
						   lo mismo que una con uno. */
						precioPorLado:
							it.pricing.perSidePrice === undefined ||
							it.pricing.perSidePrice === null
								? null
								: pesos(it.pricing.perSidePrice),
					})
					.onConflictDoNothing();
			}

			if (it.production) {
				await db
					.insert(e.productoProduccion)
					.values({
						productoId: it.id,
						/* Vive en `production.meta.diasProduccion`, no en `days` ni
						   `dias`: buscándolo ahí salía null en los nueve productos. */
						dias: it.production.meta?.diasProduccion ?? null,
						minimoPiezas: it.production.meta?.minimoPiezas ?? null,
					})
					.onConflictDoNothing();
			}

			for (const [llave, cantidad] of Object.entries(it.existencias ?? {})) {
				const { color, talla } = partirVariante(llave);
				await db
					.insert(e.productoExistencias)
					.values({ productoId: it.id, color, talla, cantidad: Number(cantidad) })
					.onConflictDoNothing();
			}

			/* Hija sin id propio: se borra por su padre. Ver la cabecera. */
			await db
				.delete(e.productoFotosReales)
				.where(eq(e.productoFotosReales.productoId, it.id));

			for (const [i, f] of (it.fotosReales ?? []).entries()) {
				await db.insert(e.productoFotosReales).values({
					productoId: it.id,
					lado: f.lado ?? f.sideKey,
					color: opcional(f.color),
					url: f.url,
					/* Una u otra, nunca las dos: plano lleva esquinas y cilindro
					   lleva banda. Ver el comentario de la tabla. */
					esquinas: f.esquinas ?? null,
					banda: f.banda ?? null,
					orden: i,
				});
			}
		}

		/* ─── Compras, antes que los pedidos: la FK va hacia aquí ──────────── */
		for (const it of de("PURCHASE/META")) {
			await db
				.insert(e.compras)
				.values({
					id: it.id,
					folio: it.folio,
					correo: String(it.comprador?.email ?? it.comprador?.correo ?? "")
						.toLowerCase(),
					nombre: opcional(it.comprador?.nombre ?? it.comprador?.name),
					whatsapp: opcional(it.comprador?.whatsapp ?? it.comprador?.telefono),
					piezas: Number(it.piezas ?? 0),
					productosTotal: pesos(it.productosTotal),
					total: pesos(it.total),
					huellaDeToken: opcional(it.tokenHuella),
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
				})
				.onConflictDoNothing();
			anotar("compras", 1);
		}

		/* ─── Pedidos, sus partidas y su bitácora ──────────────────────────── */
		for (const it of de("ORDER/META")) {
			/* Un pedido SIN compra es de antes de que existieran las compras. No
			   se puede insertar —la FK es obligatoria— así que se le fabrica una
			   compra de una sola parte, que es exactamente lo que era. */
			let compraId: string = it.compraId ?? "";

			if (!compraId) {
				const [creada] = await db
					.insert(e.compras)
					.values({
						folio: it.folio,
						correo: String(it.comprador?.email ?? "").toLowerCase(),
						nombre: opcional(it.comprador?.nombre),
						whatsapp: opcional(it.comprador?.whatsapp),
						piezas: Number(it.piezas ?? 0),
						productosTotal: pesos(it.productosTotal),
						total: pesos(it.total),
						huellaDeToken: opcional(it.tokenHuella),
						creadoEn: fecha(it.createdAt),
						actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
					})
					.onConflictDoNothing()
					.returning({ id: e.compras.id });

				if (creada) {
					compraId = creada.id;
					anotar("compras_fabricadas", 1);
				} else {
					/* Ya existía con ese folio: se busca, porque `onConflictDoNothing`
					   no devuelve la fila que chocó. */
					const [previa] = await db
						.select({ id: e.compras.id })
						.from(e.compras)
						.where(eq(e.compras.folio, it.folio));
					compraId = previa?.id ?? "";
				}
			}

			if (!compraId) {
				console.warn(`Pedido ${it.id} sin compra que apuntar; se salta`);
				continue;
			}

			await db
				.insert(e.pedidos)
				.values({
					id: it.id,
					compraId,
					tallerId: it.proveedorId,
					folio: it.folio,
					estado: it.estado ?? "nuevo",
					correo: String(it.comprador?.email ?? "").toLowerCase(),
					nombre: opcional(it.comprador?.nombre),
					whatsapp: opcional(it.comprador?.whatsapp),
					piezas: Number(it.piezas ?? 0),
					metodoEntrega: it.entrega?.metodo === "recoger" ? "recoger" : "envio",
					direccion: it.entrega?.direccion ?? null,
					envio: it.envio ?? null,
					guia: it.guia ?? null,
					productosTotal: pesos(it.productosTotal),
					total: pesos(it.total),
					huellaDeToken: opcional(it.tokenHuella),
					creadoEn: fecha(it.createdAt),
					actualizadoEn: fecha(it.updatedAt ?? it.createdAt),
				})
				.onConflictDoNothing();
			anotar("pedidos", 1);

			await db
				.delete(e.pedidoPartidas)
				.where(eq(e.pedidoPartidas.pedidoId, it.id));
			await db
				.delete(e.pedidoBitacora)
				.where(eq(e.pedidoBitacora.pedidoId, it.id));

			for (const l of it.lineas ?? []) {
				const piezas = Number(l.piezas ?? l.cantidad ?? 0);
				const unitario = Number(l.precioUnitario ?? l.precio ?? 0);

				await db
					.insert(e.pedidoPartidas)
					.values({
						pedidoId: it.id,
						productoId: opcional(l.productoId ?? l.productId),
						nombre: l.nombre ?? l.name ?? "(sin nombre)",
						color: opcional(l.color),
						talla: opcional(l.talla ?? l.size),
						piezas,
						precioUnitario: pesos(unitario),
						/* El importe se recalcula y no se copia: en DynamoDB no siempre
						   estaba, y una partida sin importe deja el pedido sumando mal. */
						importe: pesos(l.importe ?? piezas * unitario),
						arte: l.arte ?? l.rutas ?? null,
						diseno: l.diseno ?? null,
					})
					.onConflictDoNothing();
				anotar("partidas", 1);
			}

			for (const b of it.bitacora ?? []) {
				await db
					.insert(e.pedidoBitacora)
					.values({
						pedidoId: it.id,
						estado: b.estado ?? it.estado ?? "nuevo",
						nota: opcional(b.nota),
						autor: opcional(b.autor ?? b.por),
						creadoEn: fecha(b.en ?? b.fecha ?? b.creadoEn, fecha(it.createdAt)),
					})
					.onConflictDoNothing();
				anotar("bitacora", 1);
			}
		}

		/* ─── El apunte del envío al pedido ────────────────────────────────── */
		for (const it of de("ENVIO/LOCK")) {
			await db
				.insert(e.enviosDePaqueteria)
				.values({
					envioId: idDe(it.pk),
					pedidoId: it.pedidoId,
					creadoEn: fecha(it.creadoEn),
				})
				.onConflictDoNothing();
			anotar("envios", 1);
		}

		/* ─── El comprador y lo suyo ───────────────────────────────────────── */

		/**
		 * LA FILA SE CREA PARA TODO `CUSTOMER#<sub>` QUE APAREZCA, tenga perfil
		 * o no.
		 *
		 * En DynamoDB la partición de un comprador existía en cuanto guardaba
		 * algo; el ítem `META` sólo aparecía si llenaba su perfil. Hay carritos,
		 * imágenes y plantillas de gente sin `META`, y en Postgres la clave
		 * foránea no perdona eso: sin esta pasada previa, todo lo suyo se pierde
		 * porque su fila no existe.
		 */
		const perfiles = new Map<string, Item>();
		for (const it of items) {
			if (typeof it.pk === "string" && it.pk.startsWith("CUSTOMER#")) {
				const sub = idDe(it.pk);
				if (it.sk === "META") perfiles.set(sub, it);
				else if (!perfiles.has(sub)) perfiles.set(sub, {});
			}
		}

		for (const [sub, perfil] of perfiles) {
			await db
				.insert(e.compradores)
				.values({
					id: sub,
					/* El correo NO está en el ítem: vivía sólo en el token de Cognito.
					   Se queda nulo y se rellena la primera vez que entre. */
					correo: null,
					nombre: opcional(perfil.nombre),
					whatsapp: opcional(perfil.whatsapp),
					direccion: perfil.direccion ?? null,
					creadoEn: fecha(perfil.creadoEn),
					actualizadoEn: fecha(perfil.actualizadoEn ?? perfil.creadoEn),
				})
				.onConflictDoNothing();
			anotar(perfil.nombre ? "compradores" : "compradores_sin_perfil", 1);
		}

		for (const it of de("CUSTOMER/IMAGE")) {
			await db
				.insert(e.imagenesDeComprador)
				.values({
					id: it.id,
					compradorId: idDe(it.pk),
					nombre: opcional(it.nombre),
					url: it.url,
					ancho: it.ancho ?? null,
					alto: it.alto ?? null,
					creadoEn: fecha(it.creadaEn),
					actualizadoEn: fecha(it.creadaEn),
				})
				.onConflictDoNothing();
			anotar("imagenes", 1);
		}

		for (const it of de("CUSTOMER/FAVS")) {
			for (const productoId of it.ids ?? []) {
				await db
					.insert(e.favoritos)
					.values({ compradorId: idDe(it.pk), productoId })
					.onConflictDoNothing();
				anotar("favoritos", 1);
			}
		}

		for (const it of de("CUSTOMER/CART")) {
			await db
				.delete(e.carritoPartidas)
				.where(eq(e.carritoPartidas.compradorId, idDe(it.pk)));

			for (const a of it.articulos ?? []) {
				await db
					.insert(e.carritoPartidas)
					.values({
						compradorId: idDe(it.pk),
						productoId: a.productoId ?? a.productId,
						color: opcional(a.color),
						talla: opcional(a.talla ?? a.size),
						piezas: Number(a.piezas ?? a.cantidad ?? 1),
						arte: a.arte ?? a.rutas ?? null,
						diseno: a.diseno ?? null,
						creadoEn: fecha(it.actualizadoEn),
						actualizadoEn: fecha(it.actualizadoEn),
					})
					.onConflictDoNothing();
				anotar("carrito", 1);
			}
		}

		for (const it of de("CUSTOMER/TEMPLATE")) {
			await db
				.insert(e.plantillasDeCompra)
				.values({
					id: it.id,
					compradorId: idDe(it.pk),
					nombre: it.nombre ?? "(sin nombre)",
					vecesPedida: Number(it.vecesPedida ?? 0),
					ultimaVez: it.ultimaVez ? fecha(it.ultimaVez) : null,
					creadoEn: fecha(it.creadaEn),
					actualizadoEn: fecha(it.actualizadaEn ?? it.creadaEn),
				})
				.onConflictDoNothing();
			anotar("plantillas_de_compra", 1);

			await db
				.delete(e.plantillaDeCompraPartidas)
				.where(eq(e.plantillaDeCompraPartidas.plantillaId, it.id));

			for (const linea of it.items ?? []) {
				await db
					.insert(e.plantillaDeCompraPartidas)
					.values({
						plantillaId: it.id,
						productoId: linea.productoId ?? linea.productId,
						/* La plantilla APUNTA al diseño guardado, no copia el arte: el
						   del carrito caduca a los 30 días y éste tiene que durar años. */
						disenoId: opcional(linea.disenoId),
						color: opcional(linea.color),
						talla: opcional(linea.talla ?? linea.size),
						piezas: Number(linea.piezas ?? linea.cantidad ?? 1),
					})
					.onConflictDoNothing();
			}
		}

		/* Los eventos cuelgan de `CUSTOMER#<sub>`; sus participaciones y diseños
		   viven en otra partición (`EVENT#<id>`), así que se agrupan aparte. */
		const participacionesPorEvento = new Map<string, Item[]>();
		for (const it of de("EVENT/PARTICIPATION")) {
			const id = idDe(it.pk);
			const lista = participacionesPorEvento.get(id);
			if (lista) lista.push(it);
			else participacionesPorEvento.set(id, [it]);
		}

		for (const it of de("CUSTOMER/EVENT")) {
			await db
				.insert(e.eventos)
				.values({
					id: it.id,
					compradorId: idDe(it.pk),
					nombre: it.nombre ?? "(sin nombre)",
					descripcion: opcional(it.descripcion),
					codigo: it.codigo,
					estado: it.estado ?? "borrador",
					portadaUrl: opcional(it.imagen),
					direccion: it.direccion ?? null,
					abreEn: it.abreEn ? fecha(it.abreEn) : null,
					cierraEn: it.cierraEn ? fecha(it.cierraEn) : null,
					publicadoEn: it.publicadoEn ? fecha(it.publicadoEn) : null,
					cerradoEn: it.cerradoEn ? fecha(it.cerradoEn) : null,
					creadoEn: fecha(it.creadoEn),
					actualizadoEn: fecha(it.actualizadoEn ?? it.creadoEn),
				})
				.onConflictDoNothing();
			anotar("eventos", 1);

			/* Los diseños del evento apuntan a estos productos, así que se
			   borran también los suyos: `on delete cascade` lo hace solo, pero
			   dejarlo dicho evita que alguien quite el cascade y no lo note. */
			await db
				.delete(e.eventoProductos)
				.where(eq(e.eventoProductos.eventoId, it.id));

			for (const p of it.productos ?? []) {
				await db
					.insert(e.eventoProductos)
					.values({
						id: opcional(p.id) ?? undefined,
						eventoId: it.id,
						productoId: p.productoId ?? p.productId,
						reglas: p.reglas ?? null,
					})
					.onConflictDoNothing();
				anotar("evento_productos", 1);
			}

			for (const p of participacionesPorEvento.get(it.id) ?? []) {
				await db
					.insert(e.eventoParticipaciones)
					.values({
						id: p.id,
						eventoId: it.id,
						participante: p.participante ?? null,
						lineas: p.lineas ?? [],
						subtotal: p.subtotal === undefined ? null : pesos(p.subtotal),
						estadoPago: opcional(p.estadoPago),
						creadoEn: fecha(p.creadaEn),
					})
					.onConflictDoNothing();
				anotar("participaciones", 1);
			}
		}

		/* Los diseños de evento van al final: apuntan a un producto del evento,
		   y ése no existe hasta que el bucle de arriba lo escribe. */
		for (const it of de("EVENT/DESIGN")) {
			await db
				.insert(e.eventoDisenos)
				.values({
					id: it.id,
					eventoId: idDe(it.pk),
					eventoProductoId: opcional(it.eventoItemId),
					ruta: opcional(it.ruta),
					expiraEn: it.expiraEn ? fecha(it.expiraEn) : null,
					creadoEn: fecha(it.creadoEn),
				})
				.onConflictDoNothing();
			anotar("evento_disenos", 1);
		}

		console.table(cuenta);
		console.log("\nLo que NO se trajo, a propósito: los ítems LOCK de slug,");
		console.log("folio, correo de taller y código de evento — ahora son UNIQUE.");
	} finally {
		await pool.end();
	}
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
