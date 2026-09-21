import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import { GuardTaller, type PeticionConIdentidad } from "../auth/auth.guard";
import type { Identidad } from "../auth/cognito";
import { TallerService } from "./perfil.service";
import { ProductosTallerService } from "./productos.service";

function quien(p: PeticionConIdentidad): Identidad {
	return p.identidad!;
}

/**
 * El panel del taller.
 *
 * TODO DETRÁS DEL GUARD DE TALLERES. La separación entre talleres no la impone
 * el guard —eso sólo dice quién eres— sino el `where taller_id = …` de cada
 * servicio, que vive en UN sitio por servicio y no repartido por aquí.
 */
@Controller("proveedores")
@UseGuards(GuardTaller)
export class TallerController {
	constructor(
		private readonly taller: TallerService,
		private readonly productos: ProductosTallerService,
	) {}

	/* ─── Su perfil ───────────────────────────────────────────────────────── */

	@Get("yo")
	yo(@Req() p: PeticionConIdentidad) {
		return this.taller.yo(quien(p));
	}

	@Patch("yo")
	actualizarPerfil(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.taller.actualizar(quien(p), c);
	}

	/* ─── Lo que necesita el asistente de alta ────────────────────────────── */

	@Get("plantillas")
	plantillas() {
		return this.taller.plantillas();
	}

	@Get("categorias")
	categorias() {
		return this.taller.categorias();
	}

	@Post("subidas/foto")
	firmarFoto(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.taller.urlParaFoto(quien(p), c);
	}

	/* ─── Sus productos ───────────────────────────────────────────────────── */

	@Get("productos")
	listarProductos(@Req() p: PeticionConIdentidad) {
		return this.productos.listar(quien(p).sub);
	}

	@Get("productos/:id")
	verProducto(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.productos.obtener(quien(p).sub, id);
	}

	@Post("productos")
	crearProducto(
		@Req() p: PeticionConIdentidad,
		@Body() c: Record<string, unknown>,
	) {
		return this.productos.crear(quien(p).sub, c);
	}

	@Patch("productos/:id")
	actualizarProducto(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.productos.actualizar(quien(p).sub, id, c);
	}

	/**
	 * Las existencias van por su propia ruta, no por el PATCH del producto.
	 * Ver el comentario de `moverExistencias`: si pasaran por ahí, el taller se
	 * despublicaría al corregir su conteo.
	 */
	@Patch("productos/:id/existencias")
	moverExistencias(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.productos.moverExistencias(quien(p).sub, id, c);
	}

	@Delete("productos/:id")
	borrarProducto(
		@Req() p: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.productos.borrar(quien(p).sub, id);
	}
}
