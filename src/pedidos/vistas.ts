import type { PedidoCompleto } from "./pedidos.service";

/**
 * Cómo sale un pedido por la API, según quién pregunte.
 *
 * ESTO ES UN FILTRO DE SEGURIDAD, no una comodidad de formato. En las Lambdas
 * vivía duplicado en tres servicios con una nota de "si cambias una, cambia
 * las otras", y ya falló una vez: `guias.ts` usaba `sinLlaves` a secas y le
 * devolvía al taller la huella del token de seguimiento. Aquí hay una sola
 * copia y por eso este archivo existe.
 */

/**
 * El pedido con la forma que devolvía la Lambda, CAMPO POR CAMPO.
 *
 * NO SE ESPARCE LA FILA (`...pedido`). Así estuvo, y salían los nombres de
 * las columnas —`nombre`, `color`, `imagenUrl`, `disenoRuta`, `tallerId`— en
 * vez de los que lee el front —`producto`, `colorPrenda`, `imagen`, `diseno`,
 * `proveedorId`—: el historial del comprador y la ficha del taller se
 * quedaban sin nombre de producto ni diseño. Y esparcir es también cómo se
 * cuela mañana una columna interna nueva: con la lista escrita, lo que sale
 * se decide aquí.
 *
 * La huella del token de seguimiento no está en la lista, a propósito.
 */
function base(pedido: PedidoCompleto) {
	return {
		id: pedido.id,
		compraId: pedido.compraId,
		/* `#481902-2` es la parte 2 de la compra `#481902`: el folio del pedido
		   se arma así al crearlo (`escribirCompra`), así que el de la compra se
		   lee de él sin otra consulta. */
		compraFolio: pedido.folio.split("-")[0],
		folio: pedido.folio,
		estado: pedido.estado,
		proveedorId: pedido.tallerId,
		/* Siempre fue `null`: la Lambda lo escribía así y el pedido se encuentra
		   por correo, no por cuenta. Se conserva para no cambiar la forma. */
		compradorId: null,
		comprador: {
			nombre: pedido.nombre,
			email: pedido.correo,
			whatsapp: pedido.whatsapp,
			notas: pedido.notas,
		},
		entrega: { metodo: pedido.metodoEntrega, direccion: pedido.direccion },
		/* `envio` se escribe al pedir —`null` si se recoge— y siempre viene.
		   `guia` NO existía hasta que el taller compraba la etiqueta: se omite
		   mientras tanto, como en la Lambda. */
		envio: pedido.envio as Record<string, any> | null,
		...(pedido.guia ? { guia: pedido.guia as Record<string, any> } : {}),
		piezas: pedido.piezas,
		productosTotal: Number(pedido.productosTotal),
		total: Number(pedido.total),
		createdAt: pedido.creadoEn.toISOString(),
		updatedAt: pedido.actualizadoEn.toISOString(),
		lineas: pedido.lineas.map((l) => ({
			id: l.id,
			productoId: l.productoId,
			paqueteId: l.paqueteId,
			paqueteNombre: l.paqueteNombre,
			paqueteGrupo: l.paqueteGrupo,
			producto: l.nombre,
			sku: l.sku,
			imagen: l.imagenUrl,
			templateId: l.plantillaId,
			colorPrenda: l.color,
			colorPrendaHex: l.colorHex,
			lados: l.lados,
			tallas: l.tallas,
			piezas: l.piezas,
			importe: Number(l.importe),
			arte: l.arte,
			diseno: l.disenoRuta,
			diasPrometidos: l.diasPrometidos,
			faltantes: l.faltantes,
			/* Sólo en las líneas que se bordan: en la Lambda el campo no existía
			   en las demás. */
			...(l.bordados ? { bordados: l.bordados } : {}),
			/* El atajo que el taller y el backoffice miran en una lista: si
			   CUALQUIER lado quedó en revisión, la línea entera lleva la marca.
			   Sin esto habría que abrir el arreglo de bordados para saberlo, y en
			   una lista de pedidos eso no se hace. */
			...(Array.isArray(l.bordados) &&
			l.bordados.some((b: any) => b?.status === "REVIEW")
				? { requiereRevisionBordado: true }
				: {}),
		})),
		bitacora: pedido.bitacora.map((b) => ({
			estado: b.estado,
			en: b.creadoEn.toISOString(),
			por: b.autor,
			nota: b.nota,
		})),
	};
}

/**
 * El pedido tal como lo ve EL TALLER que lo produce.
 *
 * Lo ve todo menos la huella del token: es su pedido, su cliente y su
 * etiqueta.
 */
export function paraTaller(pedido: PedidoCompleto) {
	return base(pedido);
}

/**
 * El pedido tal como puede verlo QUIEN LO COMPRÓ.
 *
 * QUITAR LA HUELLA DEL TOKEN NO BASTA. Con todo lo demás a la vista salían la
 * etiqueta de la paquetería —un documento operativo del taller—, lo que el
 * envío costó DE VERDAD y la diferencia a cargo del taller: con eso cualquiera
 * compara lo que pagó contra lo que costó y ve el margen.
 *
 * Así que el envío y la guía se recortan a lo que el comprador necesita para
 * saber dónde está su paquete: quién lo lleva, con qué servicio, cuánto pagó y
 * el número para rastrearlo.
 */
export function paraComprador(pedido: PedidoCompleto) {
	const visto = base(pedido) as Record<string, any>;

	if (visto.envio) {
		const { paqueteria, servicio, precio, diasEstimados } = visto.envio;
		visto.envio = { paqueteria, servicio, precio, diasEstimados };
	}

	if (visto.guia) {
		const { paqueteria, rastreo, rastreoUrl, compradaEn } = visto.guia;
		visto.guia = { paqueteria, rastreo, rastreoUrl, compradaEn };
	}

	return visto;
}
