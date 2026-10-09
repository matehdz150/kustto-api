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

/**
 * Los códigos de mapeo que el editor sabe dibujar. Cada uno es un módulo de
 * `lib/prenda/mapeo*.ts` en el front: añadir uno aquí sin su mapeo dejaría un
 * modelo en la galería que el editor no puede estampar.
 */
export const MAPEOS_3D = [
	"playera",
	"sudadera",
	"gorra",
	"taza",
	"termo",
	"pluma",
	/**
	 * El que no tiene código propio: el diseño se proyecta sobre las zonas que el
	 * admin colocó a mano (`params.zonas`). Es el que sirve para cojines, totes y
	 * cualquier objeto nuevo sin tocar código.
	 */
	"generico",
] as const;
export type Mapeo3d = (typeof MAPEOS_3D)[number];

/**
 * La galería de modelos 3D del backoffice.
 *
 * Una plantilla (mockup) tiene a lo más UN modelo y el proveedor no lo elige:
 * elige la plantilla y el modelo viene con ella. Ver `modelos3d` en el esquema.
 */
@Injectable()
export class Modelos3dService {
	constructor(@Inject(DB) private readonly db: Db) {}

	/** Cada modelo con las plantillas que lo usan, para la galería. */
	async listar() {
		const [modelos, plantillas] = await Promise.all([
			this.db.select().from(e.modelos3d).orderBy(asc(e.modelos3d.nombre)),
			this.db
				.select({
					id: e.plantillasDePrenda.id,
					nombre: e.plantillasDePrenda.nombre,
					modelo: e.plantillasDePrenda.modelo3dId,
				})
				.from(e.plantillasDePrenda)
				.orderBy(asc(e.plantillasDePrenda.nombre)),
		]);

		return modelos.map((m) => ({
			...aSalida(m),
			plantillas: plantillas
				.filter((p) => p.modelo === m.id)
				.map((p) => ({ id: p.id, name: p.nombre })),
		}));
	}

	async crear(cuerpo: Record<string, unknown>) {
		const dto = validar(cuerpo);
		if (!dto.id) throw new BadRequestException("Falta el id");

		const [fila] = await this.db
			.insert(e.modelos3d)
			.values({ ...dto, id: dto.id })
			.onConflictDoNothing()
			.returning();

		if (!fila) {
			throw new ConflictException(`Ya existe un modelo con id "${dto.id}"`);
		}
		return aSalida(fila);
	}

