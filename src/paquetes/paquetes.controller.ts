import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	UnauthorizedException,
	UseGuards,
} from "@nestjs/common";
import {
	GuardAdmin,
	GuardTaller,
	type PeticionConIdentidad,
} from "../auth/auth.guard";
import { PaquetesService } from "./paquetes.service";

function tallerId(p: PeticionConIdentidad) {
	if (!p.identidad) throw new UnauthorizedException("No has entrado");
	return p.identidad.sub;
}

@Controller("admin")
@UseGuards(GuardAdmin)
export class PaquetesAdminController {
	constructor(private readonly paquetes: PaquetesService) {}

	@Get("categorias-paquete") categorias() {
		return this.paquetes.categorias();
	}
	@Post("categorias-paquete") crearCategoria(
		@Body() c: Record<string, unknown>,
	) {
		return this.paquetes.crearCategoria(c);
	}
	@Patch("categorias-paquete/:id") actualizarCategoria(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.paquetes.actualizarCategoria(id, c);
	}

	@Get("paquetes") listar(@Query("estado") estado?: string) {
		return this.paquetes.listarAdmin(estado);
	}
	@Get("paquetes/:id") obtener(@Param("id", ParseUUIDPipe) id: string) {
		return this.paquetes.obtenerAdmin(id);
	}
	@Patch("paquetes/:id/revision") revisar(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.paquetes.revisar(id, c);
	}
}

@Controller("proveedores")
@UseGuards(GuardTaller)
export class PaquetesTallerController {
	constructor(private readonly paquetes: PaquetesService) {}

	@Get("categorias-paquete") categorias() {
		return this.paquetes.categorias(true);
	}
	@Get("paquetes") listar(@Req() p: PeticionConIdentidad) {
		return this.paquetes.listarDeTaller(tallerId(p));
	}
	@Get("paquetes/:id") obtener(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.paquetes.obtenerDeTaller(tallerId(p), id);
	}
	@Post("paquetes") crear(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.paquetes.crear(tallerId(p), c);
	}
	@Patch("paquetes/:id") actualizar(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.paquetes.actualizar(tallerId(p), id, c);
	}
	@Delete("paquetes/:id") archivar(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.paquetes.archivar(tallerId(p), id);
	}
}

@Controller("publico")
export class PaquetesPublicosController {
	constructor(private readonly paquetes: PaquetesService) {}

	@Get("categorias-paquete") categorias() {
		return this.paquetes.categorias(true);
	}
	@Get("paquetes") listar(@Query("categoria") categoria?: string) {
		return this.paquetes.listarPublico(categoria);
	}
	@Get("paquetes/:id") obtener(@Param("id", ParseUUIDPipe) id: string) {
		return this.paquetes.obtenerPublico(id);
	}
}
