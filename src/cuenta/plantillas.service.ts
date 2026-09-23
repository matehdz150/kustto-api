import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/identidad";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { copiarArteDePedido } from "../pedidos/arte-al-carrito";
import { correoDe, idOrdenable } from "./comun";
import { PerfilService } from "./perfil.service";

type Cuerpo = Record<string, any>;

const MAX_NOMBRE = 60;
/** Una plantilla es una receta, no un catálogo. */
const MAX_ITEMS = 20;
/** Tope alto pero real: sin él, un bucle deja la cuenta inservible. */
const MAX_PLANTILLAS = 50;

/**
 * Las plantillas del comprador: la receta de un pedido que se repite.
 *
 * QUÉ RESUELVE. Una empresa pide el mismo kit de bienvenida cada vez que entra
 * alguien —playera, tote y termo, con su logo, en cantidades parecidas— y no
 * había dónde guardar ESA COMBINACIÓN. `Repetir` clona un pedido pasado tal
 * cual, que no es lo mismo: la receta se repite con otras tallas y otras
 * cantidades. Los diseños guardan el arte de UN producto; los favoritos, ids
 * sueltos. La composición no la guardaba nada.
 *
 * NO SE VALIDA CONTRA EL CATÁLOGO al guardar, igual que el carrito y los
 * favoritos. Una plantilla vive años y los productos van y vienen; rechazar el
 * guardado dejaría a alguien sin poder ni editar la suya para quitar lo que ya
 * no existe. Lo que de verdad decide —que el producto siga publicado y a qué
 * precio— se comprueba al CARGARLA y al crear el pedido.
 */
