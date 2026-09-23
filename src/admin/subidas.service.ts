import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AlmacenService } from "../almacen/almacen.service";

const TIPOS = new Map([
	["image/png", "png"],
	["image/jpeg", "jpg"],
	["image/webp", "webp"],
]);

/**
 * Las carpetas donde el admin puede escribir imágenes que NO son mockups.
 *
 * ES LISTA BLANCA porque el nombre llega del navegador: sin ella, una petición
 * podría pedir `carpeta: "mockups/tshirt"` y sobrescribir el mockup de una
 * plantilla en uso.
 */
const CARPETAS = new Set(["categorias", "productos", "banners"]);

/**
 * El tope de una subida del backoffice. Los mockups de plantilla son grandes;
 * está para que un descuido no meta un vídeo, no para apretar.
 */
const MAXIMO = 25 * 1024 * 1024;

/**
 * El tamaño que declara el navegador, que es el que se firma.
 *
 * TIENE QUE SER EL DE VERDAD: S3 exige que el `Content-Length` del PUT sea
 * EXACTAMENTE el firmado, así que declarar de menos no sirve para colar un
 * archivo grande —la firma deja de valer— y declarar el máximo a ciegas, como
 * se hacía antes, hacía fallar toda subida que no pesara justo 25 MB.
 */
function tamano(v: unknown) {
	const n = Number(v);
	if (!Number.isInteger(n) || n <= 0) {
		throw new BadRequestException("Falta el tamaño del archivo");
	}
	if (n > MAXIMO) {
		throw new BadRequestException(
			`El archivo pesa demasiado. El máximo son ${Math.round(MAXIMO / 1024 / 1024)} MB.`,
		);
	}
	return n;
}

/** Todo lo que llega del navegador y acaba en una llave de S3 pasa por aquí. */
const limpio = (s: unknown) =>
	String(s ?? "")
		.replace(/[^a-zA-Z0-9-_]/g, "")
		.slice(0, 60);

/**
 * Permiso para subir un archivo directo a S3.
 *
 * EL ARCHIVO NUNCA PASA POR LA API: el navegador hace PUT contra la URL
 * firmada. Así no se paga ancho de banda moviendo bytes dos veces ni se topa
 * uno con ningún límite de tamaño de petición.
 *
 * DEVUELVE UNA RUTA (`/mockups/...`), NO LA URL DE S3, y es deliberado: los
 * mockups se leen desde el mismo origen que el sitio, porque el teñido de
 * prenda hace `getImageData()` sobre ellos y desde otro origen el canvas queda
 * contaminado y el teñido se apaga sin avisar.
 */
@Injectable()
export class SubidasService {
	constructor(private readonly almacen: AlmacenService) {}

	async urlParaMockup(cuerpo: Record<string, unknown>) {
		const contentType = String(cuerpo.contentType ?? "");
		const ext = extension(contentType);

		const templateId = limpio(cuerpo.templateId);
		const side = limpio(cuerpo.side);

		if (!templateId || !side) {
			throw new BadRequestException("Falta templateId o side");
		}

		/* Nombre único por subida: al ser inmutable se puede cachear para
		   siempre, y re-subir un lado no obliga a invalidar nada. */
		const llave = `mockups/${templateId}/${side}-${randomBytes(6).toString("hex")}.${ext}`;

		return this.firmar(llave, contentType, tamano(cuerpo.bytes));
	}

	/**
	 * Permiso para subir una imagen del catálogo (la foto de una categoría, por
	 * ejemplo).
	 *
	 * Viven bajo `medios/` para que `/mockups/*` siga siendo sólo mockups: son
	 * dos comportamientos distintos de caché.
	 */
	async urlParaImagen(cuerpo: Record<string, unknown>) {
		const contentType = String(cuerpo.contentType ?? "");
		const ext = extension(contentType);
		const carpeta = limpio(cuerpo.carpeta);

		if (!CARPETAS.has(carpeta)) {
			throw new BadRequestException(
				`Carpeta no permitida: ${carpeta || "(vacía)"}. Usa ${[...CARPETAS].join(", ")}.`,
			);
		}

		const llave = `medios/${carpeta}/${randomBytes(8).toString("hex")}.${ext}`;
		return this.firmar(llave, contentType, tamano(cuerpo.bytes));
	}

	private async firmar(llave: string, contentType: string, bytes: number) {
		const { uploadUrl, url } = await this.almacen.urlParaMedios(
			llave,
			contentType,
			bytes,
		);

		/* `path` y no `url`: es el nombre que el backoffice ya lee. */
		return { uploadUrl, path: url };
	}
}

function extension(contentType: string) {
	const ext = TIPOS.get(contentType);

	if (!ext) {
		throw new BadRequestException(
			`Tipo no soportado: ${contentType}. Usa PNG, JPG o WebP.`,
		);
	}

	return ext;
}
