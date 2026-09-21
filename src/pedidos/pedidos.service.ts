import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AvisosService } from "../avisos/avisos.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { EnviosService } from "../envios/envios.service";
import { ajustarExistencias } from "./existencias";
import {
	aNumeric,
	aPesos,
	CORREO,
	digitos,
	type Entrega,
	huella,
	leerEntrega,
	tokenValido,
} from "./dominio";
import {
	aPartida,
	claveDeVariante,
	type Partida,
	type ProductoParaPedir,
} from "./lineas";
import { paraComprador } from "./vistas";

/** Cuántas veces se reintenta el folio antes de rendirse. Ver `escribirCompra`. */
const INTENTOS_DE_FOLIO = 6;

@Injectable()
export class PedidosService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly envios: EnviosService,
		private readonly avisos: AvisosService,
	) {}

	/**
	 * El checkout. LA ÚNICA RUTA PÚBLICA QUE ESCRIBE.
	 *
	 * Quien pide no tiene sesión —la cuenta es opcional a propósito— así que
	 * todo lo que llega es sospechoso: nada de lo que decide el precio o el
	 * destinatario sale del cuerpo. El producto se lee de la base y de ahí
	 * salen el taller y el importe; el precio del envío sale de la cotización
	 * guardada.
	 */
	async crear(cuerpo: Record<string, any>) {
		const comprador = this.leerComprador(cuerpo);
		const lineas = Array.isArray(cuerpo.lineas) ? cuerpo.lineas : [];

		if (lineas.length === 0) throw new BadRequestException("El pedido va vacío");

		const productos = await this.leerProductosPublicados(
			lineas.map((l: any) => String(l?.productoId ?? "")),
		);

		/* ─── El reparto por taller ─────────────────────────────────────────
		 *
		 * UNA COMPRA, y por dentro un pedido por taller. No es un pedido con
		 * líneas de varios: el taller produce, cobra y envía lo suyo, y su
		 * estado es suyo. Con un pedido compartido, "en producción" dejaría de
		 * significar algo.
		 */
		const grupos = new Map<string, number[]>();
		productos.forEach((producto, i) => {
			grupos.set(producto.tallerId, [...(grupos.get(producto.tallerId) ?? []), i]);
		});

		const entregas = await this.entregasPorTaller(cuerpo, [...grupos.keys()]);

		/* El token de seguimiento NO se guarda: se guarda su huella. Si alguien
		   llega a leer la base, no se lleva los enlaces de seguimiento de nadie.
		   Es UNO para toda la compra y cada pedido guarda la misma, así que el
		   enlace del correo abre la compra entera y también una parte suelta. */
		const token = randomBytes(24).toString("base64url");
		const huellaDeToken = huella(token);

		const partes = [...grupos.entries()].map(([tallerId, indices]) => {
			const pedidoId = randomUUID();
			const { entrega, envio } = entregas.get(tallerId)!;

			/* El índice ORIGINAL de la línea viaja con ella: es lo que empareja
			   las subidas del arte con lo que mandó el navegador, y al repartir
			   por taller el orden deja de coincidir. */
			const detalladas = indices.map((i) => ({
				indice: i,
				partida: aPartida(lineas[i], productos[i], pedidoId),
			}));

			const suyas = detalladas.map((d) => d.partida);
			const productosTotal = aPesos(
				suyas.reduce((suma, p) => suma + p.importe, 0),
			);

			return {
				tallerId,
				pedidoId,
				detalladas,
				entrega,
				envio,
				productosTotal,
				total: aPesos(productosTotal + (envio?.precio ?? 0)),
				piezas: suyas.reduce((n, p) => n + p.piezas, 0),
			};
		});

		const productosTotal = aPesos(
			partes.reduce((suma, p) => suma + p.productosTotal, 0),
		);
		/* Cada parte lleva su envío, así que el total de la compra los suma
		   todos. Con un solo envío global esto sería el de antes. */
		const enviosTotal = [...entregas.values()].reduce(
			(suma, x) => suma + (x.envio?.precio ?? 0),
			0,
		);

		const { compraId, folio, folios } = await this.escribirCompra({
			comprador,
			partes,
			productosTotal,
			total: aPesos(productosTotal + enviosTotal),
			piezas: partes.reduce((n, p) => n + p.piezas, 0),
			huellaDeToken,
			entregaComun: this.entregaComun([...entregas.values()]),
		});

		/* Todo lo que sigue va DESPUÉS de escribir y no puede tumbar nada: la
		   compra ya existe. Un aviso en vivo por taller, cada uno por su canal. */
		for (const parte of partes) {
			await this.avisos.alTaller(parte.tallerId, {
				tipo: "pedido-nuevo",
				pedidoId: parte.pedidoId,
				folio: folios[parte.pedidoId],
			});
		}

		return {
			/** El id de la COMPRA: es lo que abre el enlace de seguimiento. */
			id: compraId,
			folio,
			token,
			total: aPesos(productosTotal + enviosTotal),
			/** Qué se creó por dentro, por si quien llama quiere enseñarlo. */
			pedidos: partes.map((parte) => ({
				id: parte.pedidoId,
				folio: folios[parte.pedidoId],
				proveedorId: parte.tallerId,
			})),
			/**
			 * Las líneas con su índice ORIGINAL, para que el navegador sepa a qué
			 * partida subir cada archivo.
			 *
			 * El índice NO es la posición en este arreglo: es la que traía la línea
			 * en lo que se mandó. Al repartir por taller el orden cambia, y
			 * emparejar por posición subiría el arte de una línea a la ruta de otra.
			 */
			partidas: partes.flatMap((parte) =>
				parte.detalladas.map((d) => ({
					indice: d.indice,
					pedidoId: parte.pedidoId,
					partidaId: d.partida.id,
					disenoRuta: d.partida.disenoRuta,
					arte: d.partida.arte,
				})),
			),
		};
	}

	/**
	 * El pedido —o la compra— para quien trae el enlace de seguimiento.
	 *
	 * EL MISMO ENLACE SIRVE PARA LAS DOS COSAS. El correo lleva el id de la
	 * COMPRA, pero los enlaces que ya circulan traen el de un pedido. Se busca
	 * primero el pedido porque es el caso viejo y el más común.
	 */
	async seguimiento(id: string, token: string | undefined) {
		if (!token) {
			throw new UnauthorizedException("Falta el enlace de seguimiento");
		}

		const pedido = await this.leerPedido(id);

		if (pedido) {
			if (!tokenValido(pedido.huellaDeToken, token)) {
				throw new UnauthorizedException("Ese enlace de seguimiento no es válido");
			}
			return paraComprador(pedido);
		}

		const [compra] = await this.db
			.select()
			.from(e.compras)
			.where(eq(e.compras.id, id))
			.limit(1);

		if (!compra) throw new NotFoundException("No encontramos ese pedido");

		if (!tokenValido(compra.huellaDeToken, token)) {
			throw new UnauthorizedException("Ese enlace de seguimiento no es válido");
		}

		const partes = await this.leerPedidosDeCompra(compra.id);

		/* Con UNA sola parte se devuelve la parte tal cual, con el folio de la
		   compra al lado: es lo que ve casi todo el mundo hoy, y así la pantalla
		   de seguimiento no tiene que saber que existen las compras hasta que de
		   verdad haya varias. */
		if (partes.length === 1) {
			return {
				...paraComprador(partes[0]),
				compra: { id: compra.id, folio: compra.folio },
			};
		}

		return {
			id: compra.id,
			folio: compra.folio,
			esCompra: true,
			comprador: {
				nombre: compra.nombre,
				email: compra.correo,
				whatsapp: compra.whatsapp,
			},
			entrega: {
				metodo: compra.metodoEntrega,
				direccion: compra.direccion,
			},
			total: Number(compra.total),
			piezas: compra.piezas,
			createdAt: compra.creadoEn.toISOString(),
			partes: partes.map(paraComprador),
		};
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	private leerComprador(c: Record<string, any>) {
		const comprador = {
			nombre: String(c.comprador?.nombre ?? "").trim(),
			email: String(c.comprador?.email ?? "").trim().toLowerCase(),
			whatsapp: String(c.comprador?.whatsapp ?? "").trim() || null,
		};

		if (!comprador.nombre) throw new BadRequestException("Falta tu nombre");

		if (!CORREO.test(comprador.email)) {
			throw new BadRequestException(
				"Hace falta un correo válido: ahí llega el seguimiento",
			);
		}

		/* EL TELÉFONO ES OBLIGATORIO Y SE VALIDA AQUÍ, no sólo en el formulario.
		 *
		 * La paquetería lo exige para entregar: sin él la guía no se puede
		 * comprar, y eso no se descubre al pedir sino días después, cuando el
		 * taller va a generar la etiqueta y ya no hay a quién pedírselo. Entró un
		 * pedido así mientras el campo era opcional.
		 *
		 * Se cuentan dígitos en vez de exigir un formato: la gente escribe
		 * espacios, guiones y prefijos, y rechazar un teléfono bueno por cómo
		 * está escrito es peor que aceptarlo tal cual. */
		if (digitos(comprador.whatsapp ?? "").length < 10) {
			throw new BadRequestException(
				"Hace falta un teléfono de 10 dígitos: la paquetería lo exige para entregar",
			);
		}

		return comprador;
	}

	/**
	 * La entrega y el envío de cada taller.
	 *
	 * SE ELIGE POR PARTE: uno está en tu ciudad y pasas por él, el otro te lo
	 * manda. `partes` trae la de cada taller; si no viene —el checkout de un
	 * solo producto, que sigue existiendo— vale la global para todas.
	 */
	private async entregasPorTaller(c: Record<string, any>, talleres: string[]) {
		const porTaller = new Map<string, { entrega: unknown; envio?: unknown }>();

		for (const parte of Array.isArray(c.partes) ? c.partes : []) {
			const id = String(parte?.proveedorId ?? "");
			if (id) porTaller.set(id, { entrega: parte.entrega, envio: parte.envio });
		}

		const global = porTaller.size === 0 ? leerEntrega(c.entrega) : null;
		const entregas = new Map<
			string,
			{ entrega: Entrega; envio: Awaited<ReturnType<EnviosService["envioDelPedido"]>> | null }
		>();

		for (const tallerId of talleres) {
			const suya = porTaller.get(tallerId);
			const entrega = global ?? leerEntrega(suya?.entrega);

			entregas.set(tallerId, {
				entrega,
				envio:
					entrega.metodo === "envio"
						? await this.envios.envioDelPedido(
								porTaller.size === 0 ? c.envio : suya?.envio,
							)
						: null,
			});
		}

		return entregas;
	}

	/**
	 * La entrega de la COMPRA, sólo si todas sus partes coinciden.
	 *
	 * Con métodos distintos no existe "la entrega de la compra", y guardar la de
	 * una parte como si fuera la de todas es la clase de dato que después se lee
	 * mal.
	 */
	private entregaComun(valores: { entrega: Entrega }[]): Entrega | null {
		const primera = valores[0]?.entrega;
		if (!primera) return null;

		return valores.every((v) => v.entrega.metodo === primera.metodo)
			? primera
			: null;
	}

	/**
	 * Los productos, con todo lo que decide el precio.
	 *
	 * SÓLO SE PUEDE PEDIR LO PUBLICADO: un borrador o algo que volvió a revisión
	 * no existe para el público, y menos para cobrarlo.
	 */
	private async leerProductosPublicados(
		ids: string[],
	): Promise<ProductoParaPedir[]> {
		if (ids.some((id) => !id)) {
			throw new BadRequestException(
				"Una línea del pedido no dice qué producto es",
			);
		}

		const unicos = [...new Set(ids)];

		const filas = await this.db
			.select()
			.from(e.productos)
			.where(
				and(
					inArray(e.productos.id, unicos),
					eq(e.productos.estado, "activo"),
				),
			);

		if (filas.length !== unicos.length) {
			throw new BadRequestException("Uno de los productos ya no está disponible");
		}

		const [precios, produccion, lados, colores, imagenes, existencias] =
			await Promise.all([
				this.db
					.select()
					.from(e.productoPrecios)
					.where(inArray(e.productoPrecios.productoId, unicos)),
				this.db
					.select()
					.from(e.productoProduccion)
					.where(inArray(e.productoProduccion.productoId, unicos)),
				this.db
					.select()
					.from(e.productoLados)
					.where(inArray(e.productoLados.productoId, unicos)),
				this.db
					.select()
					.from(e.productoColores)
					.where(inArray(e.productoColores.productoId, unicos)),
				this.db
					.select()
					.from(e.productoImagenes)
					.where(inArray(e.productoImagenes.productoId, unicos))
					.orderBy(e.productoImagenes.orden),
				this.db
					.select()
					.from(e.productoExistencias)
					.where(inArray(e.productoExistencias.productoId, unicos)),
			]);

		const porId = new Map<string, ProductoParaPedir>();

		for (const p of filas) {
			const precio = precios.find((x) => x.productoId === p.id);
			const prod = produccion.find((x) => x.productoId === p.id);

			porId.set(p.id, {
				id: p.id,
				tallerId: p.tallerId,
				nombre: p.nombre,
				sku: p.sku,
				plantillaId: p.plantillaId,
				imagenUrl: imagenes.find((i) => i.productoId === p.id)?.url ?? null,
				precioBase: precio ? Number(precio.precioBase) : 0,
				precioPorLado: precio?.precioPorLado
					? Number(precio.precioPorLado)
					: null,
				diasProduccion: prod?.dias ?? 0,
				diasExtraSinStock: p.diasExtraSinStock ?? 0,
				lados: lados
					.filter((l) => l.productoId === p.id)
					.map((l) => ({
						clave: l.clave,
						anchoCm: l.anchoCm,
						altoCm: l.altoCm,
						dpi: l.dpi,
						sangradoCm: l.sangradoCm,
						recargo: l.recargo === null ? null : Number(l.recargo),
					})),
				colores: colores
					.filter((c) => c.productoId === p.id)
					.map((c) => ({ nombre: c.nombre, hex: c.hex })),
				existencias: new Map(
					existencias
						.filter((x) => x.productoId === p.id)
						.map((x) => [claveDeVariante(x.color, x.talla), x.cantidad]),
				),
			});
		}

		/* En el ORDEN EN QUE LLEGARON, con repetidos: dos líneas pueden pedir el
		   mismo producto en colores distintos y cada una necesita el suyo. */
		return ids.map((id) => porId.get(id)!);
	}

	/**
	 * Escribe la compra, sus pedidos y el descuento de existencias, de una pieza.
	 *
	 * EL FOLIO es lo que la gente dice por teléfono ("mi pedido 481902"), así
	 * que son dígitos y no un uuid. Al ser corto choca de vez en cuando: se
	 * reintenta con otro en vez de fallar.
	 *
	 * SEIS DÍGITOS, Y EL NÚMERO IMPORTA. Empezó con cuatro —9 000 valores— y los
	 * folios no se liberan nunca, así que ese espacio era un techo duro para la
	 * vida del negocio, no un límite por segundo: a los 9 000 pedidos no entraba
	 * ni uno más, nunca. Con 900 000, a los 9 000 pedidos la probabilidad de que
	 * uno falle del todo es de 1 entre 10^12.
	 *
	 * AQUÍ DESAPARECE EL TOPE DE 100 ÍTEMS. En DynamoDB una compra eran la
	 * compra, un pedido por taller, el candado del folio y un descuento por
	 * talla vendida, y pasados los 100 había que rechazarla en castellano para
	 * que no saliera un `TransactionCanceledException` que no explica nada. Una
	 * transacción de Postgres no tiene ese límite y el candado del folio ya no
	 * existe: es un índice único.
	 */
	private async escribirCompra(datos: {
		comprador: { nombre: string; email: string; whatsapp: string | null };
		partes: {
			tallerId: string;
			pedidoId: string;
			detalladas: { indice: number; partida: Partida }[];
			entrega: Entrega;
			envio: { precio: number } | null;
			productosTotal: number;
			total: number;
			piezas: number;
		}[];
		productosTotal: number;
		total: number;
		piezas: number;
		huellaDeToken: string;
		entregaComun: Entrega | null;
	}) {
		const { comprador, partes } = datos;

		for (let intento = 0; intento < INTENTOS_DE_FOLIO; intento++) {
			const folio = String(randomInt(100_000, 1_000_000));

			/* `#481902-1`, `#481902-2`… El cliente dice el folio de la compra y
			   cada taller reconoce el suyo dentro sin tener que explicarle nada. */
			const folios: Record<string, string> = {};
			partes.forEach((parte, i) => {
				folios[parte.pedidoId] = `${folio}-${i + 1}`;
			});

			try {
				const compraId = await this.db.transaction(async (tx) => {
					const [compra] = await tx
						.insert(e.compras)
						.values({
							folio,
							correo: comprador.email,
							nombre: comprador.nombre,
							whatsapp: comprador.whatsapp,
							piezas: datos.piezas,
							productosTotal: aNumeric(datos.productosTotal),
							total: aNumeric(datos.total),
							huellaDeToken: datos.huellaDeToken,
							metodoEntrega: datos.entregaComun?.metodo ?? null,
							direccion: datos.entregaComun?.direccion ?? null,
						})
						.returning({ id: e.compras.id });

					for (const parte of partes) {
						await tx.insert(e.pedidos).values({
							id: parte.pedidoId,
							compraId: compra.id,
							tallerId: parte.tallerId,
							folio: folios[parte.pedidoId],
							estado: "nuevo",
							correo: comprador.email,
							nombre: comprador.nombre,
							whatsapp: comprador.whatsapp,
							piezas: parte.piezas,
							metodoEntrega: parte.entrega.metodo,
							/* Se guarda TAL COMO SE CAPTURÓ y no se vuelve a tocar: es lo
							   que el taller lee para mandar el paquete, y "corregirle" el
							   formato a una dirección mexicana es como se pierden los
							   envíos. */
							direccion: parte.entrega.direccion,
							/* La paquetería y lo que se cobró se CONGELAN, como el precio:
							   la cotización caduca y el precio de mañana no es el que pagó
							   esta persona. La guía se llena después, cuando el taller
							   confirma el peso real y compra la etiqueta. */
							envio: parte.envio,
							productosTotal: aNumeric(parte.productosTotal),
							total: aNumeric(parte.total),
							huellaDeToken: datos.huellaDeToken,
						});

						await tx.insert(e.pedidoBitacora).values({
							pedidoId: parte.pedidoId,
							estado: "nuevo",
							autor: "cliente",
						});

						for (const [orden, { partida }] of parte.detalladas.entries()) {
							await tx.insert(e.pedidoPartidas).values({
								id: partida.id,
								pedidoId: parte.pedidoId,
								productoId: partida.productoId,
								nombre: partida.nombre,
								sku: partida.sku,
								imagenUrl: partida.imagenUrl,
								plantillaId: partida.plantillaId,
								color: partida.color,
								colorHex: partida.colorHex,
								lados: partida.lados,
								piezas: partida.piezas,
								precioUnitario: aNumeric(partida.precioUnitario),
								importe: aNumeric(partida.importe),
								arte: partida.arte,
								disenoRuta: partida.disenoRuta,
								bordados: partida.bordados,
								diasPrometidos: partida.diasPrometidos,
								faltantes: partida.faltantes,
								orden,
							});

							for (const talla of partida.tallas) {
								await tx.insert(e.pedidoPartidaTallas).values({
									partidaId: partida.id,
									talla: talla.size,
									piezas: talla.piezas,
								});
							}
						}
					}

					await this.descontarExistencias(tx, partes);

					return compra.id;
				});

				return { compraId, folio, folios };
			} catch (error) {
				/* Sólo se reintenta si chocó EL FOLIO. Cualquier otra violación de
				   unicidad es un fallo de verdad y reintentarla con otro folio la
				   escondería seis veces antes de rendirse. */
				if (!this.esFolioRepetido(error)) throw error;
			}
		}

		throw new ConflictException(
			"No pudimos asignarle un folio a la compra. Inténtalo otra vez.",
		);
	}

	/**
	 * Descuenta lo vendido, DENTRO de la transacción del pedido.
	 *
	 * SIN CONDICIÓN DE QUE HAYA SUFICIENTE: el stock puede quedar negativo y eso
	 * es información, no un fallo — un -2 le dice al taller que compre 2
	 * blancos. Las existencias no bloquean la venta; ver `compromiso()`.
	 *
	 * `ON CONFLICT DO UPDATE` cubre la variante que nunca se capturó —un color
	 * añadido después—, que en DynamoDB resolvía `if_not_exists`. Con la
	 * diferencia de que allí el mapa de existencias tenía que existir o la
	 * escritura reventaba con `ValidationException`, y aquí no hay tal cosa: si
	 * la fila no está, se crea en negativo, que es exactamente lo que significa.
	 *
	 * DOS LÍNEAS DE LA MISMA VARIANTE SE SUMAN antes de escribir. En DynamoDB
	 * era obligatorio —una transacción no puede tocar el mismo ítem dos veces—;
	 * aquí funcionaría igual sin agrupar, pero serían dos UPDATE sobre la misma
	 * fila dentro de la misma transacción, y agrupar es una escritura en vez de
	 * dos.
	 */
	private async descontarExistencias(
		tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
		partes: { detalladas: { partida: Partida }[] }[],
	) {
		const porVariante = new Map<
			string,
			{ productoId: string; color: string | null; talla: string; piezas: number }
		>();

		for (const parte of partes) {
			for (const { partida } of parte.detalladas) {
				for (const talla of partida.tallas) {
					const clave = `${partida.productoId}|${partida.color ?? ""}|${talla.size}`;
					const previo = porVariante.get(clave);

					if (previo) previo.piezas += talla.piezas;
					else {
						porVariante.set(clave, {
							productoId: partida.productoId,
							color: partida.color,
							talla: talla.size,
							piezas: talla.piezas,
						});
					}
				}
			}
		}

		for (const v of porVariante.values()) {
			await ajustarExistencias(tx, { ...v, delta: -v.piezas });
		}
	}

	/** El índice único del folio de la compra, y sólo ése. */
	private esFolioRepetido(error: unknown) {
		const e = error as { code?: string; constraint?: string; cause?: any };
		const codigo = e?.code ?? e?.cause?.code;
		const restriccion = e?.constraint ?? e?.cause?.constraint;

		return codigo === "23505" && restriccion === "compras_folio_unico";
	}

	private async leerPedido(id: string) {
		const [pedido] = await this.db
			.select()
			.from(e.pedidos)
			.where(eq(e.pedidos.id, id))
			.limit(1);

		return pedido ? await this.conPartidas([pedido]).then((p) => p[0]) : null;
	}

	private async leerPedidosDeCompra(compraId: string) {
		const filas = await this.db
			.select()
			.from(e.pedidos)
			.where(eq(e.pedidos.compraId, compraId))
			.orderBy(e.pedidos.folio);

		return this.conPartidas(filas);
	}

	/**
	 * Los pedidos con sus partidas, tallas y bitácora.
	 *
	 * TRES CONSULTAS PARA N PEDIDOS, no tres por pedido: el panel del taller
	 * lista decenas y con un `await` dentro del bucle serían 3N viajes.
	 */
	async conPartidas(pedidos: (typeof e.pedidos.$inferSelect)[]) {
		if (pedidos.length === 0) return [];

		const ids = pedidos.map((p) => p.id);

		const partidas = await this.db
			.select()
			.from(e.pedidoPartidas)
			.where(inArray(e.pedidoPartidas.pedidoId, ids))
			.orderBy(e.pedidoPartidas.orden);

		const [tallas, bitacora] = await Promise.all([
			partidas.length
				? this.db
						.select()
						.from(e.pedidoPartidaTallas)
						.where(
							inArray(
								e.pedidoPartidaTallas.partidaId,
								partidas.map((p) => p.id),
							),
						)
				: Promise.resolve([]),
			this.db
				.select()
				.from(e.pedidoBitacora)
				.where(inArray(e.pedidoBitacora.pedidoId, ids))
				.orderBy(e.pedidoBitacora.creadoEn),
		]);

		return pedidos.map((pedido) => ({
			...pedido,
			lineas: partidas
				.filter((p) => p.pedidoId === pedido.id)
				.map((p) => ({
					...p,
					tallas: tallas
						.filter((t) => t.partidaId === p.id)
						.map((t) => ({ size: t.talla, piezas: t.piezas })),
				})),
			bitacora: bitacora.filter((b) => b.pedidoId === pedido.id),
		}));
	}
}

export type PedidoCompleto = Awaited<
	ReturnType<PedidosService["conPartidas"]>
>[number];