@Injectable()
export class PlantillasDeCompraService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
		private readonly perfil: PerfilService,
	) {}

	async listar(quien: Identidad) {
		correoDe(quien);

		const filas = await this.db
			.select()
			.from(e.plantillasDeCompra)
			.where(eq(e.plantillasDeCompra.compradorId, quien.sub))
			.orderBy(desc(e.plantillasDeCompra.creadoEn));

		return this.componer(filas);
	}

	async crear(quien: Identidad, cuerpo: Cuerpo) {
		correoDe(quien);

		const { nombre, items } = this.leerContenido(cuerpo);

		const cuantas = await this.listar(quien);
		if (cuantas.length >= MAX_PLANTILLAS) {
			throw new BadRequestException(
				`Ya tienes ${MAX_PLANTILLAS} plantillas. Borra alguna para guardar otra.`,
			);
		}

		await this.perfil.asegurar(quien);

		const id = idOrdenable();

		await this.db.transaction(async (tx) => {
			await tx
				.insert(e.plantillasDeCompra)
				.values({ id, compradorId: quien.sub, nombre });

			await this.escribirItems(tx, id, items);
		});

		const [salida] = await this.componer([await this.suyaOFalla(quien, id)]);
		return salida;
	}

	async actualizar(quien: Identidad, id: string, cuerpo: Cuerpo) {
		await this.suyaOFalla(quien, id);

		const { nombre, items } = this.leerContenido(cuerpo);

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.plantillasDeCompra)
				.set({ nombre, actualizadoEn: new Date() })
				.where(eq(e.plantillasDeCompra.id, id));

			/* Se reemplazan enteros: el navegador manda la plantilla completa al
			   guardar, que es como la tiene en la pantalla. */
			await tx
				.delete(e.plantillaDeCompraPartidas)
				.where(eq(e.plantillaDeCompraPartidas.plantillaId, id));

			await this.escribirItems(tx, id, items);
		});

		const [salida] = await this.componer([await this.suyaOFalla(quien, id)]);
		return salida;
	}

	/**
	 * Borra la plantilla.
	 *
	 * EL ARTE PROPIO NO SE TOCA. Vive en `medios/plantillas/<comprador>/` y
	 * puede estar referenciado por otra plantilla que se armó copiando ésta; un
	 * objeto huérfano cuesta céntimos y una plantilla muda no se deshace.
	 */
	async borrar(quien: Identidad, id: string) {
		await this.suyaOFalla(quien, id);

		await this.db
			.delete(e.plantillasDeCompra)
			.where(eq(e.plantillasDeCompra.id, id));

		return { ok: true };
	}

	/**
	 * Convierte la plantilla en artículos de carrito.
	 *
	 * NO CREA EL PEDIDO. Devuelve artículos y ahí se acaba: el pedido se sigue
	 * creando por el camino de siempre, con sus precios recalculados desde la
	 * base. Cargar una plantilla no es una segunda forma de escribir pedidos.
	 *
	 * DEVUELVE TRES LISTAS porque hay tres desenlaces distintos y cada uno se
	 * resuelve distinto:
	 *
	 *   - `articulos`: listos para el carrito.
	 *   - `porDisenar`: el producto sigue vivo pero no hay arte que copiar
	 *     —nunca lo tuvo, o el pedido de origen ya no está—. Pasa por el editor.
	 *   - `perdidos`: el producto ya no se publica. Es el único que OBLIGA a
	 *     decidir, y meterlo al carrito sólo movería el fallo al final del
	 *     checkout, que es el peor sitio.
	 *
	 * EL ARTE SE COPIA DE SERVIDOR A SERVIDOR, igual que al repetir un pedido:
	 * son varios MB que ya están en S3, y que el navegador los baje para
	 * volverlos a subir es la diferencia entre un clic y un minuto.
	 */
	async alCarrito(quien: Identidad, id: string) {
		const plantilla = await this.suyaOFalla(quien, id);
		const [conItems] = await this.componer([plantilla]);

		const articulos: Cuerpo[] = [];
		const porDisenar: Cuerpo[] = [];
		const perdidos: Cuerpo[] = [];

		const vivos = await this.productosVivos(
			conItems.items.map((i) => i.productoId),
		);

		for (const item of conItems.items) {
			const producto = vivos.get(item.productoId);

			if (!producto) {
				perdidos.push({ productoId: item.productoId, nombre: item.nombre });
				continue;
			}

			const comun = {
				productoId: item.productoId,
				nombre: item.nombre ?? producto.nombre,
				tallas: item.tallas,
			};

			/* EL ARTE PROPIO MANDA sobre el del pedido: es el que se hizo para
			   esta plantilla, y el del pedido puede ser de otra combinación. */
			const articulo = item.arteId
				? await this.deArtePropio(quien, item)
				: await this.deUnPedido(quien, item);

			if (articulo) {
				articulos.push({
					...articulo,
					...comun,
					proveedorId: producto.tallerId,
					colorPrenda: item.colorPrenda,
				});
			} else {
				porDisenar.push({
					...comun,
					porque:
						item.arteId || item.origen ? "sin_archivos" : "todavia_sin_diseno",
				});
			}
		}

		/* SE ANOTA EL USO AQUÍ y no al crear el pedido: cargarla es el momento en
		   que alguien decidió repetirla, y esperar al pedido dejaría sin contar a
		   quien la carga y luego cambia de idea en el checkout. */
		await this.db
			.update(e.plantillasDeCompra)
			.set({
				vecesPedida: plantilla.vecesPedida + 1,
				ultimaVez: new Date(),
			})
			.where(eq(e.plantillasDeCompra.id, id));

		return { articulos, porDisenar, perdidos };
	}

	/**
	 * Firma las subidas del arte de un ítem de plantilla.
	 *
	 * POR QUÉ NO SE REUTILIZA LA DEL CARRITO. Aquélla escribe en `carritos/`,
	 * que caduca a los 30 días: una plantilla armada con eso se quedaría muda
	 * al mes. Ésta escribe en `medios/plantillas/<comprador>/…`, que no caduca
	 * — y por eso va detrás de sesión, mientras la del carrito es pública.
	 *
	 * EL DESTINO LO DECIDE EL SERVIDOR. El `arteId` se genera aquí y lleva el
	 * `sub` del token delante: del cuerpo no sale ni un trozo de la ruta, así
	 * que no hay forma de escribir en la carpeta de otra persona.
	 */
	async firmarSubidas(quien: Identidad, cuerpo: Cuerpo) {
		correoDe(quien);

		const archivos = Array.isArray(cuerpo?.archivos) ? cuerpo.archivos : [];

		if (archivos.length === 0) {
			throw new BadRequestException("No dijiste qué vas a subir");
		}
		if (archivos.length > MAXIMO_ARCHIVOS) {
			throw new BadRequestException(
				`Demasiados archivos de una vez (${archivos.length}). El máximo es ${MAXIMO_ARCHIVOS}.`,
			);
		}

		const arteId = randomUUID();
		const base = `medios/plantillas/${quien.sub}/${arteId}`;

		const subidas = await Promise.all(
			archivos.map(async (a: Cuerpo) => {
				const tipo = String(a?.tipo ?? "");

				if (!(tipo in MAXIMO)) {
					throw new BadRequestException(
						`Tipo de archivo desconocido: ${tipo || "(vacío)"}. Usa ${Object.keys(MAXIMO).join(", ")}.`,
					);
				}

				const bytes = Math.trunc(Number(a?.bytes ?? 0));
				if (!(bytes > 0)) {
					throw new BadRequestException("Falta cuánto pesa el archivo");
				}
				if (bytes > MAXIMO[tipo]) {
					throw new BadRequestException(
						`Ese archivo pasa de ${Math.round(MAXIMO[tipo] / 1024 / 1024)} MB, que es el máximo`,
					);
				}

				const lado = limpio(a?.lado);
				if (tipo !== "diseno" && !lado) {
					throw new BadRequestException(
						`El archivo "${tipo}" no dice de qué lado es`,
					);
				}

				const ext = EXTENSION[tipo] ?? "png";
				const llave =
					tipo === "diseno"
						? `${base}/diseno.json`
						: `${base}/${lado}-${tipo}.${ext}`;

				const { uploadUrl, url } = await this.almacen.urlParaMedios(
					llave,
					TIPOS[tipo],
					bytes,
				);

				return { tipo, lado: lado || null, uploadUrl, url };
			}),
		);

		return { itemId: arteId, subidas };
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	/**
	 * El arte propio de la plantilla, copiado al carrito.
	 *
	 * Un id nuevo por artículo, no el de la plantilla: si dos cargas
	 * compartieran carpeta, vaciar el carrito de una borraría el arte de la
	 * otra — y `carritos/` caduca a los 30 días.
	 */
	private async deArtePropio(quien: Identidad, item: Cuerpo) {
		const carritoId = randomUUID();
		const origen = `medios/plantillas/${quien.sub}/${item.arteId}`;
		const lados: Cuerpo[] = [];

		for (const l of item.lados ?? []) {
			const lado = String(l?.lado ?? "");
			if (!lado) continue;

			/* EL ARTE DE PRODUCCIÓN ES LO ÚNICO QUE BLOQUEA: sin él no hay nada
			   que imprimir. La colocación es una referencia para el taller y el
			   lienzo sólo sirve para volver a abrirlo, así que si faltan se sigue. */
			const hay = await this.almacen.copiar(
				`${origen}/${lado}-arte.png`,
				`carritos/${carritoId}/${lado}-arte.png`,
			);
			if (!hay) continue;

			for (const extra of ["colocacion", "prenda"]) {
				await this.almacen.copiar(
					`${origen}/${lado}-${extra}.png`,
					`carritos/${carritoId}/${lado}-${extra}.png`,
				);
			}
			await this.almacen.copiar(
				`${origen}/${lado}-vector.svg`,
				`carritos/${carritoId}/${lado}-vector.svg`,
			);

			lados.push({
				lado,
				anchoPx: Math.trunc(Number(l?.anchoPx ?? 0)),
				altoPx: Math.trunc(Number(l?.altoPx ?? 0)),
				dpi: Math.trunc(Number(l?.dpi ?? 0)) || 300,
			});
		}

		if (lados.length === 0) return null;

		await this.almacen.copiar(
			`${origen}/diseno.json`,
			`carritos/${carritoId}/diseno.json`,
		);

		return { carritoId, lados, miniatura: item.miniatura };
	}

	/**
	 * El arte de la línea de pedido de donde salió.
	 *
	 * EL PEDIDO TIENE QUE SEGUIR SIENDO DE QUIEN PIDE, no sólo existir: sin
	 * esto, una plantilla con un `origen` inventado sacaría el arte de otra
	 * persona. La plantilla va por `sub` y el pedido por CORREO — son dos
	 * espacios distintos y hay que cruzarlos a mano.
	 */
	private async deUnPedido(quien: Identidad, item: Cuerpo) {
		if (!item.origen?.pedidoId || !item.origen?.lineaId) return null;

		const [suya] = await this.db
			.select({ arte: e.pedidoPartidas.arte })
			.from(e.pedidoPartidas)
			.innerJoin(e.pedidos, eq(e.pedidos.id, e.pedidoPartidas.pedidoId))
			.where(
				and(
					eq(e.pedidoPartidas.id, item.origen.lineaId),
					eq(e.pedidos.id, item.origen.pedidoId),
					eq(e.pedidos.correo, correoDe(quien)),
				),
			)
			.limit(1);

		if (!suya) return null;

		const copia = await copiarArteDePedido(
			this.almacen,
			item.origen.pedidoId,
			item.origen.lineaId,
			(suya.arte ?? []) as Cuerpo[],
		);
		if (!copia) return null;

		return { ...copia, miniatura: item.miniatura };
	}

	/**
	 * Lee lo que el cliente manda como contenido de una plantilla.
	 *
	 * SE LIMPIA CAMPO POR CAMPO en vez de guardar el cuerpo tal cual: esto se
	 * relee después para armar un carrito, y un cuerpo sin filtrar es la forma
	 * de que aparezca ahí un `precio` que nadie puso. El precio y el taller
	 * NUNCA salen de aquí: se leen del producto al cargarla, como en el
	 * checkout.
	 */
	private leerContenido(c: Cuerpo) {
		const nombre = String(c?.nombre ?? "").trim();

		if (!nombre) {
			throw new BadRequestException("Ponle un nombre para poder encontrarla");
		}
		if (nombre.length > MAX_NOMBRE) {
			throw new BadRequestException(
				`El nombre no puede pasar de ${MAX_NOMBRE} caracteres`,
			);
		}

		const crudos = Array.isArray(c?.items) ? c.items : [];

		if (crudos.length === 0) {
			throw new BadRequestException(
				"Una plantilla vacía no sirve para nada: ponle algo",
			);
		}
		if (crudos.length > MAX_ITEMS) {
			throw new BadRequestException(
				`Una plantilla no admite más de ${MAX_ITEMS} productos`,
			);
		}

		const items = crudos.map((crudo: Cuerpo, i: number) => {
			const productoId = String(crudo?.productoId ?? "").trim();
			if (!productoId) {
				throw new BadRequestException(
					`Al producto ${i + 1} le falta su identificador`,
				);
			}

			/* Los dos o ninguno: media referencia no lleva a ningún archivo. */
			const pedidoId = String(crudo?.origen?.pedidoId ?? "").trim();
			const lineaId = String(crudo?.origen?.lineaId ?? "").trim();

			if ((pedidoId || lineaId) && !(pedidoId && lineaId)) {
				throw new BadRequestException(
					`El origen del producto ${i + 1} no es válido`,
				);
			}

			const tallas = (Array.isArray(crudo?.tallas) ? crudo.tallas : [])
				.map((t: Cuerpo) => ({
					size: String(t?.size ?? "").trim(),
					piezas: Math.floor(Number(t?.piezas ?? 0)),
				}))
				.filter(
					(t: { size: string; piezas: number }) => t.size && t.piezas > 0,
				);

			if (tallas.length === 0) {
				throw new BadRequestException(
					`Al producto ${i + 1} le faltan las cantidades`,
				);
			}

			const lados = (Array.isArray(crudo?.lados) ? crudo.lados : [])
				.map((l: Cuerpo) => ({
					lado: String(l?.lado ?? "").trim(),
					anchoPx: Math.trunc(Number(l?.anchoPx ?? 0)),
					altoPx: Math.trunc(Number(l?.altoPx ?? 0)),
					dpi: Math.trunc(Number(l?.dpi ?? 0)) || 300,
				}))
				.filter((l: { lado: string }) => l.lado);

			const arteId = String(crudo?.itemId ?? "").trim();
			const conArtePropio = Boolean(arteId) && lados.length > 0;

			return {
				productoId,
				arteId: conArtePropio ? arteId : null,
				lados: conArtePropio ? lados : [],
				origenPedidoId: pedidoId || null,
				origenPartidaId: lineaId || null,
				miniatura: String(crudo?.miniatura ?? "").trim() || null,
				color: String(crudo?.colorPrenda ?? "").trim() || null,
				nombre:
					String(crudo?.nombre ?? "")
						.trim()
						.slice(0, 120) || null,
				tallas,
			};
		});

		return { nombre, items };
	}

	private async escribirItems(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		plantillaId: string,
		items: ReturnType<PlantillasDeCompraService["leerContenido"]>["items"],
	) {
		for (const [orden, item] of items.entries()) {
			const [existe] = await tx
				.select({ id: e.productos.id })
				.from(e.productos)
				.where(eq(e.productos.id, item.productoId))
				.limit(1);

			/* Un producto borrado del catálogo se cae de la plantilla en silencio,
			   igual que del carrito: la clave foránea no perdona, y rechazar el
			   guardado entero dejaría a alguien sin poder editar la suya. */
			if (!existe) continue;

			const [partida] = await tx
				.insert(e.plantillaDeCompraPartidas)
				.values({
					plantillaId,
					productoId: item.productoId,
					arteId: item.arteId,
					lados: item.lados,
					/* El origen sólo se guarda si el pedido y la partida existen de
					   verdad: son claves foráneas, y una referencia inventada
					   reventaría la escritura con un error de base de datos. */
					origenPedidoId: await this.siExiste(
						tx,
						e.pedidos,
						item.origenPedidoId,
					),
					origenPartidaId: await this.siExiste(
						tx,
						e.pedidoPartidas,
						item.origenPartidaId,
					),
					miniatura: item.miniatura,
					color: item.color,
					nombre: item.nombre,
					orden,
				})
				.returning({ id: e.plantillaDeCompraPartidas.id });

			for (const t of item.tallas) {
				await tx
					.insert(e.plantillaDeCompraTallas)
					.values({ partidaId: partida.id, talla: t.size, piezas: t.piezas })
					.onConflictDoNothing();
			}
		}
	}

	private async siExiste(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		tabla: typeof e.pedidos | typeof e.pedidoPartidas,
		id: string | null,
	) {
		if (!id) return null;

		const [fila] = await tx
			.select({ id: tabla.id })
			.from(tabla)
			.where(eq(tabla.id, id))
			.limit(1);

		return fila ? id : null;
	}

	private async productosVivos(ids: string[]) {
		const unicos = [...new Set(ids)];
		if (unicos.length === 0)
			return new Map<string, { tallerId: string; nombre: string }>();

		const filas = await this.db
			.select({
				id: e.productos.id,
				tallerId: e.productos.tallerId,
				nombre: e.productos.nombre,
			})
			.from(e.productos)
			.where(
				and(inArray(e.productos.id, unicos), eq(e.productos.estado, "activo")),
			);

		return new Map(
			filas.map((p) => [p.id, { tallerId: p.tallerId, nombre: p.nombre }]),
		);
	}

	private async suyaOFalla(quien: Identidad, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.plantillasDeCompra)
			.where(
				and(
					eq(e.plantillasDeCompra.id, id),
					eq(e.plantillasDeCompra.compradorId, quien.sub),
				),
			)
			.limit(1);

		if (!fila) throw new NotFoundException("No encontramos esa plantilla");
		return fila;
	}

	private async componer(filas: (typeof e.plantillasDeCompra.$inferSelect)[]) {
		if (filas.length === 0) return [];

		const ids = filas.map((p) => p.id);

		const partidas = await this.db
			.select()
			.from(e.plantillaDeCompraPartidas)
			.where(inArray(e.plantillaDeCompraPartidas.plantillaId, ids))
			.orderBy(asc(e.plantillaDeCompraPartidas.orden));

		const tallas = partidas.length
			? await this.db
					.select()
					.from(e.plantillaDeCompraTallas)
					.where(
						inArray(
							e.plantillaDeCompraTallas.partidaId,
							partidas.map((p) => p.id),
						),
					)
			: [];

		return filas.map((p) => ({
			id: p.id,
			nombre: p.nombre,
			vecesPedida: p.vecesPedida,
			ultimaVez: p.ultimaVez?.toISOString() ?? null,
			creadaEn: p.creadoEn.toISOString(),
			actualizadaEn: p.actualizadoEn.toISOString(),
			items: partidas
				.filter((x) => x.plantillaId === p.id)
				.map((x) => ({
					productoId: x.productoId,
					arteId: x.arteId,
					/* `itemId` es el nombre que el front ya lee. */
					itemId: x.arteId,
					lados: x.lados,
					origen: x.origenPedidoId
						? { pedidoId: x.origenPedidoId, lineaId: x.origenPartidaId }
						: null,
					miniatura: x.miniatura,
					colorPrenda: x.color,
					nombre: x.nombre,
					tallas: tallas
						.filter((t) => t.partidaId === x.id)
						.map((t) => ({ size: t.talla, piezas: t.piezas })),
				})),
		}));
	}
}

