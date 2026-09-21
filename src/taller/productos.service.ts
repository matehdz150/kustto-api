import { randomBytes } from "node:crypto";
import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { claveDeVariante } from "../pedidos/lineas";
import {
	validarFotosReales,
	validarRecargos,
	validarTecnicas,
} from "./validacion";

type Cuerpo = Record<string, any>;
type Estado = (typeof e.estadoProducto.enumValues)[number];

/**
 * Los productos del taller: los escribe él, los revisa el admin.
 *
 * Los campos entran y salen en INGLÉS (`name`, `printSides`, `pricing`) porque
 * es lo que el asistente de alta ya manda. Ver el comentario de `Ficha`.
 */
@Injectable()
export class ProductosTallerService {
	constructor(@Inject(DB) private readonly db: Db) {}

	async listar(tallerId: string) {
		const filas = await this.db
			.select()
			.from(e.productos)
			.where(
				and(
					eq(e.productos.tallerId, tallerId),
					/* Lo archivado desaparece de su lista: sale del catálogo y ya no
					   se puede editar, así que sólo estorbaría. La fila sigue ahí para
					   que "repetir pedido" pueda decir CUÁL se cayó. */
					sql`${e.productos.estado} <> 'archivado'`,
				),
			)
			.orderBy(desc(e.productos.creadoEn));

		return this.componer(filas);
	}

	async obtener(tallerId: string, id: string) {
		const producto = await this.suyoOFalla(tallerId, id);
		const [salida] = await this.componer([producto]);
		return salida;
	}

	/**
	 * Alta.
	 *
	 * EL TALLER DECIDE SI LO MANDA A REVISAR O LO DEJA A MEDIAS; lo que no
	 * puede es publicarlo. `activo` sólo lo pone el admin, y eso es lo que
	 * significa la aprobación.
	 */
	async crear(tallerId: string, cuerpo: Cuerpo) {
		const datos = this.validar(cuerpo);
		const estado: Estado = cuerpo.enviar === true ? "en_revision" : "borrador";

		const id = await this.db.transaction(async (tx) => {
			const [producto] = await tx
				.insert(e.productos)
				.values({
					tallerId,
					...datos.producto,
					slug: await this.slugLibre(tx, datos.slugBase),
					estado,
				})
				.returning({ id: e.productos.id });

			await this.escribirPiezas(tx, producto.id, datos, { completo: true });
			return producto.id;
		});

		return this.obtener(tallerId, id);
	}

	/**
	 * Edición.
	 *
	 * UN PRODUCTO ACTIVO VUELVE A REVISIÓN al tocarlo. Es la regla que impide
	 * publicar algo inocuo, esperar el visto bueno y luego cambiarlo por otra
	 * cosa. Lo que NO pasa por aquí son las existencias: ver `moverExistencias`.
	 */
	async actualizar(tallerId: string, id: string, cuerpo: Cuerpo) {
		const previo = await this.suyoOFalla(tallerId, id);
		const datos = this.validar(cuerpo, previo);

		const estado: Estado =
			previo.estado === "activo" || cuerpo.enviar === true
				? "en_revision"
				: previo.estado;

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.productos)
				.set({ ...datos.producto, estado, actualizadoEn: new Date() })
				.where(eq(e.productos.id, id));

