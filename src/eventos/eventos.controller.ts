import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { GuardComprador, type PeticionConIdentidad } from "../auth/auth.guard";
import type { Identidad } from "../auth/cognito";
import { EventosPublicoService } from "./eventos-publico.service";
import { EventosService } from "./eventos.service";

function quien(peticion: PeticionConIdentidad): Identidad {
	return peticion.identidad!;
}

/**
 * Los eventos de quien los organiza.
 *
 * El id es ordenable por tiempo, no un uuid: por eso no lleva `ParseUUIDPipe`.
 */
@Controller("cuenta/eventos")
@UseGuards(GuardComprador)
export class EventosController {
	constructor(private readonly eventos: EventosService) {}

	@Get()
	listar(@Req() p: PeticionConIdentidad) {
		return this.eventos.listar(quien(p));
	}

	@Post()
	crear(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.eventos.crear(quien(p), c);
	}

	/** Antes que las rutas con `:id`, por lo mismo que `plantillas/subidas`. */
	@Post("subidas")
	firmarFoto(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.eventos.firmarFoto(quien(p), c);
	}

	@Get(":id")
	obtener(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.eventos.obtener(quien(p), id);
	}

	@Patch(":id")
	actualizar(
		@Req() p: PeticionConIdentidad,
		@Param("id") id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.eventos.actualizar(quien(p), id, c);
	}

	@Post(":id/publicar")
	publicar(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.eventos.publicar(quien(p), id);
	}

	@Post(":id/cerrar")
	cerrar(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.eventos.cerrar(quien(p), id);
	}

	@Patch(":id/productos/:itemId")
	configurarProducto(
		@Req() p: PeticionConIdentidad,
		@Param("id") id: string,
		@Param("itemId") itemId: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.eventos.configurarProducto(quien(p), id, itemId, c);
	}

	@Delete(":id")
	borrar(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.eventos.borrar(quien(p), id);
	}
}

/** El enlace que se comparte. Sin sesión: el invitado no necesita cuenta. */
@Controller("publico/eventos")
export class EventosPublicoController {
	constructor(private readonly eventos: EventosPublicoService) {}

	@Get(":codigo")
	obtener(@Param("codigo") codigo: string) {
		return this.eventos.obtener(codigo);
	}

	@Post(":codigo/subidas")
	firmarSubidas(@Param("codigo") codigo: string, @Body() c: Record<string, unknown>) {
		return this.eventos.firmarSubidas(codigo, c);
	}

	@Post(":codigo/participaciones")
	participar(@Param("codigo") codigo: string, @Body() c: Record<string, unknown>) {
		return this.eventos.participar(codigo, c);
	}
}
