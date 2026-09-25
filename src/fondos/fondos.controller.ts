import { pipeline } from "node:stream";
import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Post,
	Req,
	Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { FondosService } from "./fondos.service";

/**
 * Quitar el fondo de una imagen del editor.
 *
 * SIN SESIÓN, igual que el editor: se puede diseñar sin cuenta, y pedirla para
 * esto sería cortar el diseño justo donde se está viendo si la foto sirve. El
 * gasto lo frena el tope por IP del servicio.
 */
@Controller("fondos")
export class FondosController {
	constructor(private readonly fondos: FondosService) {}

	@Post()
	crear(@Body() cuerpo: unknown, @Req() req: Request) {
		return this.fondos.crear(cuerpo, req.ip ?? null);
	}

	@Post(":id/procesar")
	@HttpCode(202)
	procesar(@Param("id", ParseUUIDPipe) id: string) {
		return this.fondos.procesar(id);
	}

	@Get(":id")
	estado(@Param("id", ParseUUIDPipe) id: string) {
		return this.fondos.estado(id);
	}

	@Get(":id/resultado")
	async resultado(
		@Param("id", ParseUUIDPipe) id: string,
		@Res() res: Response,
	) {
		const { cuerpo, largo } = await this.fondos.resultado(id);
		res.setHeader("content-type", "image/png");
		if (largo) res.setHeader("content-length", String(largo));
		// Es la foto de alguien: no se guarda en cachés compartidas.
		res.setHeader("cache-control", "private, no-store");
		// `pipeline` y no `.pipe()`: ver el comentario en `AdminController.servir`.
		pipeline(cuerpo, res, () => {});
	}
}