			await this.escribirPiezas(tx, id, datos, { completo: false });
		});

		return this.obtener(tallerId, id);
	}

	/**
	 * Quitar un producto. SON DOS COSAS DISTINTAS según dónde esté.
	 *
	 * UN BORRADOR SE BORRA DE VERDAD. Nunca estuvo en el catálogo, así que no
	 * puede haber un pedido, un carrito, un favorito ni una plantilla
	 * apuntándole. Y no se vuelve a `borrador`: `actualizar` conserva el estado
	 * o manda a revisión, y el admin sólo pone `activo`, `rechazado` o
	 * `archivado`. O sea que "está en borrador" es exactamente "nunca se
	 * publicó".
	 *
	 * TODO LO DEMÁS SE ARCHIVA. Sale del catálogo igual y desaparece de la
	 * lista del taller, pero la fila se queda: el pedido guarda el nombre y la
	 * foto de cuando se hizo, pero "volver a pedir" lee el producto de HOY para
	 * poder decir cuál de las líneas se cayó. Sin la fila, esa pantalla pierde
	 * el nombre y enseña un hueco.
	 *
	 * LAS FOTOS NO SE TOCAN. Viven en `medios/productos/<taller>/` y las
	 * referencia el histórico de pedidos: un objeto huérfano cuesta céntimos, y
	 * una miniatura rota en un pedido de hace tres meses no se puede deshacer.
	 */
	async borrar(tallerId: string, id: string) {
		const previo = await this.suyoOFalla(tallerId, id);

		if (previo.estado !== "borrador") {
			await this.db
				.update(e.productos)
				.set({ estado: "archivado", actualizadoEn: new Date() })
				.where(eq(e.productos.id, id));

			return { id, estado: "archivado" as const };
		}

		/* El slug se suelta solo: era un ítem-candado en DynamoDB y aquí es un
		   índice único sobre la fila que se está borrando. */
		await this.db.delete(e.productos).where(eq(e.productos.id, id));
		return { id, estado: "borrado" as const };
	}

	/**
	 * Mueve las existencias de UNA variante. Nada más.
	 *
	 * ENDPOINT APARTE DE `actualizar` por dos razones, y las dos importan:
	 *
	 * 1. `actualizar` devuelve a revisión cualquier producto activo. Es
	 *    correcto para el contenido, pero un blanco más en la bodega no es
	 *    contenido: nadie tiene que aprobar cuántas playeras negras hay.
	 *    Pasando el inventario por ahí, el taller se despublica al corregir su
	 *    conteo.
	 *
	 * 2. EL DELTA LO APLICA LA BASE, no el navegador. Si el cliente leyera,
	 *    sumara y reescribiera, un pedido que descuente en ese hueco se
	 *    perdería: lo que llega pisa el descuento. Aquí la suma es atómica, así
	 *    que el pedido y el ajuste se respetan pase lo que pase con el orden.
	 *
	 * `corregir` SÍ es una escritura absoluta, y ahí la carrera es inevitable:
	 * es lo que significa "cuéntalos otra vez, hay 14". El último que cuenta
	 * manda, que es justo lo que espera quien acaba de contar.
	 */
	async moverExistencias(tallerId: string, id: string, cuerpo: Cuerpo) {
		await this.suyoOFalla(tallerId, id);

		const clave = String(cuerpo.clave ?? "").trim();
		if (!clave) throw new BadRequestException("Falta la variante");

		const operacion = String(cuerpo.operacion ?? "");
		if (!["agregar", "quitar", "corregir"].includes(operacion)) {
			throw new BadRequestException(
				"La operación tiene que ser agregar, quitar o corregir",
			);
		}

		const cantidad = Math.trunc(Number(cuerpo.cantidad));
		if (!Number.isFinite(cantidad)) {
			throw new BadRequestException("La cantidad no es un número");
		}

		/* Agregar y quitar llevan el signo en la operación: un "agregar -5" sería
		   un "quitar 5" disfrazado, y el aviso diría lo contrario de lo que pasó. */
		if (operacion !== "corregir" && cantidad <= 0) {
			throw new BadRequestException("La cantidad tiene que ser mayor que cero");
		}

		/* SÓLO VARIANTES QUE EXISTEN HOY. Sin esto, un color borrado ayer podría
		   resucitar como una fila suelta que nadie ve ni vuelve a tocar. */
		const variantes = await this.db
			.select()
			.from(e.productoExistencias)
			.where(eq(e.productoExistencias.productoId, id));

		const suya = variantes.find(
			(v) => claveDeVariante(v.color, v.talla) === clave,
		);

		if (!suya) {
			throw new NotFoundException(
				`La variante "${clave}" no está en este producto`,
			);
		}

		await this.db
			.update(e.productoExistencias)
			.set({
				cantidad:
					operacion === "corregir"
						? cantidad
						: sql`${e.productoExistencias.cantidad} + ${operacion === "quitar" ? -cantidad : cantidad}`,
			})
			.where(eq(e.productoExistencias.id, suya.id));

		/* Se devuelve el producto entero para que la pantalla repinte con lo que
		   quedó de verdad, no con lo que el navegador creía que iba a quedar. */
		return this.obtener(tallerId, id);
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	/**
	 * Trae el producto sólo si es de quien lo pide.
	 *
	 * 404 y no 403 a propósito: un 403 le confirmaría a un taller que cierto id
	 * existe y es de otro.
	 */
	private async suyoOFalla(tallerId: string, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.productos)
			.where(and(eq(e.productos.id, id), eq(e.productos.tallerId, tallerId)))
			.limit(1);

		if (!fila) {
			throw new NotFoundException("Ese producto no existe o no es tuyo");
		}

		return fila;
	}

	/**
	 * Valida y reparte el cuerpo entre la fila y sus tablas hijas.
	 *
	 * Al EDITAR se mezcla con lo previo antes de validar: el asistente manda
	 * sólo lo que cambió, y validar un trozo suelto rechazaría cosas que están
	 * bien en el conjunto.
	 */
	private validar(cuerpo: Cuerpo, previo?: typeof e.productos.$inferSelect) {
		const nombre = String(cuerpo.name ?? previo?.nombre ?? "").trim();
		if (!nombre) throw new BadRequestException("Falta el nombre del producto");

		const lados = Array.isArray(cuerpo.printSides) ? cuerpo.printSides : [];
		validarTecnicas(lados);
		validarRecargos(lados);

		const fotos =
			cuerpo.fotosReales === undefined
				? undefined
				: validarFotosReales(cuerpo.fotosReales);

		return {
			slugBase: nombre,
			producto: {
				nombre,
				...(cuerpo.internalName !== undefined
					? { nombreInterno: String(cuerpo.internalName).trim() || null }
					: {}),
				...(cuerpo.sku !== undefined
					? { sku: String(cuerpo.sku).trim() || null }
					: {}),
				...(cuerpo.description !== undefined
					? { descripcion: String(cuerpo.description).trim() || null }
					: {}),
				...(cuerpo.templateId !== undefined
					? { plantillaId: String(cuerpo.templateId).trim() || null }
					: {}),
				...(cuerpo.isCustomizable !== undefined
					? { personalizable: cuerpo.isCustomizable !== false }
					: {}),
				...(cuerpo.minimoAlerta !== undefined
					? { minimoAlerta: numeroONulo(cuerpo.minimoAlerta) }
					: {}),
				...(cuerpo.diasExtraSinStock !== undefined
					? { diasExtraSinStock: numeroONulo(cuerpo.diasExtraSinStock) }
					: {}),
				...(cuerpo.caja !== undefined ? { caja: cuerpo.caja ?? null } : {}),
				...(cuerpo.customizationRules !== undefined
					? { reglasPersonalizacion: cuerpo.customizationRules ?? null }
					: {}),
				...(cuerpo.templateSides !== undefined
					? { ladosDePlantilla: cuerpo.templateSides ?? null }
					: {}),
			},
			hijas: {
				categoryIds: cuerpo.categoryIds as string[] | undefined,
				images: cuerpo.images as Cuerpo[] | undefined,
				colors: cuerpo.colors as Cuerpo[] | undefined,
				sizes: cuerpo.sizes as Cuerpo[] | undefined,
				pesoPorTalla: cuerpo.pesoPorTalla as Record<string, number> | undefined,
				printSides: cuerpo.printSides as Cuerpo[] | undefined,
				pricing: cuerpo.pricing as Cuerpo | undefined,
				production: cuerpo.production as Cuerpo | undefined,
				existencias: cuerpo.existencias as Record<string, number> | undefined,
				fotosReales: fotos,
			},
		};
	}

	/**
	 * Escribe las tablas hijas.
	 *
	 * SE REEMPLAZAN ENTERAS cuando vienen, y se dejan como están cuando no: el
	 * asistente manda la lista completa de cada cosa que toca.
	 *
	 * LAS EXISTENCIAS SON LA EXCEPCIÓN. Al EDITAR no se reemplazan aunque
	 * vengan: el cuerpo del asistente trae el mapa que leyó al abrir la
	 * pantalla, y escribirlo pisaría los descuentos de los pedidos que hayan
	 * entrado mientras tanto. Se mueven sólo por `moverExistencias`, y aquí
	 * sólo se CREAN las variantes nuevas —en cero— para que existan.
	 */
	private async escribirPiezas(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		productoId: string,
		datos: ReturnType<ProductosTallerService["validar"]>,
		opciones: { completo: boolean },
	) {
		const h = datos.hijas;

		if (h.categoryIds) {
			await tx
				.delete(e.productoCategorias)
				.where(eq(e.productoCategorias.productoId, productoId));

			for (const categoriaId of h.categoryIds) {
				await tx
					.insert(e.productoCategorias)
					.values({ productoId, categoriaId })
					.onConflictDoNothing();
			}
		}

		if (h.images) {
			await tx
				.delete(e.productoImagenes)
				.where(eq(e.productoImagenes.productoId, productoId));

			for (const [orden, img] of h.images.entries()) {
				if (!img?.url) continue;
				await tx.insert(e.productoImagenes).values({
					productoId,
					url: String(img.url),
					orden: img.order ?? orden,
				});
			}
		}

		if (h.colors) {
			await tx
				.delete(e.productoColores)
				.where(eq(e.productoColores.productoId, productoId));

			for (const c of h.colors) {
				if (!c?.name) continue;
				await tx
					.insert(e.productoColores)
					.values({
						productoId,
						nombre: String(c.name),
						hex: c.hex ? String(c.hex) : null,
					})
					.onConflictDoNothing();
			}
		}

		if (h.sizes) {
			await tx
				.delete(e.productoTallas)
				.where(eq(e.productoTallas.productoId, productoId));

			for (const [orden, t] of h.sizes.entries()) {
				if (!t?.size) continue;
				await tx
					.insert(e.productoTallas)
					.values({
						productoId,
						talla: String(t.size),
						anchoIn: numeroONulo(t.widthIn),
						largoIn: numeroONulo(t.lengthIn),
						/* El peso vive fuera de `sizes`, en su propio mapa por talla: el
						   color no cambia lo que pesa una prenda. */
						pesoG: numeroONulo(h.pesoPorTalla?.[String(t.size)] ?? t.pesoG),
						orden,
					})
					.onConflictDoNothing();
			}
		}

		if (h.printSides) {
			await tx
				.delete(e.productoLados)
				.where(eq(e.productoLados.productoId, productoId));

			for (const l of h.printSides) {
				if (!l?.sideKey) continue;
				await tx
					.insert(e.productoLados)
					.values({
						productoId,
						clave: String(l.sideKey),
						anchoCm: Number(l.widthCm ?? 28),
						altoCm: Number(l.heightCm ?? 35),
						dpi: Math.trunc(Number(l.dpi ?? 300)),
						sangradoCm: Number(l.sangradoCm ?? 0),
						tecnica: l.tecnica ? String(l.tecnica) : null,
						recargo:
							l.recargo === undefined || l.recargo === null || l.recargo === ""
								? null
								: Number(l.recargo).toFixed(2),
						activo: l.enabled !== false,
					})
					.onConflictDoNothing();
			}
		}

		if (h.pricing) {
			const valores = {
				precioBase: Number(h.pricing.basePrice ?? 0).toFixed(2),
				precioPorLado:
					h.pricing.perSidePrice === undefined ||
					h.pricing.perSidePrice === null
						? null
						: Number(h.pricing.perSidePrice).toFixed(2),
			};

			await tx
				.insert(e.productoPrecios)
				.values({ productoId, ...valores })
				.onConflictDoUpdate({
					target: e.productoPrecios.productoId,
					set: valores,
				});
		}

		if (h.production) {
			const valores = {
				dias: numeroONulo(h.production.meta?.diasProduccion),
				minimoPiezas: numeroONulo(h.production.meta?.minimoPiezas),
			};

			await tx
				.insert(e.productoProduccion)
				.values({ productoId, ...valores })
				.onConflictDoUpdate({
					target: e.productoProduccion.productoId,
					set: valores,
				});
		}

		/* Las variantes que el alta declara. Al editar sólo se CREAN las que
		   falten; ver el comentario del método. */
		if (h.existencias) {
			for (const [clave, cantidad] of Object.entries(h.existencias)) {
				const partes = clave.split("|");
				const color = partes.length > 1 ? partes[0] : null;
				const talla = partes.length > 1 ? partes.slice(1).join("|") : partes[0];

				await tx.execute(sql`
					insert into producto_existencias (producto_id, color, talla, cantidad)
					values (${productoId}, ${color}, ${talla}, ${opciones.completo ? Number(cantidad) || 0 : 0})
					on conflict (producto_id, coalesce(color, ''), talla) do nothing
				`);
			}
		}

		if (h.fotosReales) {
			await tx
				.delete(e.productoFotosReales)
				.where(eq(e.productoFotosReales.productoId, productoId));

			for (const [orden, f] of h.fotosReales.entries()) {
				await tx.insert(e.productoFotosReales).values({
					productoId,
					lado: f.lado,
					color: f.color,
					url: f.url,
					esquinas: f.esquinas,
					banda: f.banda,
					orden,
				});
			}
		}
	}

	/**
	 * Un slug que no choque.
	 *
	 * Dos talleres pueden llamarle igual a su playera negra, y rechazar el alta
	 * por eso sería absurdo: si está tomado se reintenta con un sufijo corto.
	 */
	private async slugLibre(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		nombre: string,
	) {
		const base =
			nombre
				.normalize("NFD")
				.replace(/[̀-ͯ]/g, "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") || "producto";

		for (const slug of [
			base,
			`${base}-${randomBytes(2).toString("hex")}`,
			`${base}-${randomBytes(3).toString("hex")}`,
		]) {
			const [choca] = await tx
				.select({ id: e.productos.id })
				.from(e.productos)
				.where(eq(e.productos.slug, slug))
				.limit(1);

			if (!choca) return slug;
		}

		throw new BadRequestException(
			"No pudimos generarle una dirección única. Cámbiale el nombre.",
		);
	}

	/** El producto con sus piezas, en la forma que el panel ya lee. */
	private async componer(filas: (typeof e.productos.$inferSelect)[]) {
		if (filas.length === 0) return [];

		const ids = filas.map((p) => p.id);

		const [
			imagenes,
			colores,
			tallas,
			lados,
			precios,
			produccion,
			cats,
			exist,
			fotos,
		] = await Promise.all([
			this.db
				.select()
				.from(e.productoImagenes)
				.where(inArray(e.productoImagenes.productoId, ids))
				.orderBy(asc(e.productoImagenes.orden)),
			this.db
				.select()
				.from(e.productoColores)
				.where(inArray(e.productoColores.productoId, ids)),
			this.db
				.select()
				.from(e.productoTallas)
				.where(inArray(e.productoTallas.productoId, ids))
				.orderBy(asc(e.productoTallas.orden)),
			this.db
				.select()
				.from(e.productoLados)
				.where(inArray(e.productoLados.productoId, ids)),
			this.db
				.select()
				.from(e.productoPrecios)
				.where(inArray(e.productoPrecios.productoId, ids)),
			this.db
				.select()
				.from(e.productoProduccion)
				.where(inArray(e.productoProduccion.productoId, ids)),
			this.db
				.select()
				.from(e.productoCategorias)
				.where(inArray(e.productoCategorias.productoId, ids)),
			this.db
				.select()
				.from(e.productoExistencias)
				.where(inArray(e.productoExistencias.productoId, ids)),
			this.db
				.select()
				.from(e.productoFotosReales)
				.where(inArray(e.productoFotosReales.productoId, ids))
				.orderBy(asc(e.productoFotosReales.orden)),
		]);

		return filas.map((p) => {
			const precio = precios.find((x) => x.productoId === p.id);
			const prod = produccion.find((x) => x.productoId === p.id);
			const suyas = tallas.filter((t) => t.productoId === p.id);

			return {
				id: p.id,
				name: p.nombre,
				internalName: p.nombreInterno,
				sku: p.sku,
				slug: p.slug,
				description: p.descripcion,
				estado: p.estado,
				notaRevision: p.notaRevision,
				templateId: p.plantillaId,
				isCustomizable: p.personalizable,
				minimoAlerta: p.minimoAlerta,
				diasExtraSinStock: p.diasExtraSinStock,
				caja: p.caja,
				customizationRules: p.reglasPersonalizacion,
				templateSides: p.ladosDePlantilla,
				proveedorId: p.tallerId,
				categoryIds: cats
					.filter((c) => c.productoId === p.id)
					.map((c) => c.categoriaId),
				images: imagenes
					.filter((i) => i.productoId === p.id)
					.map((i) => ({ url: i.url, order: i.orden })),
				colors: colores
					.filter((c) => c.productoId === p.id)
					.map((c) => ({ name: c.nombre, hex: c.hex })),
				sizes: suyas.map((t) => ({
					size: t.talla,
					widthIn: t.anchoIn,
					lengthIn: t.largoIn,
				})),
				/* El mapa por talla, como lo espera el asistente. Ver el comentario
				   de `producto_tallas`: el peso va por talla y no por variante. */
				pesoPorTalla: Object.fromEntries(
					suyas.filter((t) => t.pesoG !== null).map((t) => [t.talla, t.pesoG]),
				),
				printSides: lados
					.filter((l) => l.productoId === p.id)
					.map((l) => ({
						sideKey: l.clave,
						widthCm: l.anchoCm,
						heightCm: l.altoCm,
						dpi: l.dpi,
						sangradoCm: l.sangradoCm,
						enabled: l.activo,
						...(l.tecnica ? { tecnica: l.tecnica } : {}),
						...(l.recargo === null ? {} : { recargo: Number(l.recargo) }),
					})),
				pricing: precio
					? {
							basePrice: Number(precio.precioBase),
							...(precio.precioPorLado
								? { perSidePrice: Number(precio.precioPorLado) }
								: {}),
						}
					: null,
				production: prod?.dias ? { meta: { diasProduccion: prod.dias } } : null,
				existencias: Object.fromEntries(
					exist
						.filter((x) => x.productoId === p.id)
						.map((x) => [claveDeVariante(x.color, x.talla), x.cantidad]),
				),
				fotosReales: fotos
					.filter((f) => f.productoId === p.id)
					.map((f) => ({
						lado: f.lado,
						color: f.color,
						url: f.url,
						...(f.esquinas ? { esquinas: f.esquinas } : {}),
						...(f.banda ? { banda: f.banda } : {}),
					})),
				createdAt: p.creadoEn.toISOString(),
				updatedAt: p.actualizadoEn.toISOString(),
			};
		});
	}
}

function numeroONulo(v: unknown) {
	if (v === undefined || v === null || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}
