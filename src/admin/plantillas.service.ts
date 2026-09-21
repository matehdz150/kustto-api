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

/** El área imprimible de un lado, en unidades del lienzo del editor. */
type Area = {
	id: string;
	type: "rect";
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * Qué FORMA tiene el objeto, que NO es lo mismo que cuántos lados tiene.
 *
 * VIVE EN LA PLANTILLA Y NO EN EL PRODUCTO a propósito: ser un cilindro es una
 * propiedad del OBJETO. Si viviera en el producto, dos talleres que usan la
 * misma plantilla de taza podrían discrepar sobre si es un cilindro, y eso no
 * significa nada.
 *
 * DECIDE COSAS QUE LA PLANTILLA YA DECIDE: un cilindro tiene UN lado —la
 * envoltura entera— y su previsualización no la puede hacer la homografía que
 * proyecta planos, sino el mapeo cilíndrico.
 *
 * `cono` SE ACEPTA Y TODAVÍA NO SE USA. Está aquí desde el primer día porque
 * un vaso tumbler casi siempre se estrecha, y ahí el dibujo plano deja de ser
 * un rectángulo: es un sector de corona circular. Meterle un rectángulo saca
 * el estampado torcido. Tenerlo en el enum desde ahora es un valor más;
 * añadirlo después es migrar todas las plantillas.
 */
type Forma = "plano" | "cilindro" | "cono";
const FORMAS: Forma[] = ["plano", "cilindro", "cono"];

type DatosPlantilla = {
	forma?: Forma;
	sides: string[];
	sideLabels: Record<string, string>;
	mockups: Record<string, string>;
	editableAreas: Record<string, Area[]>;
};

/**
 * Las plantillas de prenda: lo que el editor necesita para montar el lienzo.
 *
 * Los campos salen en INGLÉS (`name`, `data`, `sides`) porque es lo que el
 * asistente del backoffice y el editor ya leen. Ver el comentario de `Ficha`
 * en el catálogo: la migración cambia de dónde salen los datos, no cómo se
 * pintan.
 */
@Injectable()
export class PlantillasService {
	constructor(@Inject(DB) private readonly db: Db) {}

	async listar() {
		const filas = await this.db
			.select()
			.from(e.plantillasDePrenda)
			.orderBy(asc(e.plantillasDePrenda.nombre));

		return filas.map(aSalida);
	}

	async obtener(id: string) {
		const [fila] = await this.db
			.select()
			.from(e.plantillasDePrenda)
			.where(eq(e.plantillasDePrenda.id, id))
			.limit(1);

		if (!fila) throw new NotFoundException("Plantilla no encontrada");
		return aSalida(fila);
	}

	async crear(cuerpo: Record<string, unknown>) {
		const dto = validar(cuerpo);

		const [fila] = await this.db
			.insert(e.plantillasDePrenda)
			.values({ id: dto.id, nombre: dto.name, datos: dto.data })
			/* Sin esto, crear dos veces el mismo id sobrescribiría la plantilla
			   sin avisar — y una plantilla en uso pisada deja de cuadrar con los
			   productos que ya la referencian. */
			.onConflictDoNothing()
			.returning();

		if (!fila) {
			throw new ConflictException(`Ya existe una plantilla con id "${dto.id}"`);
		}

		return { id: fila.id };
	}

	async actualizar(id: string, cuerpo: Record<string, unknown>) {
		const cambios: Partial<typeof e.plantillasDePrenda.$inferInsert> = {
			actualizadoEn: new Date(),
		};

		if (cuerpo.name !== undefined) {
			const nombre = String(cuerpo.name).trim();
			if (!nombre) throw new BadRequestException("Falta el nombre");
			cambios.nombre = nombre;
		}

		if (cuerpo.data !== undefined) {
			/* Se valida ENTERA aunque sea un PATCH: `data` se manda completa desde
			   el asistente, y aceptar una a medias dejaría una plantilla con un
			   lado sin mockup, que rompe el lienzo en silencio. */
			cambios.datos = validar({ id, name: "x", data: cuerpo.data }).data;
		}

		const [fila] = await this.db
			.update(e.plantillasDePrenda)
			.set(cambios)
			.where(eq(e.plantillasDePrenda.id, id))
			.returning();

		/* Sin esto, un PATCH a un id inexistente CREABA la plantilla a medias en
		   DynamoDB. Aquí un UPDATE que no encuentra fila no devuelve nada. */
		if (!fila) throw new NotFoundException("Plantilla no encontrada");

		return { ok: true };
	}

	/**
	 * Borra la plantilla.
	 *
	 * SI HAY PRODUCTOS QUE LA USAN, NO SE BORRA. La clave foránea los dejaría
	 * en `null` y el editor se quedaría sin con qué montar el lienzo de un
	 * producto publicado; es mejor decir cuántos son y que alguien decida.
	 */
	async borrar(id: string) {
		const usada = await this.db
			.select({ id: e.productos.id })
			.from(e.productos)
			.where(eq(e.productos.plantillaId, id));

		if (usada.length > 0) {
			throw new ConflictException(
				`La usan ${usada.length} producto${usada.length === 1 ? "" : "s"}. ` +
					"Cámbiales la plantilla antes de borrarla.",
			);
		}

		const [fila] = await this.db
			.delete(e.plantillasDePrenda)
			.where(eq(e.plantillasDePrenda.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Plantilla no encontrada");
		return { ok: true };
	}
}

function aSalida(fila: typeof e.plantillasDePrenda.$inferSelect) {
	return {
		id: fila.id,
		name: fila.nombre,
		data: fila.datos,
		createdAt: fila.creadoEn.toISOString(),
		updatedAt: fila.actualizadoEn.toISOString(),
	};
}

/**
 * Lo que entra aquí define lo que el editor puede dibujar, y un lado sin
 * mockup o sin área rompe el lienzo en silencio. Por eso se comprueba en el
 * MODELO y no sólo en el asistente: el asistente es una pantalla.
 */
function validar(cuerpo: Record<string, unknown>) {
	const id = String(cuerpo.id ?? "").trim();
	const name = String(cuerpo.name ?? "").trim();
	const data = cuerpo.data as DatosPlantilla | undefined;

	if (!/^[a-z0-9-]{2,50}$/.test(id)) {
		throw new BadRequestException(
			"El id debe ser minúsculas, números o guiones",
		);
	}
	if (!name) throw new BadRequestException("Falta el nombre");
	if (!data || !Array.isArray(data.sides) || data.sides.length === 0) {
		throw new BadRequestException("La plantilla necesita al menos un lado");
	}

	/* Ausente es `plano`: es lo que eran todas las plantillas antes de que esto
	   existiera, y reescribirlas para ponérselo sería tocar datos buenos. */
	const forma = (data.forma ?? "plano") as Forma;

	if (!FORMAS.includes(forma)) {
		throw new BadRequestException(
			`Forma desconocida: ${forma}. Usa ${FORMAS.join(", ")}.`,
		);
	}

	/* UN CILINDRO TIENE UN LADO. No es una restricción de forma: la envoltura
	   ES el objeto entero, y una taza con "delante" y "detrás" no significa
	   nada. */
	if (forma !== "plano" && data.sides.length !== 1) {
		throw new BadRequestException(
			"Un cilindro tiene un solo lado: la envoltura entera. Deja sólo uno.",
		);
	}

	for (const lado of data.sides) {
		if (!data.mockups?.[lado]) {
			throw new BadRequestException(`El lado "${lado}" no tiene mockup`);
		}
		if (!data.editableAreas?.[lado]?.length) {
			throw new BadRequestException(
				`El lado "${lado}" no tiene área imprimible`,
			);
		}
	}

	return { id, name, data: { ...data, forma } };
}
