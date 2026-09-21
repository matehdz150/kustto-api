/** Los tres tipos de cuenta. Ver `tipo_de_usuario` en el esquema. */
export const TIPOS = ["comprador", "taller", "admin"] as const;
export type TipoDeUsuario = (typeof TIPOS)[number];

export function esTipo(v: unknown): v is TipoDeUsuario {
	return TIPOS.includes(v as TipoDeUsuario);
}

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Cuánto dura cada cosa, por tipo. En segundos.
 *
 * - `acceso`: el JWT. Corto porque, una vez emitido, vale hasta que caduca;
 *   la lista de bloqueo de Redis corta antes las sesiones revocadas, pero es
 *   la duración lo que acota el daño si la lista fallara.
 * - `renovacion`: cada token de renovación. Se extiende con el uso: quien
 *   entra una vez por semana no vuelve a escribir la contraseña.
 * - `absoluta`: el tope de la sesión aunque se siga renovando.
 *
 * EL ADMIN VIVE MENOS a propósito: es una sola cuenta y la que más puede
 * hacer —aprobar productos, dar de alta talleres—. Volver a entrar cada día es
 * poco precio.
 */
export const DURACIONES: Record<
	TipoDeUsuario,
	{ acceso: number; renovacion: number; absoluta: number }
> = {
	comprador: { acceso: 15 * MINUTO, renovacion: 30 * DIA, absoluta: 90 * DIA },
	taller: { acceso: 15 * MINUTO, renovacion: 30 * DIA, absoluta: 90 * DIA },
	admin: { acceso: 10 * MINUTO, renovacion: 12 * HORA, absoluta: 12 * HORA },
};

/**
 * La más larga de las duraciones de acceso. Es lo que tiene que durar una
 * sesión en la lista de bloqueo: pasado eso, su JWT ya caducó solo.
 */
export const ACCESO_MAS_LARGO = Math.max(
	...Object.values(DURACIONES).map((d) => d.acceso),
);

/**
 * UNA COOKIE POR TIPO, no una compartida. Con un solo nombre, entrar como
 * taller en el mismo navegador tiraría la sesión de comprador —hoy conviven,
 * cada una en su llave de `localStorage`—. Y refuerza la separación: el guard
 * del taller ni siquiera LEE la cookie del comprador.
 */
export const cookieDeAcceso = (tipo: TipoDeUsuario) => `kustto_acceso_${tipo}`;
export const cookieDeRenovacion = (tipo: TipoDeUsuario) =>
	`kustto_renovacion_${tipo}`;

/** Lo que dice el JWT de a quién va dirigido. Ver `jwt.service.ts`. */
export const audienciaDe = (tipo: TipoDeUsuario) => `kustto:${tipo}`;
