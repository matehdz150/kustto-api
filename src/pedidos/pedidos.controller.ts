import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import {
	GuardComprador,
	GuardTaller,
	type PeticionConIdentidad,
} from "../auth/auth.guard";
import type { Identidad } from "../auth/identidad";
import { PedidosService } from "./pedidos.service";
import { PedidosCompradorService } from "./pedidos-comprador.service";
import { PedidosTallerService } from "./pedidos-taller.service";

/** La identidad que el guard ya dejó en la petición. */
function quien(peticion: PeticionConIdentidad): Identidad {
	return peticion.identidad!;
}

/**
 * Lo público: pedir y seguir el pedido.
 *
 * PEDIR NO EXIGE CUENTA, a propósito. El seguimiento se abre con el token que
 * se le manda al comprador por correo, no con una sesión.
 */
@Controller("publico/pedidos")
export class PedidosPublicoController {
	constructor(private readonly pedidos: PedidosService) {}

	@Post()
	crear(@Body() cuerpo: Record<string, unknown>) {
		return this.pedidos.crear(cuerpo);
	}

	@Get(":id")
	seguimiento(
		@Param("id", ParseUUIDPipe) id: string,
		@Query("token") token?: string,
	) {
		return this.pedidos.seguimiento(id, token);
	}
}

/** El panel del taller. */
@Controller("proveedores/pedidos")
@UseGuards(GuardTaller)
export class PedidosTallerController {
	constructor(private readonly pedidos: PedidosTallerService) {}

	@Get()
	listar(@Req() peticion: PeticionConIdentidad) {
		return this.pedidos.listar(quien(peticion).sub);
	}

	@Get(":id")
	obtener(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.pedidos.obtener(quien(peticion).sub, id);
	}

	@Patch(":id/estado")
	cambiarEstado(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() cuerpo: Record<string, unknown>,
	) {
		return this.pedidos.cambiarEstado(quien(peticion).sub, id, cuerpo);
	}
}

/** El panel del comprador. */
@Controller("cuenta/pedidos")
@UseGuards(GuardComprador)
export class PedidosCompradorController {
	constructor(private readonly pedidos: PedidosCompradorService) {}

	@Get()
	listar(@Req() peticion: PeticionConIdentidad) {
		return this.pedidos.listar(quien(peticion));
	}

	@Get(":id")
	obtener(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.pedidos.obtener(quien(peticion), id);
	}

	@Get(":id/repetir")
	repetir(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.pedidos.repetir(quien(peticion), id);
	}

	/** El GET compara; esto deja las líneas elegidas en el carrito. */
	@Post(":id/repetir")
	repetirAlCarrito(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() cuerpo: Record<string, unknown>,
	) {
		return this.pedidos.alCarrito(quien(peticion), id, cuerpo);
	}
}
