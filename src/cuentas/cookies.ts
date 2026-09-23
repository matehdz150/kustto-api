import type { CookieOptions, Response } from "express";
import type { Entorno } from "../config/entorno";
import type { Emitidos } from "./sesiones.service";
import {
	cookieDeAcceso,
	cookieDeRenovacion,
	DURACIONES,
	type TipoDeUsuario,
} from "./tipos";

/**
 * Las dos cookies de una sesión.
 *
 * `httpOnly` EN LAS DOS: ningún JavaScript de la página las lee, así que un
 * XSS no se lleva la sesión. Es lo que no se podía con `localStorage`.
 *
 * ACCESO — `SameSite=Lax`, `Path=/`: viaja a toda la API.
 *
 * RENOVACIÓN — `SameSite=Strict` y `Path=/auth/<tipo>`: SÓLO viaja a las
 * rutas de auth de su tipo. Es el token que dura semanas, y así no pasa por
 * ningún endpoint que no lo necesita ni por los logs de las rutas de negocio.
 *
 * `Domain` es `.kustto.com.mx` en producción para que el sitio y la API, en
 * subdominios distintos, compartan la cookie. Son el MISMO SITIO, así que
 * `SameSite` no la bloquea.
 */
function base(env: Entorno): CookieOptions {
	return {
		httpOnly: true,
		secure: env.COOKIE_SEGURA,
		...(env.COOKIE_DOMINIO ? { domain: env.COOKIE_DOMINIO } : {}),
	};
}

const rutaDeRenovacion = (tipo: TipoDeUsuario) => `/auth/${tipo}`;

export function ponerCookies(
	res: Response,
	env: Entorno,
	tipo: TipoDeUsuario,
	emitidos: Emitidos,
) {
	res.cookie(cookieDeAcceso(tipo), emitidos.acceso, {
		...base(env),
		sameSite: "lax",
		path: "/",
		maxAge: DURACIONES[tipo].acceso * 1000,
	});

	res.cookie(cookieDeRenovacion(tipo), emitidos.renovacion, {
		...base(env),
		sameSite: "strict",
		path: rutaDeRenovacion(tipo),
		expires: emitidos.renovacionExpiraEn,
	});
}

/**
 * Borrarlas con los MISMOS `path` y `domain` con que se pusieron: si no
 * coinciden, el navegador las trata como otras cookies y la original se queda.
 */
export function borrarCookies(
	res: Response,
	env: Entorno,
	tipo: TipoDeUsuario,
) {
	res.clearCookie(cookieDeAcceso(tipo), {
		...base(env),
		sameSite: "lax",
		path: "/",
	});
	res.clearCookie(cookieDeRenovacion(tipo), {
		...base(env),
		sameSite: "strict",
		path: rutaDeRenovacion(tipo),
	});
}
