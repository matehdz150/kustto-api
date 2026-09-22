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
	UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { borrarCookies, ponerCookies } from "./cookies";
import { CuentasService } from "./cuentas.service";
import { JwtService } from "./jwt.service";
import { RegistroService } from "./registro.service";
import { RestablecerService } from "./restablecer.service";
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
		private readonly registro: RegistroService,
		private readonly restablecimiento: RestablecerService,
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

	/* ─── Alta de compradores ───────────────────────────────────────────────
	   Sólo `comprador`: los talleres entran por invitación y el admin se da de
	   alta a mano. Con otro tipo en la URL, 404 — como si no existieran. */

	/** Crea la cuenta y manda el código. No abre sesión. */
	@Post("registrar")
	@HttpCode(200)
	async registrar(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
		@Req() req: Request,
	) {
		await this.soloComprador(tipo);
		return this.registro.registrar(cuerpo, metaDe(req));
	}

	/** El código bueno confirma el correo Y abre la sesión: pone las cookies. */
	@Post("verificar")
	@HttpCode(200)
	async verificar(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		await this.soloComprador(tipo);
		const { emitidos, usuario } = await this.registro.verificar(
			cuerpo,
			metaDe(req),
		);
		ponerCookies(res, this.env, "comprador", emitidos);
		return this.cuentas.yo("comprador", usuario.id);
	}

	/** Contesta igual exista la cuenta o no. Ver `RegistroService.reenviar`. */
	@Post("reenviar")
	@HttpCode(200)
	async reenviar(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
	) {
		await this.soloComprador(tipo);
		return this.registro.reenviar(cuerpo);
	}

	/* ─── Olvidé mi contraseña ──────────────────────────────────────────────
	   Para los tres tipos. Es también como crea su primera contraseña quien
	   viene de Cognito o entraba sólo con Google. */

	/** Manda el enlace. Contesta igual haya cuenta o no. */
	@Post("olvide")
	@HttpCode(200)
	async olvide(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
		@Req() req: Request,
	) {
		const t = await this.tipoActivo(tipo);
		return this.restablecimiento.olvide(t, cuerpo, metaDe(req));
	}

	/** Si el enlace sirve, sin gastarlo: la página lo pregunta al abrirse. */
	@Post("restablecer/comprobar")
	@HttpCode(200)
	async comprobarEnlace(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
	) {
		const t = await this.tipoActivo(tipo);
		return this.restablecimiento.comprobar(t, cuerpo);
	}

	/** Pone la contraseña nueva, cierra las demás sesiones y abre ésta. */
	@Post("restablecer")
	@HttpCode(200)
	async restablecer(
		@Param("tipo") tipo: string,
		@Body() cuerpo: Record<string, unknown>,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const t = await this.tipoActivo(tipo);
		const { emitidos, usuario } = await this.restablecimiento.restablecer(
			t,
			cuerpo,
			metaDe(req),
		);
		ponerCookies(res, this.env, t, emitidos);
		return this.cuentas.yo(t, usuario.id);
	}

	private async soloComprador(tipo: string) {
		const t = await this.tipoActivo(tipo);
		if (t !== "comprador") throw new NotFoundException();
	}

	/** El tipo de la URL, validado, y la llave configurada. */
	private async tipoActivo(tipo: string): Promise<TipoDeUsuario> {
		if (!esTipo(tipo)) throw new NotFoundException();
		return tipo;
	}
}

function metaDe(req: Request): Meta {
	return {
		ip: req.ip ?? null,
		agente: req.headers["user-agent"] ?? null,
	};
}