const TIPOS: Record<string, string> = {
	arte: "image/png",
	colocacion: "image/png",
	/** La prenda real con el diseño encima, si el taller subió la foto. */
	prenda: "image/png",
	/**
	 * El MISMO arte en trazos, para las técnicas que no imprimen.
	 *
	 * Es un tipo APARTE y no un `arte` con otra extensión: cambiarle el nombre
	 * al archivo de siempre movería la ruta de todo lo que ya existe.
	 */
	vector: "image/svg+xml",
	diseno: "application/json",
};

/** Con qué extensión se guarda cada uno. Todo era `.png` hasta que entró el láser. */
const EXTENSION: Record<string, string> = { vector: "svg", diseno: "json" };

/** Un arte de producción son varios MB; el resto, mucho menos. */
const MAXIMO: Record<string, number> = {
	arte: 25 * 1024 * 1024,
	/* Un SVG es texto y pesa poco… salvo si alguien vectorizó una foto y trae
	   cuarenta mil trazos. Ahí el tope es la defensa. */
	vector: 12 * 1024 * 1024,
	colocacion: 8 * 1024 * 1024,
	prenda: 8 * 1024 * 1024,
	diseno: 4 * 1024 * 1024,
};

/* Tres archivos por lado más el diseño. Con seis lados son diecinueve; se deja
   en dieciséis, que cubre los cuatro lados que hoy declara cualquier producto
   y sigue sin permitir subir un álbum. */
const MAXIMO_ARCHIVOS = 16;

const limpio = (v: unknown) =>
	String(v ?? "")
		.replace(/[^a-zA-Z0-9-_]/g, "")
		.slice(0, 30);
