import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { GuardComprador, type PeticionConIdentidad } from "../auth/auth.guard";
import { BordadoService } from "./bordado.service";

/**
 * La preparación de bordado, detrás del pool de COMPRADORES.
 *
 * Es quien diseña el que pide preparar, no el taller: el bordado se digitaliza
 * mientras se arma el pedido, para poder enseñar la vista previa antes de
 * pagar.
 */
@Controller("bordados/jobs")
@UseGuards(GuardComprador)
export class BordadoController {
	constructor(private readonly bordado: BordadoService) {}

	@Post()
	crear(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.bordado.crear(p.identidad!, c);
	}

	@Get(":jobId")
	obtener(@Req() p: PeticionConIdentidad, @Param("jobId") jobId: string) {
		return this.bordado.obtener(p.identidad!, jobId);
	}
}
