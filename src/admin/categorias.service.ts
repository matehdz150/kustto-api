import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

@Injectable()
export class CategoriasService {
	constructor(@Inject(DB) private readonly db: Db) {}

	async listar() {
		const filas = await this.db
			.select()
			.from(e.categorias)
			.orderBy(asc(e.categorias.orden), asc(e.categorias.nombre));

		return filas.map(aSalida);
	}

	async crear(cuerpo: Record<string, unknown>) {
		const nombre = String(cuerpo.name ?? "").trim();
		const imagen = String(cuerpo.image ?? "").trim();

		if (!nombre)
			throw new BadRequestException("Falta el nombre de la categoría");
		/* La imagen no es opcional: es lo que se ve en el chip del catálogo. */
		if (!imagen)
			throw new BadRequestException("Falta la imagen de la categoría");

		const [fila] = await this.db
			.insert(e.categorias)
			.values({
				nombre,
				descripcion: cuerpo.description
					? String(cuerpo.description).trim()
					: null,
				imagenUrl: imagen,
				slug: await this.slugLibre(nombre),
			})
			.returning();

		return aSalida(fila);
	}

	async actualizar(id: string, cuerpo: Record<string, unknown>) {
		const cambios: Partial<typeof e.categorias.$inferInsert> = {
			actualizadoEn: new Date(),
		};

		if (cuerpo.name !== undefined) {
			const nombre = String(cuerpo.name).trim();
			if (!nombre) throw new BadRequestException("Falta el nombre");
			cambios.nombre = nombre;
		}
		if (cuerpo.description !== undefined) {
			cambios.descripcion = cuerpo.description
				? String(cuerpo.description).trim()
				: null;
		}
		if (cuerpo.image !== undefined) {
			const imagen = String(cuerpo.image).trim();
			if (!imagen) throw new BadRequestException("Falta la imagen");
			cambios.imagenUrl = imagen;
		}

		/* El slug NO se regenera al renombrar. Es parte de una URL que puede
		   estar compartida; cambiarlo rompería enlaces de fuera por un cambio de
		   texto de dentro. */
		if (Object.keys(cambios).length === 1) {
			throw new BadRequestException("Nada que actualizar");
		}

		const [fila] = await this.db
			.update(e.categorias)
			.set(cambios)
			.where(eq(e.categorias.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Categoría no encontrada");
		return aSalida(fila);
	}

	/**
	 * Borra la categoría.
	 *
	 * SI HAY PRODUCTOS DENTRO, NO SE BORRA. La relación es `cascade`, así que
	 * borrarla los sacaría del catálogo en silencio — un producto sin categoría
	 * no aparece en ningún filtro y nadie lo nota hasta que el taller pregunta
	 * por qué no se vende.
	 */
	async borrar(id: string) {
		const dentro = await this.db
			.select({ id: e.productoCategorias.productoId })
			.from(e.productoCategorias)
			.where(eq(e.productoCategorias.categoriaId, id));

		if (dentro.length > 0) {
			throw new ConflictException(
				`Tiene ${dentro.length} producto${dentro.length === 1 ? "" : "s"} dentro. ` +
					"Muévelos antes de borrarla.",
			);
		}

		const [fila] = await this.db
			.delete(e.categorias)
			.where(eq(e.categorias.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Categoría no encontrada");
		return { ok: true };
	}

	/**
	 * Un slug que no choque.
	 *
	 * En DynamoDB las categorías no tenían slug y se referenciaban por id; se
	 * añadió al migrar para poder tener URLs legibles. Aquí hay un índice único
	 * delante, así que dos categorías que se llamen igual necesitan sufijo en
	 * vez de tumbar el alta.
	 */
	private async slugLibre(nombre: string) {
		const base =
			nombre
				.normalize("NFD")
				.replace(/[̀-ͯ]/g, "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") || "categoria";

		for (let n = 0; ; n++) {
			const slug = n === 0 ? base : `${base}-${n + 1}`;

			const [choca] = await this.db
				.select({ id: e.categorias.id })
				.from(e.categorias)
				.where(eq(e.categorias.slug, slug))
				.limit(1);

			if (!choca) return slug;
		}
	}
}

/** En inglés porque es lo que el backoffice y el catálogo ya leen. */
/**
 * La categoría con los nombres que lee el front (`name`, `image`…).
 *
 * La usan TAMBIÉN `/publico/categorias`: estuvo devolviendo las filas crudas
 * (`nombre`, `imagenUrl`) y los chips del catálogo se quedaban sin nombre.
 */
export function aSalida(fila: typeof e.categorias.$inferSelect) {
	return {
		id: fila.id,
		name: fila.nombre,
		slug: fila.slug,
		description: fila.descripcion,
		image: fila.imagenUrl,
		createdAt: fila.creadoEn.toISOString(),
	};
}
