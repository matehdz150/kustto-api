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
import type { Identidad } from "../auth/identidad";
import { CarritoService } from "./carrito.service";
import { DisenosService } from "./disenos.service";
import { FavoritosService } from "./favoritos.service";
import { ImagenesService } from "./imagenes.service";
import { PerfilService } from "./perfil.service";
import { PlantillasDeCompraService } from "./plantillas.service";

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
		private readonly plantillas: PlantillasDeCompraService,
	) {}

	/* ─── Perfil ──────────────────────────────────────────────────────────── */

	@Get("perfil")
	verPerfil(@Req() p: PeticionConIdentidad) {
		return this.perfil.obtener(quien(p));
	}

	@Patch("perfil")
	guardarPerfil(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.perfil.guardar(quien(p), c);
	}

	/* ─── Carrito ─────────────────────────────────────────────────────────── */

	@Get("carrito")
	verCarrito(@Req() p: PeticionConIdentidad) {
		return this.carrito.obtener(quien(p));
	}

	@Patch("carrito")
	guardarCarrito(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
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
	guardarFavoritos(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.favoritos.guardar(quien(p), c);
	}

	/* ─── Diseños guardados ───────────────────────────────────────────────── */

	@Get("disenos")
	listarDisenos(@Req() p: PeticionConIdentidad) {
		return this.disenos.listar(quien(p));
	}

	@Post("disenos")
	guardarDiseno(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
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
	firmarImagen(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.imagenes.firmarSubida(quien(p), c);
	}

	@Post("imagenes")
	confirmarImagen(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.imagenes.confirmar(quien(p), c);
	}

	@Delete("imagenes/:id")
	borrarImagen(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.imagenes.borrar(quien(p), id);
	}

	/* ─── Plantillas de compra ────────────────────────────────────────────
	   El id es ordenable por tiempo (`20260904T022617-41ec85d4`), no un uuid:
	   ver el comentario de la tabla. Por eso no lleva `ParseUUIDPipe`. */

	@Get("plantillas")
	listarPlantillas(@Req() p: PeticionConIdentidad) {
		return this.plantillas.listar(quien(p));
	}

	@Post("plantillas")
	crearPlantilla(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.plantillas.crear(quien(p), c);
	}

	/**
	 * `subidas` va antes que las rutas con `:id`.
	 *
	 * HOY NO CHOCARÍA —no hay ningún `POST plantillas/:id`, y las demás son
	 * PATCH y DELETE— pero Nest resuelve por orden de declaración, así que el
	 * día que alguien añada uno, `plantillas/subidas` entraría por ahí con
	 * `id = "subidas"` y sólo se notaría cuando alguien subiera arte. Dejarla
	 * arriba cuesta nada.
	 */
	@Post("plantillas/subidas")
	firmarSubidas(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.plantillas.firmarSubidas(quien(p), c);
	}

	@Post("plantillas/:id/carrito")
	plantillaAlCarrito(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.plantillas.alCarrito(quien(p), id);
	}

	@Patch("plantillas/:id")
	actualizarPlantilla(
		@Req() p: PeticionConIdentidad,
		@Param("id") id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.plantillas.actualizar(quien(p), id, c);
	}

	@Delete("plantillas/:id")
	borrarPlantilla(@Req() p: PeticionConIdentidad, @Param("id") id: string) {
		return this.plantillas.borrar(quien(p), id);
	}
}
