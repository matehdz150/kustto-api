import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/cognito";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { correoDe, idOrdenable } from "./comun";
import { PerfilService } from "./perfil.service";

/** Lo que el editor sabe meter en un lienzo, y su extensión. */
const TIPOS: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

const MAXIMO_BYTES = 8 * 1024 * 1024;
const MAXIMAS = 100;
const ID = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * La biblioteca de imágenes del comprador.
 *
 * QUÉ RESUELVE. Quien pide camisetas para su empresa sube el MISMO logo cada
 * vez, y hasta ahora el editor lo olvidaba en cuanto se cerraba: el archivo
 * iba al lienzo y de ahí al arte del pedido, sin quedar en ninguna parte donde
 * volver a encontrarlo.
 *
 * NO ES UN DISEÑO GUARDADO. Un diseño es un lienzo entero para UN producto
 * —con su texto, su colocación y sus medidas—; esto es una imagen suelta que
 * sirve para cualquiera. Mezclarlas haría que "mis diseños" enseñara logos
 * sueltos.
 */
@Injectable()
export class ImagenesService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
		private readonly perfil: PerfilService,
	) {}

	async listar(quien: Identidad) {
		correoDe(quien);

		return this.db
			.select()
			.from(e.imagenesDeComprador)
			.where(eq(e.imagenesDeComprador.compradorId, quien.sub))
			.orderBy(desc(e.imagenesDeComprador.creadoEn));
	}

	/**
	 * Firma la subida. El archivo va del navegador a S3, no por aquí.
	 *
	 * SE VALIDA EL TIPO ANTES DE FIRMAR: un `application/pdf` subido a la
	 * biblioteca la deja enseñando una imagen rota, que es peor que no enseñar
	 * nada.
	 *
	 * EL TAMAÑO VA DENTRO DE LA FIRMA, así que lo aplica S3. Sin eso el tope
	 * sería una promesa de la que nadie se encarga.
	 */
	async firmarSubida(quien: Identidad, cuerpo: Record<string, any>) {
		correoDe(quien);

		const tipo = String(cuerpo?.tipo ?? "");
		const extension = TIPOS[tipo];

		if (!extension) {
			throw new BadRequestException(
				`Ese tipo de imagen no se puede guardar (${tipo || "sin tipo"}). Usa PNG, JPG o WebP.`,
			);
		}

		const bytes = Number(cuerpo?.bytes ?? 0);
		if (!Number.isFinite(bytes) || bytes <= 0) {
			throw new BadRequestException("Falta el tamaño de la imagen");
		}
		if (bytes > MAXIMO_BYTES) {
			throw new BadRequestException(
				`Esa imagen pesa demasiado. El máximo son ${Math.round(MAXIMO_BYTES / 1024 / 1024)} MB.`,
			);
		}

		const cuantas = await this.listar(quien);
		if (cuantas.length >= MAXIMAS) {
			throw new BadRequestException(
				`Ya tienes ${MAXIMAS} imágenes guardadas. Borra alguna para subir otra.`,
			);
		}

		const id = idOrdenable();
		const { uploadUrl, url } = await this.almacen.urlParaMedios(
			`medios/imagenes/${quien.sub}/${id}.${extension}`,
			tipo,
			bytes,
		);

		return { id, uploadUrl, url };
	}

	/** Anota la imagen ya subida. La llama el navegador cuando el PUT terminó. */
	async confirmar(quien: Identidad, cuerpo: Record<string, any>) {
		correoDe(quien);

		const id = String(cuerpo?.id ?? "").trim();
		if (!ID.test(id)) {
			throw new BadRequestException("Ese identificador no es válido");
		}

		const url = String(cuerpo?.url ?? "");

		/* SE COMPRUEBA QUE LA RUTA SEA LA SUYA y no cualquier cadena: sin esto,
		   el cuerpo podría apuntar la entrada a `medios/imagenes/<otro>/…` y la
		   biblioteca enseñaría el logo de otra empresa. */
		if (!url.startsWith(`/medios/imagenes/${quien.sub}/`)) {
			throw new BadRequestException("Esa imagen no es de esta cuenta");
		}

		await this.perfil.asegurar(quien);

		const [fila] = await this.db
			.insert(e.imagenesDeComprador)
			.values({
				id,
				compradorId: quien.sub,
				nombre: String(cuerpo?.nombre ?? "").trim() || null,
				url,
				ancho: Math.trunc(Number(cuerpo?.ancho ?? 0)) || null,
				alto: Math.trunc(Number(cuerpo?.alto ?? 0)) || null,
			})
			.onConflictDoNothing()
			.returning();

		return fila ?? { id, url };
	}

	/** La fila primero y el archivo después. Ver `DisenosService.borrar`. */
	async borrar(quien: Identidad, id: string) {
		correoDe(quien);

		const [fila] = await this.db
			.delete(e.imagenesDeComprador)
			.where(
				and(
					eq(e.imagenesDeComprador.id, id),
					eq(e.imagenesDeComprador.compradorId, quien.sub),
				),
			)
			.returning();

		if (!fila) throw new NotFoundException("No encontramos esa imagen");

		await this.almacen.borrar(fila.url.replace(/^\//, ""));
		return { ok: true };
	}
}
