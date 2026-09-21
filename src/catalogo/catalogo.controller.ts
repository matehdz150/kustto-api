import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
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
	constructor(private readonly catalogo: CatalogoService) {}

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
}
