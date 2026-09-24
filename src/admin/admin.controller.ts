import { pipeline } from "node:stream";
import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Res,
	UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AlmacenService } from "../almacen/almacen.service";
import { GuardAdmin } from "../auth/auth.guard";
import { CategoriasService } from "./categorias.service";
import { PlantillasService } from "./plantillas.service";
import { RevisionService } from "./revision.service";
import { SubidasService } from "./subidas.service";
import { TalleresService } from "./talleres.service";

/**
 * El backoffice.
 *
 * TODO CUELGA DE `/admin/` y detrás del pool de ADMINS, que es un tercer pool
 * distinto al de compradores y al de talleres. No es una comodidad: el guard
 * valida emisor y audiencia, así que un token de taller no abre esto ni por
 * descuido.
 *
 * Antes de Cognito esto iba detrás de una LLAVE COMPARTIDA en una cabecera,
 * guardada por un route handler de Next que hacía de puente. Se quitó al
 * publicar el backoffice: una página estática no puede guardar un secreto, y
 * una credencial permanente que abre toda la API no puede viajar al navegador.
 */
@Controller("admin")
@UseGuards(GuardAdmin)
export class AdminController {
	constructor(
		private readonly plantillas: PlantillasService,
		private readonly categorias: CategoriasService,
		private readonly revision: RevisionService,
		private readonly talleres: TalleresService,
		private readonly subidas: SubidasService,
	) {}

	/* ─── Plantillas de prenda ────────────────────────────────────────────
	   El id es un slug (`tshirt`, `termo-01`), no un uuid, así que NO lleva
	   `ParseUUIDPipe`. Ver el comentario de la tabla. */

	@Get("templates")
	listarPlantillas() {
		return this.plantillas.listar();
	}

	@Get("templates/:id")
	verPlantilla(@Param("id") id: string) {
		return this.plantillas.obtener(id);
	}

	@Post("templates")
	crearPlantilla(@Body() c: Record<string, unknown>) {
		return this.plantillas.crear(c);
	}

	@Patch("templates/:id")
	actualizarPlantilla(
		@Param("id") id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.plantillas.actualizar(id, c);
	}

	@Delete("templates/:id")
	borrarPlantilla(@Param("id") id: string) {
		return this.plantillas.borrar(id);
	}

	/* ─── Categorías ──────────────────────────────────────────────────────── */

	@Get("categories")
	listarCategorias() {
		return this.categorias.listar();
	}

	@Post("categories")
	crearCategoria(@Body() c: Record<string, unknown>) {
		return this.categorias.crear(c);
	}

	@Patch("categories/:id")
	actualizarCategoria(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.categorias.actualizar(id, c);
	}

	@Delete("categories/:id")
	borrarCategoria(@Param("id", ParseUUIDPipe) id: string) {
		return this.categorias.borrar(id);
	}

	/* ─── Revisión de productos ───────────────────────────────────────────
	   Por defecto trae los que esperan revisión: es la cola de trabajo. */

	@Get("productos")
	listarProductos(@Query("estado") estado?: string) {
		return this.revision.listar(estado);
	}

	@Get("productos/:id")
	verProducto(@Param("id", ParseUUIDPipe) id: string) {
		return this.revision.obtener(id);
	}

	@Patch("productos/:id/revision")
	revisarProducto(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() c: Record<string, unknown>,
	) {
		return this.revision.revisar(id, c);
	}

	/* ─── Talleres ────────────────────────────────────────────────────────── */

	@Get("providers")
	listarTalleres() {
		return this.talleres.listar();
	}

	@Post("providers")
	crearTaller(@Body() c: Record<string, unknown>) {
		return this.talleres.crear(c);
	}

	/* ─── Subidas ─────────────────────────────────────────────────────────── */

	@Post("uploads/mockup-url")
	firmarMockup(@Body() c: Record<string, unknown>) {
		return this.subidas.urlParaMockup(c);
	}

	@Post("uploads/imagen-url")
	firmarImagen(@Body() c: Record<string, unknown>) {
		return this.subidas.urlParaImagen(c);
	}
}

