import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { extraPorLados } from "../precios/precios";
import { aPesos } from "./dominio";

/** Un producto con todo lo que hace falta para cobrarlo, leído de la base. */
export type ProductoParaPedir = {
	id: string;
	tallerId: string;
	nombre: string;
	sku: string | null;
	plantillaId: string | null;
	imagenUrl: string | null;
	precioBase: number;
	precioPorLado: number | null;
	diasProduccion: number;
	diasExtraSinStock: number;
	lados: {
		clave: string;
		anchoCm: number;
		altoCm: number;
		dpi: number;
		sangradoCm: number;
		recargo: number | null;
	}[];
	colores: { nombre: string; hex: string | null }[];
	existencias: Map<string, number>;
};

export type TallaPedida = { size: string; piezas: number };

export type Partida = {
	id: string;
	productoId: string;
	nombre: string;
	sku: string | null;
	imagenUrl: string | null;
	plantillaId: string | null;
	color: string | null;
	colorHex: string | null;
	lados: string[];
	tallas: TallaPedida[];
	piezas: number;
	precioUnitario: number;
	importe: number;
	arte: Record<string, unknown>[];
	disenoRuta: string;
	bordados: Record<string, unknown>[] | null;
	diasPrometidos: number;
	faltantes: TallaPedida[];
};

/** La llave de una variante de existencias. Espejo de `variante()` en la Lambda. */
export function claveDeVariante(color: string | null, talla: string) {
	const limpia = (s: string) => s.trim().replace(/\|/g, "-");
	return color ? `${limpia(color)}|${limpia(talla)}` : limpia(talla);
}

/**
 * Qué se le promete al comprador y qué le falta al taller.
 *
 * LAS EXISTENCIAS NO BLOQUEAN LA VENTA: está decidido que se puede comprar sin
 * blancos avisando de más días, porque el taller los compra. Por eso aquí no
 * hay ninguna condición ni ningún rechazo — sólo se calcula el compromiso.
 *
 * Todo producto cuenta y no hay interruptor que lo apague. Quien compra el
 * blanco por trabajo tiene sus existencias en cero y sus `faltantes` son la
 * lista de lo que va a comprar; lo que ese taller deja en 0 es
 * `diasExtraSinStock`, porque sus días ya incluyen la compra.
 */
function compromiso(
	producto: ProductoParaPedir,
	color: string | null,
	tallas: TallaPedida[],
) {
	const faltantes: TallaPedida[] = [];

	for (const t of tallas) {
		const hay = producto.existencias.get(claveDeVariante(color, t.size)) ?? 0;
		/* Lo que falta es lo que se pide POR ENCIMA de lo que hay: si hay 3 y
		   piden 5, faltan 2 — no 5. */
		const falta = t.piezas - Math.max(0, hay);
		if (falta > 0) faltantes.push({ size: t.size, piezas: falta });
	}

	return {
		diasPrometidos:
			faltantes.length > 0
				? producto.diasProduccion + producto.diasExtraSinStock
				: producto.diasProduccion,
		faltantes,
	};
}

/**
 * Lo que mide de verdad el archivo que se va a subir.
 *
 * LO REPORTA EL NAVEGADOR porque es el único que lo sabe: el tamaño sale del
 * área del lienzo, y esa proporción no tiene por qué coincidir con los
 * centímetros que declaró el taller — de hecho no coincidía, y la ficha decía
 * 35 cm mientras el archivo medía 36.3.
 *
 * Es DESCRIPTIVO: no decide precio ni destinatario, así que puede venir del
 * cliente. Lo que sí se hace es no creerse cualquier cosa: sin números buenos,
 * no se guarda nada.
 */
