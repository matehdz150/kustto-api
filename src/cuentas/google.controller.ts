import {
	Controller,
	Get,
	Inject,
	NotFoundException,
	Query,
	Req,
	Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { ponerCookies } from "./cookies";
import { type EstadoDeGoogle, GoogleService } from "./google.service";
import type { Meta } from "./sesiones.service";

const COOKIE = "kustto_google";

/**
 * Las dos rutas de "Continuar con Google". Van por GET y devuelven redirecciones
 * porque las abre el navegador, no `fetch`.
 */
@Controller("auth/comprador/google")
export class GoogleController {
	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		private readonly google: GoogleService,
	) {}

	/** El botón del sitio apunta aquí: guarda el estado y manda a Google. */
	@Get("iniciar")
	iniciar(@Query("volver") volver: string, @Res() res: Response) {
		if (!this.google.activo) throw new NotFoundException();

		const { url, estado } = this.google.iniciar(volver);

		/* Lax y no Strict: Google nos devuelve por una navegación de otro sitio,
		   y una cookie Strict no viajaría. Diez minutos bastan para elegir cuenta. */
		res.cookie(COOKIE, JSON.stringify(estado), {
			httpOnly: true,
			secure: this.env.COOKIE_SEGURA,
			sameSite: "lax",
			path: "/auth/comprador/google",
			maxAge: 10 * 60 * 1000,
		});
		res.redirect(url);
	}

	/** Google devuelve aquí. Pase lo que pase, la persona vuelve al sitio. */
	@Get("callback")
	async callback(
		@Query("code") codigo: string,
		@Query("state") estado: string,
		@Query("error") rechazo: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		if (!this.google.activo) throw new NotFoundException();

		let guardado: EstadoDeGoogle | null = null;
		try {
			guardado = JSON.parse(req.cookies?.[COOKIE] ?? "null");
		} catch {}

		res.clearCookie(COOKIE, {
			httpOnly: true,
			secure: this.env.COOKIE_SEGURA,
			sameSite: "lax",
			path: "/auth/comprador/google",
		});

		const volver = this.google.rutaSegura(guardado?.volver);

		/* "Cancelar" en la pantalla de Google, o una cookie que ya no está. */
		if (rechazo || !codigo || !estado || !guardado) {
			return res.redirect(this.google.sitio(volver, "cancelado"));
		}

		const meta: Meta = {
			ip: req.ip ?? null,
			agente: req.headers["user-agent"] ?? null,
		};

		try {
			const emitidos = await this.google.terminar(
				codigo,
				estado,
				guardado,
				meta,
			);
			ponerCookies(res, this.env, "comprador", emitidos);
			return res.redirect(this.google.sitio(volver));
		} catch {
			return res.redirect(this.google.sitio(volver, "error"));
		}
	}
}
