import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Inject,
	Param,
	ParseUUIDPipe,
	Post,
	Req,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Request } from "express";
import { COLAS } from "../colas/colas";
import { COLA } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import type { Correo } from "../correo/correo.service";
import { TopesService } from "../cuentas/topes.service";
import { CatalogoService } from "./catalogo.service";

/**
 * Cuelga de `/publico/` porque es el prefijo que el front ya pide.
 *
 * Los caminos son EXACTAMENTE los de la Lambda. Cambiarlos obligaría a tocar
 * el front en el mismo paso que cambia la base de datos, y entonces un fallo
 * no diría de cuál de las dos cosas viene.
 */
@Controller("publico")
export class CatalogoController {
	constructor(
		private readonly catalogo: CatalogoService,
		@Inject(COLA(COLAS.correo)) private readonly correos: Queue<Correo>,
		@Inject(ENTORNO) private readonly env: Entorno,
		private readonly topes: TopesService,
	) {}

	@Get("catalogo")
	listar() {
		return this.catalogo.listar();
	}

	@Get("catalogo/:id")
	obtener(@Param("id", ParseUUIDPipe) id: string) {
		return this.catalogo.obtener(id);
	}

	@Get("categorias")
	categorias() {
		return this.catalogo.categorias();
	}

	@Post("solicitudes-proveedor")
	async solicitarProveedor(
		@Body() cuerpo: Record<string, unknown>,
		@Req() peticion: Request,
	) {
		const email = String(cuerpo.email ?? "")
			.trim()
			.toLowerCase();
		const taller = String(cuerpo.taller ?? "").trim();
		const contacto = String(cuerpo.contacto ?? "").trim();
		if (
			!taller ||
			!contacto ||
			taller.length > 120 ||
			contacto.length > 120 ||
			email.length > 254 ||
			!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
		) {
			throw new BadRequestException(
				"Faltan el taller, el contacto o un correo válido",
			);
		}
		await this.topes.contar(`solicitud-proveedor:ip:${peticion.ip}`, 20, 3600);
		await this.topes.contar(`solicitud-proveedor:correo:${email}`, 3, 3600);
		for (const campo of ["whatsapp", "ciudad", "capacidad", "nota"]) {
			if (String(cuerpo[campo] ?? "").length > 1000) {
				throw new BadRequestException("La solicitud es demasiado larga");
			}
		}
		for (const campo of ["tecnicas", "produce"]) {
			if (lista(cuerpo[campo]).length > 1000) {
				throw new BadRequestException("La solicitud es demasiado larga");
			}
		}

		const texto = [
			`Taller: ${taller}`,
			`Contacto: ${contacto}`,
			`Correo: ${email}`,
			`WhatsApp: ${String(cuerpo.whatsapp ?? "")}`,
			`Ciudad: ${String(cuerpo.ciudad ?? "")}`,
			`Técnicas: ${lista(cuerpo.tecnicas)}`,
			`Produce: ${lista(cuerpo.produce)}`,
			`Capacidad: ${String(cuerpo.capacidad ?? "")}`,
			`Nota: ${String(cuerpo.nota ?? "")}`,
		].join("\n");

		await this.correos.add("solicitud-proveedor", {
			para: this.env.CORREO_SOLICITUDES,
			asunto: `Solicitud de proveedor: ${taller}`,
			texto,
			html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${esc(texto)}</pre>`,
		});
		return { ok: true };
	}
}

const lista = (v: unknown) =>
	Array.isArray(v) ? v.map(String).join(", ") : String(v ?? "");

const esc = (v: string) =>
	v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