/**
 * Sirve los archivos del bucket desde NUESTRO origen.
 *
 * EL BUCKET SIGUE CERRADO. Esto no lo abre: lee con credenciales y devuelve
 * los bytes. Es la única forma de que `/mockups/...` sea del mismo origen que
 * el sitio, y eso no es una preferencia — el teñido de prenda hace
 * `getImageData()` sobre el mockup, y desde otro origen el canvas queda
 * contaminado y el teñido se apaga sin decir nada.
 *
 * SE TRANSMITE EN VEZ DE CARGARLO EN MEMORIA. La Lambda tenía que devolverlo
 * en base64 dentro de la respuesta de API Gateway —un mockup de 4 MB se volvía
 * 5.5 MB de JSON, dos veces en memoria—. Aquí es una tubería.
 */
@Controller("publico")
export class ArchivosController {
	constructor(private readonly almacen: AlmacenService) {}

	@Get("mockups/*ruta")
	mockups(@Param("ruta") ruta: string[], @Res() res: Response) {
		return this.servir(`mockups/${ruta.join("/")}`, res);
	}

	@Get("medios/*ruta")
	medios(@Param("ruta") ruta: string[], @Res() res: Response) {
		return this.servir(`medios/${ruta.join("/")}`, res);
	}

	@Get("archivos-eventos/*ruta")
	eventos(@Param("ruta") ruta: string[], @Res() res: Response) {
		return this.servir(`eventos/${ruta.join("/")}`, res);
	}

	/**
	 * El `diseno.json` de un artículo del carrito, para volver a abrirlo en el
	 * editor: un grupo de un paquete que se quiere corregir antes de pagar.
	 *
	 * SÓLO ESE ARCHIVO. El arte de producción (los PNG) no sale por aquí: lo
	 * único que lo protege es que el id del artículo es un UUID que genera el
	 * servidor, y no hace falta exponerlo para editar. Es el mismo trato que ya
	 * tienen los diseños de un evento.
	 */
	@Get("archivos-carritos/*ruta")
	carritos(@Param("ruta") ruta: string[], @Res() res: Response) {
		if (ruta.length !== 2 || ruta[1] !== "diseno.json")
			throw new NotFoundException();
		return this.servir(`carritos/${ruta.join("/")}`, res);
	}

	private async servir(llave: string, res: Response) {
		/* `..` en la ruta saldría del prefijo y dejaría leer cualquier objeto del
		   bucket. Llega de la URL, así que se comprueba. */
		if (llave.includes("..")) throw new NotFoundException();

		const archivo = await this.almacen.leer("publico", llave).catch((error) => {
			const nombre = (error as { name?: string })?.name;

			/* Un archivo que no está es un 404, no un 500: pasa con plantillas
			   viejas que apuntan a mockups que nunca se subieron, y un 500 manda a
			   buscar el problema en la API en vez de en el dato.
			
			   `AccessDenied` cuenta como "no existe" AQUÍ, y sólo aquí: el rol
			   tiene GetObject sobre todo el bucket pero NO ListBucket, y sin
			   ListBucket S3 contesta 403 en vez de 404 para no revelar qué hay
			   dentro. Si algún día se le quita GetObject al rol, esto empezará a
			   enseñar 404 donde en realidad falta un permiso. */
			if (
				nombre === "NoSuchKey" ||
				nombre === "NotFound" ||
				nombre === "AccessDenied"
			) {
				throw new NotFoundException(`No hay ningún archivo en ${llave}`);
			}
			throw error;
		});

		res.setHeader("content-type", archivo.tipo);
		if (archivo.largo) res.setHeader("content-length", String(archivo.largo));
		/* Las llaves llevan un hash dentro y no se reescriben nunca: son
		   inmutables, así que se pueden cachear para siempre. */
		res.setHeader("cache-control", "public, max-age=31536000, immutable");

		/* `pipeline` Y NO `.pipe()`. Con `.pipe()`, si el navegador corta la
		   descarga —cerrar la pestaña, cambiar de página mientras carga una foto—
		   el cuerpo de S3 se queda abierto y pausado, ocupando una conexión del
		   pool del SDK. Unas decenas de esas y el pool se agota: TODA lectura de
		   S3 se cuelga hasta reiniciar la API. `pipeline` destruye los dos
		   extremos cuando uno falla o se cierra, y la conexión vuelve al pool.
		   Se reprodujo con 60 descargas cortadas a propósito. */
		pipeline(archivo.cuerpo, res, () => {});
	}
}
