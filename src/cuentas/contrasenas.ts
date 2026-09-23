import { hash, verify } from "@node-rs/argon2";

/**
 * argon2id con los parámetros por defecto de `@node-rs/argon2`
 * (m = 19 MiB, t = 2, p = 1), que son los que recomienda OWASP. Se dejan
 * implícitos a propósito: el hash guarda sus propios parámetros, así que
 * subirlos mañana no invalida los viejos.
 */
export function hashear(contrasena: string) {
	return hash(contrasena);
}

/**
 * Un hash de verdad de una contraseña que nadie tiene.
 *
 * Se verifica contra él cuando el correo NO EXISTE. Sin esto, "no hay cuenta"
 * contesta en un milisegundo y "contraseña mal" en ochenta —lo que tarda
 * argon2—, y midiendo el tiempo se puede saber qué correos tienen cuenta.
 */
const DE_MENTIRA = hash("contraseña-que-nadie-tiene-6f1c0e");

export async function comprobar(
	hashGuardado: string | null,
	contrasena: string,
) {
	if (!hashGuardado) {
		await verify(await DE_MENTIRA, contrasena).catch(() => false);
		return false;
	}

	return verify(hashGuardado, contrasena).catch(() => false);
}

/**
 * Lo mínimo que se le pide a una contraseña nueva.
 *
 * LARGO, NO COMPOSICIÓN. Obligar a meter un símbolo y una mayúscula produce
 * `Kustto2026!`; ocho caracteres cualquiera ya son más que eso. El tope de
 * 128 es por argon2: una contraseña de un mega sería una forma barata de
 * gastarle la CPU al servidor.
 */
export function problemaDeContrasena(contrasena: string): string | null {
	if (contrasena.length < 8)
		return "La contraseña necesita al menos 8 caracteres";
	if (contrasena.length > 128)
		return "La contraseña no puede pasar de 128 caracteres";
	return null;
}
