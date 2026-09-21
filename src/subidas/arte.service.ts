import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AlmacenService } from "../almacen/almacen.service";

type Cuerpo = Record<string, any>;

/** Lo que tarda alguien en darle a "agregar" y que el navegador suba. */
const VIGENCIA_S = 900;

/**
 * Topes por archivo.
 *
 * El arte de un lado a 300 dpi ronda los pocos MB; 25 deja aire para un
 * diseño denso sin que quepa un vídeo. El diseño editable pesa menos, pero
 * lleva las fotos del cliente en base64 y por eso no es 1 MB.
 */
const MAXIMO: Record<string, number> = {
	arte: 25 * 1024 * 1024,
	colocacion: 25 * 1024 * 1024,
	/* La prenda real con el diseño encima. Sale de una foto de estudio
	   reescalada a 1600 px de ancho, así que pesa menos que el arte; el mismo
	   tope evita tener que pensarlo dos veces. */
	prenda: 25 * 1024 * 1024,
	/* El MISMO arte en trazos, para lo que no se imprime sino que se graba. Un
	   SVG es texto y pesa poco… salvo si alguien vectorizó una foto y trae
	   cuarenta mil trazos. Ahí el tope es la defensa. */
	vector: 12 * 1024 * 1024,
	diseno: 10 * 1024 * 1024,
};

/* Cuatro archivos por lado —arte, colocación, prenda real y, en los productos
   de grabado, el vector— más el diseño. Con seis lados son veinticinco; se
   deja en veintiséis. */
const MAXIMO_ARCHIVOS = 26;

const TIPOS: Record<string, string> = {
	arte: "image/png",
	colocacion: "image/png",
	prenda: "image/png",
	vector: "image/svg+xml",
	diseno: "application/json",
};

/** Con qué extensión se guarda cada uno. Todo era `.png` hasta que entró el láser. */
const EXTENSION: Record<string, string> = { vector: "svg", diseno: "json" };

const limpio = (v: unknown) =>
	String(v ?? "")
		.replace(/[^a-zA-Z0-9-_]/g, "")
		.slice(0, 30);

/**
 * Las subidas del arte del carrito y de los invitados de un evento.
 *
 * POR QUÉ ES PÚBLICA. El arte se sube al AGREGAR al carrito y no al pagar. Si
 * esperara al pago, el carrito tendría que guardar los archivos mientras
 * tanto, y no caben: un arte a 300 dpi son varios MB y el diseño editable
 * lleva dentro las fotos del cliente. `localStorage` da unos 5 MB para todo el
 * sitio.
 *
 * El precio de esa decisión es firmar escrituras sin sesión. Se acota con lo
 * único que se puede acotar aquí:
 *
 * - **El destino lo decide el servidor.** El `itemId` se genera aquí; del
 *   cuerpo no sale ni una parte de la ruta. Si viniera del cliente, se podría
 *   escribir sobre el arte de un pedido ajeno.
 * - **El tipo está cerrado**: PNG para el arte, SVG para el vector, JSON para
 *   el diseño.
 * - **El tamaño se firma** (`urlParaMedios` lo mete en la firma): subir otra
 *   cosa la invalida.
 * - **Todo caduca**: `carritos/` a los 30 días y `eventos/` a los 90, por
 *   regla del bucket, porque la mayor parte de esto es de gente que nunca
 *   llega a comprar.
 */
@Injectable()
export class ArteService {
	constructor(private readonly almacen: AlmacenService) {}

	/**
	 * `prefijo` sólo lo construyen rutas del servidor. En eventos incluye el id
	 * del evento y del producto, para que una referencia no se pueda reutilizar
	 * en otro artículo del mismo enlace compartido.
	 */
	async firmar(
		cuerpo: Cuerpo,
		prefijo: "carritos" | `eventos/${string}/${string}` = "carritos",
	) {
		const archivos = Array.isArray(cuerpo?.archivos) ? cuerpo.archivos : [];

		if (archivos.length === 0) {
			throw new BadRequestException("No dijiste qué vas a subir");
		}
		if (archivos.length > MAXIMO_ARCHIVOS) {
			throw new BadRequestException(
				`Demasiados archivos de una vez (${archivos.length}). El máximo es ${MAXIMO_ARCHIVOS}.`,
			);
		}

		const itemId = randomUUID();

		const subidas = await Promise.all(
			archivos.map(async (a: Cuerpo) => {
				const tipo = String(a?.tipo ?? "");

				if (!(tipo in MAXIMO)) {
					throw new BadRequestException(
						`Tipo de archivo desconocido: ${tipo || "(vacío)"}. Usa ${Object.keys(MAXIMO).join(", ")}.`,
					);
				}

				const bytes = Math.trunc(Number(a?.bytes ?? 0));
				if (!(bytes > 0)) {
					throw new BadRequestException("Falta cuánto pesa el archivo");
				}
				if (bytes > MAXIMO[tipo]) {
					throw new BadRequestException(
						`Ese archivo pasa de ${Math.round(MAXIMO[tipo] / 1024 / 1024)} MB, que es el máximo`,
					);
				}

				const lado = limpio(a?.lado);
				if (tipo !== "diseno" && !lado) {
					throw new BadRequestException("Falta de qué lado es el archivo");
				}

				const nombre =
					tipo === "diseno"
						? "diseno.json"
						: `${lado}-${tipo}.${EXTENSION[tipo] ?? "png"}`;

				const { uploadUrl, url } = await this.almacen.urlParaMedios(
					`${prefijo}/${itemId}/${nombre}`,
					TIPOS[tipo],
					bytes,
					VIGENCIA_S,
				);

				return { tipo, lado: lado || null, ruta: url, uploadUrl };
			}),
		);

		return { itemId, subidas };
	}
}
