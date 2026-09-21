import { createHash, timingSafeEqual } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

/**
 * Redondea a centavos.
 *
 * Los precios del envío llegan con decimales y sumarlos en coma flotante deja
 * cosas como `809.9300000000001`, que es lo que se guardaría en el pedido y lo
 * que acabaría en un correo o en una factura. SE REDONDEA AL SUMAR, no al
 * pintar: arreglarlo sólo en la pantalla dejaría el número guardado feo y dos
 * sumas distintas darían totales distintos.
 */
export const aPesos = (n: number) => Math.round(n * 100) / 100;

/** Pesos como cadena, que es lo que quiere NUMERIC de Postgres. */
export const aNumeric = (n: number) => aPesos(n).toFixed(2);

export const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Código postal mexicano: cinco dígitos, ni uno más. */
export const CP = /^\d{5}$/;
/** Sólo los dígitos: la gente escribe espacios, guiones y prefijos. */
export const digitos = (v: string) => v.replace(/\D/g, "");

/**
 * El id del carrito viene del cuerpo y acaba dentro de una ruta de S3, así que
 * se limpia como todo lo que llega de fuera: sin esto, un `../` bien puesto
 * leería objetos de otro sitio del bucket.
 */
export const limpioId = (v: unknown) =>
	String(v ?? "")
		.replace(/[^a-zA-Z0-9-]/g, "")
		.slice(0, 40);

export function huella(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Comprueba el token de seguimiento EN TIEMPO CONSTANTE.
 *
 * Una comparación normal filtra por cuánto tarda en fallar, y aquí eso
 * permitiría adivinar el token carácter a carácter.
 */
export function tokenValido(huellaGuardada: string | null, token: string) {
	const esperada = Buffer.from(huellaGuardada ?? "");
	const recibida = Buffer.from(huella(token));

	return (
		esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
	);
}

export type Entrega = {
	metodo: "envio" | "recoger";
	direccion: Record<string, string | null> | null;
};

/**
 * A dónde y cómo se entrega.
 *
 * HAY DOS FORMAS Y CAMBIAN QUÉ ES OBLIGATORIO: si el taller se lo entrega en
 * mano no hay nada que capturar, y exigir una dirección para recogerla sería
 * pedir datos que nadie va a usar. Por eso la dirección se valida sólo cuando
 * de verdad hay que enviar algo.
 *
 * LOS CAMPOS VAN EN LISTA BLANCA: el cuerpo es público y sin sesión, así que
 * lo que no esté aquí no entra a la base.
 */
export function leerEntrega(valor: unknown): Entrega {
	const d = (valor ?? {}) as Record<string, unknown>;
	const metodo = d.metodo === "recoger" ? "recoger" : "envio";

	if (metodo === "recoger") return { metodo, direccion: null };

	const dir = (d.direccion ?? {}) as Record<string, unknown>;
	const texto = (v: unknown) => String(v ?? "").trim();

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

	/* Uno por uno y con el nombre del campo: "faltan datos" obliga a quien
	   captura a adivinar cuál, y esta pantalla ya es larga de por sí. */
	const obligatorios: [keyof typeof direccion, string][] = [
		["calle", "la calle"],
		["numero", "el número"],
		["colonia", "la colonia"],
		["ciudad", "la ciudad o municipio"],
		["estado", "el estado"],
	];

	for (const [campo, comoSeLlama] of obligatorios) {
		if (!direccion[campo]) {
			throw new BadRequestException(
				`Falta ${comoSeLlama} de la dirección de entrega`,
			);
		}
	}

	if (!CP.test(direccion.cp)) {
		throw new BadRequestException("El código postal va a cinco dígitos");
	}

	return { metodo, direccion };
}