function medidaRealDelArchivo(
	linea: Record<string, any>,
	lado: string,
	dpi: number,
) {
	const archivos = Array.isArray(linea.archivos) ? linea.archivos : [];
	const suyo = archivos.find((a: any) => String(a?.lado) === lado);

	const anchoPx = Math.trunc(Number(suyo?.anchoPx ?? 0));
	const altoPx = Math.trunc(Number(suyo?.altoPx ?? 0));

	if (!(anchoPx > 0 && altoPx > 0)) return {};

	const aCm = (px: number) => Math.round((px / dpi) * 2.54 * 10) / 10;

	/* EL SANGRADO SE RESTA. El archivo mide a propósito más que el área: el
	   papel se mueve al prensar y el arte tiene que desbordar. Sin restarlo,
	   "lo que va a medir impreso" incluiría el desbordamiento y la comparación
	   con lo declarado avisaría de una desviación buscada — en cada pedido, que
	   es como se enseña a ignorar un aviso. */
	const sangradoCm = Number(suyo?.sangradoCm ?? 0) || 0;

	return {
		anchoPx,
		altoPx,
		/** Lo que va a medir impreso. Es lo que el taller tiene que comprobar. */
		anchoRealCm: Math.round((aCm(anchoPx) - sangradoCm * 2) * 10) / 10,
		altoRealCm: Math.round((aCm(altoPx) - sangradoCm * 2) * 10) / 10,
		/** Se enseña aparte: el taller tiene que saber que el archivo desborda. */
		...(sangradoCm ? { sangradoCm } : {}),
	};
}

/**
 * Cómo quedó el bordado de cada lado que se borda.
 *
 * SE COPIA TAL CUAL Y NO SE RECALCULA: es descriptivo —no toca el precio ni el
 * destinatario— y quien lo produjo fue el motor de bordado, no el navegador.
 * Lo que sí decide, que un diseño rechazado no se pueda comprar, ya está
 * resuelto antes: un `REJECTED` no llega a agregarse al carrito, y aquí sólo
 * se aceptan los dos estados que permiten fabricar.
 */
function leerBordados(linea: Record<string, any>, lados: string[]) {
	return (Array.isArray(linea.bordados) ? linea.bordados : [])
		.map((b: any) => ({
			lado: String(b?.lado ?? "").trim(),
			jobId: String(b?.jobId ?? "").slice(0, 64),
			designHash: String(b?.designHash ?? "").slice(0, 64),
			status: b?.status === "REVIEW" ? "REVIEW" : "READY",
			incidencias: (Array.isArray(b?.incidencias) ? b.incidencias : [])
				.slice(0, 10)
				.map((c: unknown) => String(c).slice(0, 48)),
		}))
		.filter((b: { lado: string }) => b.lado && lados.includes(b.lado));
}

/**
 * Una línea del pedido, con todo lo que decide el precio sacado del PRODUCTO.
 *
 * Del cuerpo de la petición sólo se aceptan las cantidades, los lados elegidos
 * y el color. El precio, el taller y las medidas salen de la base: si salieran
 * del cuerpo, cualquiera podría pedir a un peso.
 */
