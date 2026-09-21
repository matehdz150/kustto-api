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

/** Lo que nunca sale, sea quien sea el que pregunte. */
function base(pedido: PedidoCompleto) {
	const { huellaDeToken, ...resto } = pedido;

	return {
		...resto,
		createdAt: pedido.creadoEn.toISOString(),
		updatedAt: pedido.actualizadoEn.toISOString(),
		productosTotal: Number(pedido.productosTotal),
		total: Number(pedido.total),
		entrega: { metodo: pedido.metodoEntrega, direccion: pedido.direccion },
		comprador: {
			nombre: pedido.nombre,
			email: pedido.correo,
			whatsapp: pedido.whatsapp,
		},
		lineas: pedido.lineas.map((l) => ({
			...l,
			precioUnitario: Number(l.precioUnitario),
			importe: Number(l.importe),
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