	async actualizar(id: string, cuerpo: Record<string, unknown>) {
		const dto = validar({ ...cuerpo, id });

		const [fila] = await this.db
			.update(e.modelos3d)
			.set({
				nombre: dto.nombre,
				mapeo: dto.mapeo,
				glbUrl: dto.glbUrl,
				miniaturaUrl: dto.miniaturaUrl,
				params: dto.params,
				actualizadoEn: new Date(),
			})
			.where(eq(e.modelos3d.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Modelo no encontrado");
		return aSalida(fila);
	}

	/**
	 * SI HAY PLANTILLAS QUE LO USAN, NO SE BORRA: la clave las dejaría sin modelo
	 * y sus productos pasarían de 3D a fotos sin que nadie lo decidiera.
	 */
	async borrar(id: string) {
		const usadas = await this.db
			.select({ id: e.plantillasDePrenda.id })
			.from(e.plantillasDePrenda)
			.where(eq(e.plantillasDePrenda.modelo3dId, id));

		if (usadas.length > 0) {
			throw new ConflictException(
				`Lo usan ${usadas.length} plantilla${usadas.length === 1 ? "" : "s"}. ` +
					"Quítaselo antes de borrarlo.",
			);
		}

		const [fila] = await this.db
			.delete(e.modelos3d)
			.where(eq(e.modelos3d.id, id))
			.returning();

		if (!fila) throw new NotFoundException("Modelo no encontrado");
		return { ok: true };
	}
}

export function aSalida(fila: typeof e.modelos3d.$inferSelect) {
	return {
		id: fila.id,
		name: fila.nombre,
		mapeo: fila.mapeo as Mapeo3d,
		glbUrl: fila.glbUrl,
		thumbnailUrl: fila.miniaturaUrl,
		params: fila.params,
	};
}

/** Lo que el editor y la ficha necesitan de un modelo, sin lo de la galería. */
export function modeloDeFicha(fila: typeof e.modelos3d.$inferSelect) {
	return {
		id: fila.id,
		mapeo: fila.mapeo as Mapeo3d,
		glbUrl: fila.glbUrl,
		params: fila.params,
	};
}

function url(valor: unknown, campo: string): string | null {
	const v = typeof valor === "string" ? valor.trim() : "";
	if (!v) return null;
	// Una ruta del mismo sitio o una URL https: nada de `javascript:` ni `data:`.
	if (!(v.startsWith("/") && !v.startsWith("//")) && !/^https:\/\//.test(v)) {
		throw new BadRequestException(
			`${campo} debe ser una ruta del sitio (/modelos/…) o una URL https`,
		);
	}
	return v;
}

type Vec3 = [number, number, number];

function vec3(v: unknown, campo: string, positivo = false): Vec3 {
	if (
		!Array.isArray(v) ||
		v.length !== 3 ||
		!v.every((n) => typeof n === "number" && Number.isFinite(n))
	) {
		throw new BadRequestException(`${campo} debe ser una lista de 3 números`);
	}
	if (positivo && v.some((n: number) => n <= 0)) {
		throw new BadRequestException(`${campo} debe ser mayor que cero`);
	}
	return v as Vec3;
}

/**
 * Los límites del ajuste de luz. Son los mismos que recorren los deslizadores
 * del admin (`RANGOS_DE_LUZ` en el front): un valor fuera de rango apagaría el
 * modelo por completo o lo quemaría.
 */
const RANGOS_LUZ: Record<string, [number, number]> = {
	ambiente: [0, 3],
	principal: [0, 3],
	relleno: [0, 3],
	exposicion: [0.3, 2.5],
	direccion: [-180, 180],
};

/**
 * El ajuste de luz del modelo: multiplicadores sobre el equipo de luces que ya
 * trae cada visor. Lo que no viene se queda sin guardar (= neutro).
 */
function validarLuz(crudo: unknown) {
	if (crudo === undefined || crudo === null) return undefined;
	if (typeof crudo !== "object") {
		throw new BadRequestException("El ajuste de luz no es válido");
	}
	const luz: Record<string, number> = {};
	for (const [clave, valor] of Object.entries(crudo)) {
		const rango = RANGOS_LUZ[clave];
		if (!rango)
			throw new BadRequestException(`Ajuste de luz desconocido: ${clave}`);
		if (typeof valor !== "number" || !Number.isFinite(valor)) {
			throw new BadRequestException(`La luz «${clave}» debe ser un número`);
		}
		if (valor < rango[0] || valor > rango[1]) {
			throw new BadRequestException(
				`La luz «${clave}» va de ${rango[0]} a ${rango[1]}`,
			);
		}
		luz[clave] = valor;
	}
	return Object.keys(luz).length > 0 ? luz : undefined;
}

/**
 * Lo que un modelo guarda en `params`: la luz (todos los mapeos) y, en el
 * genérico, las zonas de impresión que el admin colocó a mano — por cara, dónde
 * está la caja de proyección (posición y giro, en unidades del modelo) y cuánto
 * mide (`escala` = ancho, alto y profundidad). Se valida entero: una zona con un
 * `NaN` dejaría el editor sin poder dibujar el modelo.
 */
function validarParams(mapeo: string, crudo: unknown) {
	const params = (crudo ?? {}) as { zonas?: unknown; luz?: unknown };
	const luz = validarLuz(params.luz);
	const salida: Record<string, unknown> = luz ? { luz } : {};
	if (mapeo !== "generico") return salida;

	const zonas = params.zonas as Record<string, unknown> | undefined;
	if (!zonas || typeof zonas !== "object" || Object.keys(zonas).length === 0) {
		throw new BadRequestException(
			"Un modelo genérico necesita al menos una zona de impresión",
		);
	}

	const limpias: Record<
		string,
		{ posicion: Vec3; rotacion: Vec3; escala: Vec3 }
	> = {};
	for (const [lado, z] of Object.entries(zonas)) {
		if (!/^[a-z][a-z0-9]{0,19}$/.test(lado)) {
			throw new BadRequestException(`Nombre de cara no válido: ${lado}`);
		}
		const zona = z as Record<string, unknown>;
		limpias[lado] = {
			posicion: vec3(zona.posicion, `La posición de ${lado}`),
			rotacion: vec3(zona.rotacion, `El giro de ${lado}`),
			escala: vec3(zona.escala, `El tamaño de ${lado}`, true),
		};
	}
	return { ...salida, zonas: limpias };
}

function validar(cuerpo: Record<string, unknown>) {
	const id = String(cuerpo.id ?? "").trim();
	const nombre = String(cuerpo.name ?? "").trim();
	const mapeo = String(cuerpo.mapeo ?? "").trim();

	if (id && !/^[a-z0-9-]{2,50}$/.test(id)) {
		throw new BadRequestException(
			"El id debe ser minúsculas, números o guiones",
		);
	}
	if (!nombre) throw new BadRequestException("Falta el nombre");
	if (!(MAPEOS_3D as readonly string[]).includes(mapeo)) {
		throw new BadRequestException(
			`Mapeo desconocido: ${mapeo || "(vacío)"}. Usa ${MAPEOS_3D.join(", ")}.`,
		);
	}

	return {
		id,
		nombre,
		mapeo,
		glbUrl: url(cuerpo.glbUrl, "El archivo 3D"),
		miniaturaUrl: url(cuerpo.thumbnailUrl, "La miniatura"),
		params: validarParams(mapeo, cuerpo.params),
	};
}
