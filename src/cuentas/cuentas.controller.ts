import {
	Body,
	Controller,
	Get,
	HttpCode,
	Inject,
	NotFoundException,
	Param,
	Post,
	Req,
	Res,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { borrarCookies, ponerCookies } from "./cookies";
import { CuentasService } from "./cuentas.service";
import { JwtService } from "./jwt.service";
import { type Meta, SesionesService } from "./sesiones.service";
import {
	cookieDeAcceso,
	cookieDeRenovacion,
	esTipo,
	type TipoDeUsuario,
} from "./tipos";

/**
 * Entrar, renovar, salir y "quién soy", para los tres tipos.
 *
 * Nada de esto lleva guard: son las rutas que CREAN la sesión o la leen
 * directamente de su cookie.
 */
@Controller("auth/:tipo")
export class CuentasController {
	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		private readonly cuentas: CuentasService,
		private readonly sesiones: SesionesService,
		private readonly jwt: JwtService,
	) {}

	@Post("entrar")
	@HttpCode(200)
	async entrar(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const t = await this.tipoActivo(tipo);
		const emitidos = await this.cuentas.entrar(t, cuerpo, metaDe(req));
		ponerCookies(res, this.env, t, emitidos);

		const { sub } = await this.jwt.verificar(t, emitidos.acceso);
		return this.cuentas.yo(t, sub);
	}

	/**
	 * Gasta la cookie de renovación y pone las dos nuevas.
	 *
	 * `{ gracia: true }` SIN COOKIES quiere decir que otra pestaña acaba de
	 * renovar con la misma: el navegador ya tiene las nuevas y basta con
	 * reintentar lo que falló. Ver `GRACIA_MS`.
	 */
	@Post("renovar")
	@HttpCode(200)
	async renovar(
		@Param("tipo") tipo: string,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const t = await this.tipoActivo(tipo);
		const crudo = req.cookies?.[cookieDeRenovacion(t)];
		if (!crudo)
			throw new UnauthorizedException("Tu sesión terminó. Vuelve a entrar.");

		try {
			const r = await this.sesiones.renovar(t, crudo, metaDe(req));
			if (r.tipo === "gracia") return { ok: true, gracia: true };

			ponerCookies(res, this.env, t, r.emitidos);
			return { ok: true };
		} catch (error) {
			/* Si no se pudo renovar, las cookies que tiene ya no sirven: se
			   borran para que el front no vuelva a intentarlo con ellas. */
			borrarCookies(res, this.env, t);
			throw error;
		}
	}

	/** Siempre contesta bien: salir de una sesión que ya no existe es salir. */
	@Post("salir")
	@HttpCode(200)
	async salir(
		@Param("tipo") tipo: string,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const t = await this.tipoActivo(tipo);
		const crudo = req.cookies?.[cookieDeRenovacion(t)];
		const sesionId = crudo
			? await this.sesiones.sesionDeRenovacion(crudo)
			: null;

		if (sesionId) await this.sesiones.revocar(sesionId, "salir");

		borrarCookies(res, this.env, t);
		return { ok: true };
	}

	@Get("yo")
	async yo(@Param("tipo") tipo: string, @Req() req: Request) {
		const t = await this.tipoActivo(tipo);
		const token = req.cookies?.[cookieDeAcceso(t)];
		if (!token) throw new UnauthorizedException("No has entrado");

		let identidad: Awaited<ReturnType<JwtService["verificar"]>>;
		try {
			identidad = await this.jwt.verificar(t, token);
		} catch {
			throw new UnauthorizedException("Tu sesión caducó");
		}
		if (await this.sesiones.bloqueada(identidad.sid)) {
			throw new UnauthorizedException("Tu sesión terminó. Vuelve a entrar.");
		}

		return this.cuentas.yo(t, identidad.sub);
	}

	/** El tipo de la URL, validado, y la llave configurada. */
	private async tipoActivo(tipo: string): Promise<TipoDeUsuario> {
		if (!esTipo(tipo)) throw new NotFoundException();
		if (!(await this.jwt.activo())) {
			throw new ServiceUnavailableException(
				"Las cuentas propias todavía no están encendidas",
			);
		}
		return tipo;
	}
}

function metaDe(req: Request): Meta {
	return {
		ip: req.ip ?? null,
		agente: req.headers["user-agent"] ?? null,
	};
}
