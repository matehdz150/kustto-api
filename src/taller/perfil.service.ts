import { randomBytes } from "node:crypto";
import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/identidad";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

/** Lo que cabe en una foto de producto. */
const MAXIMO_FOTO = 25 * 1024 * 1024;

const TIPOS = new Map([
	["image/png", "png"],
	["image/jpeg", "jpg"],
	["image/webp", "webp"],
]);

const CP = /^\d{5}$/;
const texto = (v: unknown) => String(v ?? "").trim();

@Injectable()
export class TallerService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
	) {}

	/**
	 * Su perfil.
	 *
	 * Si la cuenta existe pero no el taller, el alta se quedó a medias. Aquí,
	 * al revés que con el comprador, la fila la crea el admin y su ausencia es
	 * un problema, no un estado normal.
	 */
	async yo(quien: Identidad) {
		const [fila] = await this.db
			.select()
			.from(e.talleres)
			.where(eq(e.talleres.id, quien.sub))
			.limit(1);

		if (!fila) {
			throw new NotFoundException(
				"Tu taller no está dado de alta. Escríbenos para terminarlo.",
			);
		}

		return aSalida(fila);
	}

	/**
	 * Edita su perfil.
	 *
	 * LISTA BLANCA: el taller no puede cambiarse el id, el correo ni el slug
	 * desde aquí. Sin esto, un PATCH podría reescribir su identidad — y el
	 * correo es parte de su identidad local.
	 */
	async actualizar(quien: Identidad, cuerpo: Record<string, any>) {
		await this.yo(quien);

		const cambios: Partial<typeof e.talleres.$inferInsert> = {
			actualizadoEn: new Date(),
		};

		if (cuerpo.displayName !== undefined) {
			cambios.nombrePublico = texto(cuerpo.displayName) || null;
		}
		if (cuerpo.bio !== undefined) cambios.bio = texto(cuerpo.bio) || null;
		if (cuerpo.avatarUrl !== undefined) {
			cambios.avatarUrl = this.rutaNuestra(cuerpo.avatarUrl, "el avatar");
		}
		if (cuerpo.bannerUrl !== undefined) {
			cambios.bannerUrl = this.rutaNuestra(cuerpo.bannerUrl, "el banner");
		}
		if (cuerpo.whatsapp !== undefined) {
			cambios.whatsapp = texto(cuerpo.whatsapp) || null;
		}
		if (cuerpo.recoleccion !== undefined) {
			cambios.recoleccion = this.leerRecoleccion(cuerpo.recoleccion);
		}

		if (Object.keys(cambios).length === 1) {
			throw new BadRequestException("Nada que actualizar");
		}

		const [fila] = await this.db
			.update(e.talleres)
			.set(cambios)
			.where(eq(e.talleres.id, quien.sub))
			.returning();

		return aSalida(fila);
	}

	/** Las plantillas de prenda, para el asistente de alta. */
	async plantillas() {
		const filas = await this.db
			.select()
			.from(e.plantillasDePrenda)
			.orderBy(asc(e.plantillasDePrenda.nombre));

		return filas.map((p) => ({ id: p.id, name: p.nombre, data: p.datos }));
	}

	async categorias() {
		const filas = await this.db
			.select()
			.from(e.categorias)
			.orderBy(asc(e.categorias.orden), asc(e.categorias.nombre));

		return filas.map((c) => ({
			id: c.id,
			name: c.nombre,
			slug: c.slug,
			image: c.imagenUrl,
		}));
	}

	/**
	 * Permiso para subir una foto de producto.
	 *
	 * QUIÉN DECIDE LA CARPETA — Y POR QUÉ IMPORTA. El prefijo sale del `sub`
	 * del token, NUNCA del cuerpo de la petición. Las credenciales de la API
	 * pueden escribir en todo `medios/productos/*` —IAM no sabe de talleres—,
	 * así que lo único que impide que un taller escriba sobre las fotos de otro
	 * es esta línea. Si algún día la carpeta llega en el cuerpo, la separación
	 * entre talleres se acabó sin que nadie lo note.
	 */
	async urlParaFoto(quien: Identidad, cuerpo: Record<string, any>) {
		const contentType = String(cuerpo.contentType ?? "");
		const ext = TIPOS.get(contentType);

		if (!ext) {
			throw new BadRequestException(
				`Tipo no soportado: ${contentType}. Usa PNG, JPG o WebP.`,
			);
		}

		const llave = `medios/productos/${quien.sub}/${randomBytes(8).toString("hex")}.${ext}`;

		/* EL TAMAÑO FIRMADO ES EL QUE DECLARA EL NAVEGADOR, no el máximo: S3
		   exige que el `Content-Length` del PUT sea exactamente el firmado, así
		   que firmar 25 MB a ciegas hacía fallar toda foto que no pesara justo
		   eso. Declarar de menos tampoco cuela nada: la firma deja de valer. */
		const bytes = Number(cuerpo.bytes);
		if (!Number.isInteger(bytes) || bytes <= 0) {
			throw new BadRequestException("Falta el tamaño de la foto");
		}
		if (bytes > MAXIMO_FOTO) {
			throw new BadRequestException(
				`Esa foto pesa demasiado. El máximo son ${Math.round(MAXIMO_FOTO / 1024 / 1024)} MB.`,
			);
		}

		const { uploadUrl, url } = await this.almacen.urlParaMedios(
			llave,
			contentType,
			bytes,
		);

		/* `path` y no `url`: es el nombre que el asistente ya lee. */
		return { uploadUrl, path: url };
	}

	/**
	 * Una ruta NUESTRA, no una enlazada de fuera.
	 *
	 * Misma regla que en las fotos de prenda: la composición se hace en un
	 * lienzo del navegador y una imagen de otro origen lo contamina. Y evita
	 * que un cuerpo manipulado cuelgue una imagen ajena dentro del perfil
	 * público del taller.
	 */
	private rutaNuestra(valor: unknown, comoSeLlama: string) {
		const ruta = texto(valor);
		if (!ruta) return null;

		if (!ruta.startsWith("/medios/")) {
			throw new BadRequestException(
				`${comoSeLlama} tiene que estar subido aquí, no enlazado de fuera`,
			);
		}

		return ruta;
	}

	/**
	 * De dónde recoge la paquetería.
	 *
	 * SIN ESTO EL TALLER NO PUEDE ENVIAR, y el checkout lo usa para ofrecer
	 * "recoger con el taller" en vez de enseñar una pantalla rota. La colonia
	 * es tan obligatoria como el resto: Skydropx la exige y sin ella rechaza la
	 * cotización entera en vez de adivinarla.
	 */
	private leerRecoleccion(valor: unknown) {
		if (valor === null) return null;

		const r = (valor ?? {}) as Record<string, unknown>;

		const recoleccion = {
			calle: texto(r.calle),
			numero: texto(r.numero),
			interior: texto(r.interior) || null,
			colonia: texto(r.colonia),
			ciudad: texto(r.ciudad),
			estado: texto(r.estado),
			cp: texto(r.cp),
			referencias: texto(r.referencias) || null,
		};

		for (const [campo, comoSeLlama] of [
			["calle", "la calle"],
			["numero", "el número"],
			["colonia", "la colonia"],
			["ciudad", "la ciudad"],
			["estado", "el estado"],
		] as const) {
			if (!recoleccion[campo]) {
				throw new BadRequestException(
					`Falta ${comoSeLlama} de tu dirección de recolección`,
				);
			}
		}

		if (!CP.test(recoleccion.cp)) {
			throw new BadRequestException("El código postal va a cinco dígitos");
		}

		return recoleccion;
	}
}

function aSalida(fila: typeof e.talleres.$inferSelect) {
	return {
		id: fila.id,
		email: fila.correo,
		name: fila.nombre,
		slug: fila.slug,
		displayName: fila.nombrePublico,
		bio: fila.bio,
		avatarUrl: fila.avatarUrl,
		bannerUrl: fila.bannerUrl,
		whatsapp: fila.whatsapp,
		recoleccion: fila.recoleccion,
		/* Lo que lleva gastado de más en guías y todavía no se le cobra. */
		saldoEnvios: Number(fila.saldoEnvios),
		cargosEnvio: fila.cargosEnvio,
		createdAt: fila.creadoEn.toISOString(),
	};
}
