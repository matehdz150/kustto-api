import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Identidad } from "../auth/cognito";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { extraPorLados } from "../precios/precios";
import { aPesos } from "./dominio";
import { claveDeVariante } from "./lineas";
import { PedidosService } from "./pedidos.service";
import { paraComprador } from "./vistas";

@Injectable()
export class PedidosCompradorService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly pedidos: PedidosService,
	) {}

	/**
	 * El correo del token, que es por donde se encuentran los pedidos.
	 *
	 * SE EXIGE `email_verified`. Sin eso, registrarse con el correo ajeno
	 * bastaría para leerle los pedidos con su dirección dentro.
	 */
	private correoDe(quien: Identidad) {
		if (!quien.correoVerificado) {
			throw new ForbiddenException(
				"Verifica tu correo para ver tus pedidos",
			);
		}
		return quien.correo;
	}

	/**
	 * Sus pedidos, del más nuevo al más viejo.
	 *
	 * SE BUSCAN POR CORREO Y NO POR CUENTA, y ése es el punto: quien pidió como
	 * invitado y luego se registra con ese mismo correo se encuentra su
	 * historial ya puesto, sin migrar nada.
	 *
	 * En DynamoDB había que filtrar la basura que se colaba: las compras vivían
	 * en la MISMA partición que sus pedidos y aparecían como una fila sin
	 * líneas. Aquí son dos tablas y el problema no existe.
	 */
	async listar(quien: Identidad) {
		const filas = await this.db
			.select()
			.from(e.pedidos)
			.where(eq(e.pedidos.correo, this.correoDe(quien)))
			.orderBy(desc(e.pedidos.creadoEn));

		return (await this.pedidos.conPartidas(filas)).map(paraComprador);
	}

	async obtener(quien: Identidad, id: string) {
		return paraComprador(await this.suyoOFalla(quien, id));
	}

	/**
	 * Lo que haría falta para volver a pedir lo mismo, comparado con hoy.
	 *
	 * NO CREA NADA. Es una lectura y una diferencia: el front la usa para armar
	 * el carrito y enseñar lo que cambió, y el pedido se crea después por el
	 * camino de siempre. Así repetir no abre una segunda forma de escribir
	 * pedidos, que es donde acaban divergiendo las reglas de precio.
	 *
	 * POR QUÉ HAY QUE COMPARAR. La línea del pedido CONGELA precio, medidas y
	 * plazo —esa es la regla de la casa— y el catálogo es de hoy. Entre un mes y
	 * otro sube un precio, se archiva un producto o se acaban los blancos.
	 * Copiarlo en silencio y cobrar otra cifra es como se pierde a la empresa
	 * que pide cada mes.
	 */
	async repetir(quien: Identidad, id: string) {
		const pedido = await this.suyoOFalla(quien, id);
		const hoy = await this.catalogoDeHoy(
			pedido.lineas.map((l) => l.productoId).filter((x): x is string => !!x),
		);

		const lineas = pedido.lineas.map((l) => this.compararLinea(l, hoy));
		const disponibles = lineas.filter((p) => p.estado !== "no_disponible");

		return {
			pedidoId: pedido.id,
			folio: pedido.folio,
			hechoEn: pedido.creadoEn.toISOString(),
			/** Lo que costaron los productos entonces. El envío no entra: se recotiza. */
			totalAntes: aPesos(
				pedido.lineas.reduce((n, l) => n + Number(l.importe), 0),
			),
			totalAhora: aPesos(disponibles.reduce((n, p) => n + p.importe, 0)),
			/** Cuántos talleres, para poder decir cuántos pedidos van a salir. */
			talleres: new Set(
				disponibles.map((p) => p.proveedorId).filter(Boolean),
			).size,
			lineas,
		};
	}

	/**
	 * Una línea del pedido viejo contra el producto de hoy.
	 *
	 * `estado` es lo que el front pinta, y son cuatro casos porque cada uno se
	 * resuelve distinto: `igual` sigue, `precio` avisa, `plazo` avisa, y
	 * `no_disponible` OBLIGA a decidir — es el único que no puede pasar
	 * callando.
	 */
	private compararLinea(
		l: Awaited<ReturnType<PedidosService["conPartidas"]>>[number]["lineas"][number],
		hoy: Map<string, ProductoDeHoy>,
	) {
		const piezas = l.tallas.reduce((n, t) => n + t.piezas, 0);

		const comun = {
			lineaId: l.id,
			productoId: l.productoId,
			producto: l.nombre,
			colorPrenda: l.color,
			lados: (l.lados ?? []) as string[],
			tallas: l.tallas,
			piezas,
			diseno: l.disenoRuta,
			miniatura:
				(l.arte as { colocacion?: string }[] | null)?.[0]?.colocacion ??
				l.imagenUrl,
			importeAntes: Number(l.importe),
			diasAntes: l.diasPrometidos,
		};

		const producto = l.productoId ? hoy.get(l.productoId) : undefined;

		/* Un producto archivado o rechazado no se puede pedir. Se devuelve
		   igual, con su nombre, para poder decir CUÁL se cayó en vez de que
		   desaparezca de la lista. */
		if (!producto) {
			return {
				...comun,
				estado: "no_disponible" as const,
				porque: "Ya no está en el catálogo",
				proveedorId: null,
				importe: 0,
				dias: null,
			};
		}

		const unitario = this.precioDeHoy(producto, comun.lados);
		const importe = aPesos(unitario * piezas);
		const dias = this.diasDeHoy(producto, comun.colorPrenda, l.tallas);

		const unitarioAntes = piezas > 0 ? comun.importeAntes / piezas : 0;
		const subioElPrecio = Math.round(unitario) !== Math.round(unitarioAntes);
		const cambioElPlazo = comun.diasAntes !== null && dias !== comun.diasAntes;

		return {
			...comun,
			estado: subioElPrecio
				? ("precio" as const)
				: cambioElPlazo
					? ("plazo" as const)
					: ("igual" as const),
			porque: null,
			proveedorId: producto.tallerId,
			importe,
			unitario,
			unitarioAntes: Math.round(unitarioAntes),
			dias,
		};
	}

	/**
	 * Lo que costaría HOY una pieza de este producto con estos lados.
	 *
	 * TIENE QUE DAR EXACTAMENTE LO MISMO QUE COBRA EL CHECKOUT: el primer lado
	 * va en el precio base y cada lado extra se cobra aparte. Por eso usa
	 * `extraPorLados`, la misma función, en vez de repetir la cuenta — si se
	 * separan, el total del carrito no cuadra con el cobro.
	 */
	private precioDeHoy(producto: ProductoDeHoy, lados: readonly string[]) {
		return aPesos(
			producto.precioBase +
				extraPorLados(
					lados,
					producto.lados.map((l) => ({ sideKey: l.clave, recargo: l.recargo })),
					{ perSidePrice: producto.precioPorLado },
				),
		);
	}

	/**
	 * Los días que se prometerían HOY.
	 *
	 * Espejo de `compromiso()` en el checkout: si no coinciden, el aviso que ve
	 * el comprador aquí no es el que acaba congelado en su pedido.
	 */
	private diasDeHoy(
		producto: ProductoDeHoy,
		color: string | null,
		tallas: { size: string; piezas: number }[],
	) {
		const falta = tallas.some((t) => {
			const hay = producto.existencias.get(claveDeVariante(color, t.size)) ?? 0;
			return t.piezas > Math.max(0, hay);
		});

		return falta
			? producto.diasProduccion + producto.diasExtraSinStock
			: producto.diasProduccion;
	}

	/** Los productos de la lista que SIGUEN publicados, con lo que decide precio y plazo. */
	private async catalogoDeHoy(ids: string[]) {
		const mapa = new Map<string, ProductoDeHoy>();
		if (ids.length === 0) return mapa;

		const unicos = [...new Set(ids)];

		const filas = await this.db
			.select()
			.from(e.productos)
			.where(
				and(inArray(e.productos.id, unicos), eq(e.productos.estado, "activo")),
			);

		if (filas.length === 0) return mapa;

		const vivos = filas.map((f) => f.id);

		const [precios, produccion, lados, existencias] = await Promise.all([
			this.db
				.select()
				.from(e.productoPrecios)
				.where(inArray(e.productoPrecios.productoId, vivos)),
			this.db
				.select()
				.from(e.productoProduccion)
				.where(inArray(e.productoProduccion.productoId, vivos)),
			this.db
				.select()
				.from(e.productoLados)
				.where(inArray(e.productoLados.productoId, vivos)),
			this.db
				.select()
				.from(e.productoExistencias)
				.where(inArray(e.productoExistencias.productoId, vivos)),
		]);

		for (const p of filas) {
			const precio = precios.find((x) => x.productoId === p.id);

			mapa.set(p.id, {
				tallerId: p.tallerId,
				precioBase: precio ? Number(precio.precioBase) : 0,
				precioPorLado: precio?.precioPorLado
					? Number(precio.precioPorLado)
					: null,
				diasProduccion:
					produccion.find((x) => x.productoId === p.id)?.dias ?? 0,
				diasExtraSinStock: p.diasExtraSinStock ?? 0,
				lados: lados
					.filter((l) => l.productoId === p.id)
					.map((l) => ({
						clave: l.clave,
						recargo: l.recargo === null ? null : Number(l.recargo),
					})),
				existencias: new Map(
					existencias
						.filter((x) => x.productoId === p.id)
						.map((x) => [claveDeVariante(x.color, x.talla), x.cantidad]),
				),
			});
		}

		return mapa;
	}

	/**
	 * El pedido, sólo si es suyo.
	 *
	 * EL MISMO MENSAJE si no existe y si es de otra persona: distinguirlos
	 * convierte esta ruta en una forma de averiguar qué pedidos existen.
	 */
	private async suyoOFalla(quien: Identidad, id: string) {
		const [fila] = await this.db
			.select()
			.from(e.pedidos)
			.where(
				and(eq(e.pedidos.id, id), eq(e.pedidos.correo, this.correoDe(quien))),
			)
			.limit(1);

		if (!fila) throw new NotFoundException("No encontramos ese pedido");

		const [completo] = await this.pedidos.conPartidas([fila]);
		return completo;
	}
}

type ProductoDeHoy = {
	tallerId: string;
	precioBase: number;
	precioPorLado: number | null;
	diasProduccion: number;
	diasExtraSinStock: number;
	lados: { clave: string; recargo: number | null }[];
	existencias: Map<string, number>;
};
