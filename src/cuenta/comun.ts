import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Identidad } from "../auth/cognito";

export const CP = /^\d{5}$/;
export const texto = (v: unknown) => String(v ?? "").trim();

/**
 * El correo del token, que es por donde se encuentran las compras.
 *
 * SE EXIGE `email_verified`. Sin eso, registrarse con el correo ajeno bastaría
 * para leerle los pedidos con su dirección dentro.
 */
export function correoDe(quien: Identidad) {
	if (!quien.correoVerificado) {
		throw new ForbiddenException("Verifica tu correo para entrar a tu cuenta");
	}
	return quien.correo;
}

/**
 * Un id que ordena solo por fecha y que se puede meter en una URL.
 *
 * Empieza por la fecha PERO SIN los dos puntos ni los puntos del ISO: acaba en
 * una llave de S3 y en una URL, y ahí `:` obliga a codificar y `.` complica
 * cualquier comprobación de ruta. `20260903T175425-df08e579` ordena igual y no
 * necesita escaparse.
 *
 * Aquí ya no hace falta para ORDENAR —eso lo hace `order by creado_en`— pero
 * sí para que las rutas de S3 de lo que ya existe sigan teniendo esta forma.
 */
export function idOrdenable() {
	const cuando = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
	return `${cuando}-${randomUUID().slice(0, 8)}`;
}

/**
 * La dirección guardada, en lista blanca y con los MISMOS nombres de campo que
 * usa el pedido: así el checkout la puede precargar tal cual, sin traducir
 * nada en medio.
 *
 * Aquí se puede borrar —mandando `null`— y se puede dejar incompleta, porque
 * nadie va a mandar un paquete con esto: es un borrador para la próxima
 * compra.
 */
export function leerDireccionGuardada(d: unknown) {
	if (d === null || d === undefined) return null;

	const dir = (d ?? {}) as Record<string, unknown>;

	const direccion = {
		calle: texto(dir.calle),
		numero: texto(dir.numero),
		interior: texto(dir.interior) || null,
		colonia: texto(dir.colonia),
		ciudad: texto(dir.ciudad),
		estado: texto(dir.estado),
		cp: texto(dir.cp),
		referencias: texto(dir.referencias) || null,
	};

	/* Si no escribió nada, es que la quiso quitar. */
	if (!direccion.calle && !direccion.colonia && !direccion.ciudad) return null;

	/* El CP sí se valida aunque sea un borrador: uno mal escrito viaja al
	   checkout, se manda con el pedido y ahí ya cuesta un paquete perdido. */
	if (direccion.cp && !CP.test(direccion.cp)) {
		throw new BadRequestException("El código postal va a cinco dígitos");
	}

	return direccion;
}