export function aPartida(
	linea: Record<string, any>,
	producto: ProductoParaPedir,
	pedidoId: string,
): Partida {
	const tallas: TallaPedida[] = (Array.isArray(linea.tallas) ? linea.tallas : [])
		.map((t: any) => ({
			size: String(t?.size ?? "").trim(),
			piezas: Math.trunc(Number(t?.piezas ?? 0)),
		}))
		.filter((t: TallaPedida) => t.size && t.piezas > 0);

	if (tallas.length === 0) {
		throw new BadRequestException(
			`Dinos cuántas piezas quieres de ${producto.nombre}`,
		);
	}

	const piezas = tallas.reduce((n, t) => n + t.piezas, 0);

	const lados = (Array.isArray(linea.lados) ? linea.lados : [])
		.map((s: unknown) => String(s))
		.filter(Boolean);

	/* El recargo de los lados extra, con la MISMA función que usa el navegador
	   para enseñarlo. Ver `src/precios/precios.ts`. */
	const extra = extraPorLados(
		lados,
		producto.lados.map((l) => ({ sideKey: l.clave, recargo: l.recargo })),
		{ perSidePrice: producto.precioPorLado },
	);

	const partidaId = randomUUID();
	const bordados = leerBordados(linea, lados);

	/* El nombre del color solo no basta para comprar el blanco ni para decidir
	   la subbase: "Negro" no le dice a nadie qué tono. Se copia el hex. */
	const color = String(linea.colorPrenda ?? "").trim() || null;
	const colorHex = producto.colores.find((c) => c.nombre === color)?.hex ?? null;

	const precioUnitario = aPesos(producto.precioBase + extra);

	return {
		id: partidaId,
		productoId: producto.id,
		nombre: producto.nombre,
		sku: producto.sku,
		imagenUrl: producto.imagenUrl,
		plantillaId: producto.plantillaId,
		color,
		colorHex,
		lados,
		tallas,
		piezas,
		precioUnitario,
		importe: aPesos(precioUnitario * piezas),
		...compromiso(producto, color, tallas),
		bordados: bordados.length ? bordados : null,
		/* El lienzo editable vive en S3; aquí sólo su ruta. Las rutas se apuntan
		   ANTES de que los archivos existan: el navegador los sube enseguida con
		   las URLs firmadas, y así el taller siempre sabe dónde mirar. */
		disenoRuta: `/medios/pedidos/${pedidoId}/${partidaId}-diseno.json`,
		arte: lados.map((lado: string) => {
			/* LAS MEDIDAS SE CONGELAN AQUÍ, igual que el precio. Viven en el
			   producto y el taller puede editarlas mañana: si la ficha del pedido
			   las leyera de allí, un pedido de hace un mes se imprimiría al tamaño
			   de hoy y nadie se enteraría hasta ver la prenda. */
			const suyo = producto.lados.find((l) => l.clave === lado);
			const anchoCm = suyo?.anchoCm ?? 28;
			const altoCm = suyo?.altoCm ?? 35;
			const dpi = suyo?.dpi ?? 300;
			const bordado = bordados.find((b: { lado: string }) => b.lado === lado);

			return {
				lado,
				anchoCm,
				altoCm,
				dpi,
				/** El archivo que va a máquina: recortado, transparente, a los DPI. */
				ruta: `/medios/pedidos/${pedidoId}/${partidaId}-${lado}.png`,
				/**
				 * La prenda con el diseño encima. NO SE IMPRIME: es la referencia de
				 * colocación, para comprobar dónde va antes de planchar. El archivo
				 * de producción va recortado al área y no dice nada de en qué parte
				 * de la playera cae.
				 */
				colocacion: `/medios/pedidos/${pedidoId}/${partidaId}-${lado}-colocacion.png`,
				/**
				 * La prenda REAL con el diseño encima: lo que vio quien compró.
				 *
				 * Va ADEMÁS de `colocacion` y no en su lugar. Aquélla es el mockup
				 * —un dibujo de línea— y sirve para cuadrar dónde cae el estampado;
				 * ésta tiene pliegues y caída y sirve para saber qué esperaba el
				 * cliente. Son dos preguntas distintas.
				 *
				 * La ruta se escribe siempre y el archivo puede no existir, así que
				 * quien la enseñe tiene que aguantar un 404. Comprobarlo aquí
				 * costaría una llamada a S3 por lado y por pedido.
				 */
				prenda: `/medios/pedidos/${pedidoId}/${partidaId}-${lado}-prenda.png`,
				/** El MISMO arte en trazos, para lo que se graba en vez de imprimirse. */
				vector: `/medios/pedidos/${pedidoId}/${partidaId}-${lado}-vector.svg`,
				/**
				 * El DST, SÓLO en los lados que de verdad se bordan.
				 *
				 * Al contrario que `prenda` y `vector`, esta ruta NO se escribe
				 * siempre: si el lado no lleva bordado, el campo no existe y el
				 * taller no ve una descarga que nunca va a funcionar.
				 *
				 * El estado viaja al lado del archivo a propósito: un DST en
				 * `REVIEW` no es lo mismo que uno en `READY`, y quien está a punto
				 * de mandarlo a la máquina tiene que verlo donde pulsa.
				 */
				...(bordado
					? {
							bordado: `/medios/pedidos/${pedidoId}/${partidaId}-${lado}-bordado.dst`,
							bordadoEstado: bordado.status,
							bordadoIncidencias: bordado.incidencias,
						}
					: {}),
				...medidaRealDelArchivo(linea, lado, dpi),
			};
		}),
	};
}
