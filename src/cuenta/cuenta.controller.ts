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
import { CarritoService } from "./carrito.service";
import { DisenosService } from "./disenos.service";
import { FavoritosService } from "./favoritos.service";
import { ImagenesService } from "./imagenes.service";
import { PerfilService } from "./perfil.service";

function quien(peticion: PeticionConIdentidad): Identidad {
	return peticion.identidad!;
}

/**
 * El panel del comprador.
 *
 * TODO DETRÁS DEL GUARD DE COMPRADORES, que es un pool de Cognito distinto al
 * de talleres a propósito: con uno solo, un token de taller abriría esto.
 */
@Controller("cuenta")
@UseGuards(GuardComprador)
export class CuentaController {
	constructor(
		private readonly perfil: PerfilService,
		private readonly carrito: CarritoService,
		private readonly favoritos: FavoritosService,
		private readonly disenos: DisenosService,
		private readonly imagenes: ImagenesService,
	) {}

	/* ─── Perfil ──────────────────────────────────────────────────────────── */

	@Get("perfil")
	verPerfil(@Req() p: PeticionConIdentidad) {
		return this.perfil.obtener(quien(p));
	}

	@Patch("perfil")
	guardarPerfil(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.perfil.guardar(quien(p), c);
	}

	/* ─── Carrito ─────────────────────────────────────────────────────────── */

	@Get("carrito")
	verCarrito(@Req() p: PeticionConIdentidad) {
		return this.carrito.obtener(quien(p));
	}

	@Patch("carrito")
	guardarCarrito(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.carrito.guardar(quien(p), c);
	}

	@Delete("carrito")
	vaciarCarrito(@Req() p: PeticionConIdentidad) {
		return this.carrito.vaciar(quien(p));
	}

	/* ─── Favoritos ───────────────────────────────────────────────────────── */

	@Get("favoritos")
	verFavoritos(@Req() p: PeticionConIdentidad) {
		return this.favoritos.obtener(quien(p));
	}

	@Patch("favoritos")
	guardarFavoritos(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.favoritos.guardar(quien(p), c);
	}

	/* ─── Diseños guardados ───────────────────────────────────────────────── */

	@Get("disenos")
	listarDisenos(@Req() p: PeticionConIdentidad) {
		return this.disenos.listar(quien(p));
	}

	@Post("disenos")
	guardarDiseno(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.disenos.guardar(quien(p), c);
	}

	@Patch("disenos/:id")
	renombrarDiseno(
		@Req() p: PeticionConIdentidad,
		@Param("id") id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.disenos.renombrar(quien(p), id, c);
	}

	@Delete("disenos/:id")
	borrarDiseno(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.disenos.borrar(quien(p), id);
	}

	/* ─── Biblioteca de imágenes ──────────────────────────────────────────── */

	@Get("imagenes")
	listarImagenes(@Req() p: PeticionConIdentidad) {
		return this.imagenes.listar(quien(p));
	}

	@Post("imagenes/subidas")
	firmarImagen(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.imagenes.firmarSubida(quien(p), c);
	}

	@Post("imagenes")
	confirmarImagen(@Req() p: PeticionConIdentidad, @Body() c: Record<string, unknown>) {
		return this.imagenes.confirmar(quien(p), c);
	}

	@Delete("imagenes/:id")
	borrarImagen(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.imagenes.borrar(quien(p), id);
	}
}
