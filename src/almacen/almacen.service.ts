import { Readable } from "node:stream";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable } from "@nestjs/common";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";

/**
 * S3, que es una de las dos piezas de AWS que se quedan.
 *
 * LOS BUCKETS SIGUEN CERRADOS. Nada se sirve público, ni los mockups: se leen
 * con credenciales y se reparten desde aquí. No es paranoia, es lo que hace
 * que el teñido de prenda funcione — el editor hace `getImageData()` sobre el
 * mockup, y desde otro origen el canvas queda contaminado y el teñido se apaga
 * sin decir nada. Por eso el front los pide a `/publico/mockups/*` y no a una
 * URL de S3.
 */
@Injectable()
export class AlmacenService {
	private readonly s3: S3Client;

	constructor(@Inject(ENTORNO) private readonly env: Entorno) {
		this.s3 = new S3Client({ region: env.AWS_REGION });
	}

	/**
	 * Una URL para que el navegador SUBA directo.
	 *
	 * El archivo no pasa por la API a propósito: el arte de un pedido son
	 * varios megas y atarlos a la petición que espera el comprador es pagar el
	 * ancho de banda dos veces y arriesgar un timeout a mitad.
	 */
	async urlParaSubir(clave: string, tipo: string, segundos = 900) {
		const orden = new PutObjectCommand({
			Bucket: this.env.S3_BUCKET_PRIVADO,
			Key: clave,
			ContentType: tipo,
		});

		return {
			url: await getSignedUrl(this.s3, orden, { expiresIn: segundos }),
			clave,
		};
	}

	/**
	 * Una URL firmada para subir al bucket PÚBLICO.
	 *
	 * "Público" es el nombre del bucket, no su política: sigue cerrado y se
	 * sirve por rewrite desde nuestro origen. Ahí van los medios que el editor
	 * vuelve a cargar —imágenes de la biblioteca, diseños guardados—, y por eso
	 * lo que se devuelve es una RUTA RELATIVA y nunca la de S3: el editor la
	 * mete en un lienzo y luego exporta ese lienzo, y una imagen de otro origen
	 * lo contamina y `toDataURL` empieza a lanzar `SecurityError`.
	 *
	 * EL TAMAÑO VA DENTRO DE LA FIRMA (`ContentLength`), así que lo aplica S3.
	 * Sin eso el tope sería una promesa de la que nadie se encarga.
	 */
	async urlParaMedios(
		clave: string,
		tipo: string,
		bytes: number,
		segundos = 300,
	) {
		const orden = new PutObjectCommand({
			Bucket: this.env.S3_BUCKET_PUBLICO,
			Key: clave,
			ContentType: tipo,
			ContentLength: bytes,
		});

		return {
			uploadUrl: await getSignedUrl(this.s3, orden, { expiresIn: segundos }),
			url: `/${clave}`,
		};
	}

	/**
	 * Copia un objeto dentro del bucket, de servidor a servidor.
	 *
	 * NINGÚN BYTE PASA POR EL NAVEGADOR, y de eso depende que ascender un
	 * diseño o repetir un pedido sea un clic: el arte son varios MB y ya está
	 * en S3. Que el navegador lo baje para volver a subirlo dobla el tráfico de
	 * algo que está a un metro de distancia.
	 *
	 * Devuelve `false` en vez de lanzar si el origen no está: quien llama
	 * decide si eso es fatal. Al ascender un diseño, sin el lienzo no hay
	 * diseño; sin la miniatura, sólo se ve peor.
	 */
	async copiar(desde: string, hasta: string) {
		try {
			await this.s3.send(
				new CopyObjectCommand({
					Bucket: this.env.S3_BUCKET_PUBLICO,
					CopySource: `${this.env.S3_BUCKET_PUBLICO}/${desde}`,
					Key: hasta,
				}),
			);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Guarda un JSON en el bucket PRIVADO.
	 *
	 * Privado y no público: lo usa el bordado para el diseño de entrada, que es
	 * un documento de trabajo y no un medio que nadie tenga que ver.
	 */
	async guardarJson(clave: string, contenido: unknown) {
		await this.s3.send(
			new PutObjectCommand({
				Bucket: this.env.S3_BUCKET_PRIVADO,
				Key: clave,
				Body: JSON.stringify(contenido),
				ContentType: "application/json",
				ServerSideEncryption: "AES256",
			}),
		);
	}

	/**
	 * Guarda un texto TAL CUAL en el bucket privado.
	 *
	 * Distinto de `guardarJson`, y la diferencia importa: aquí los bytes son el
	 * dato. El diseño de bordado se guarda con su serialización CANÓNICA
	 * —claves ordenadas, sin `undefined`— porque su sha256 es el `designHash`
	 * que el worker vuelve a comprobar. Con `JSON.stringify` los bytes salen
	 * distintos y el hash no cuadra nunca.
	 */
	async guardarTexto(clave: string, contenido: string, tipo: string) {
		await this.s3.send(
			new PutObjectCommand({
				Bucket: this.env.S3_BUCKET_PRIVADO,
				Key: clave,
				Body: contenido,
				ContentType: tipo,
				ServerSideEncryption: "AES256",
			}),
		);
	}

	/** Lee un objeto del bucket privado y lo devuelve como texto. */
	async leerTexto(clave: string) {
		const salida = await this.s3.send(
			new GetObjectCommand({ Bucket: this.env.S3_BUCKET_PRIVADO, Key: clave }),
		);

		return salida.Body!.transformToString();
	}

	/**
	 * Una URL firmada para LEER del bucket privado.
	 *
	 * El bucket nunca se abre, así que un artefacto de bordado —la vista previa
	 * del diseño preparado— sólo se puede enseñar así. Caduca pronto a
	 * propósito: es para pintarla ahora, no para guardarla.
	 */
	async urlParaLeer(clave: string, segundos = 900) {
		return getSignedUrl(
			this.s3,
			new GetObjectCommand({ Bucket: this.env.S3_BUCKET_PRIVADO, Key: clave }),
			{ expiresIn: segundos },
		);
	}

	/** Sube un archivo del disco al bucket privado, con su suma de comprobación. */
	async subirArchivo(
		clave: string,
		cuerpo: Buffer,
		tipo: string,
		sha256: string,
	) {
		await this.s3.send(
			new PutObjectCommand({
				Bucket: this.env.S3_BUCKET_PRIVADO,
				Key: clave,
				Body: cuerpo,
				ContentType: tipo,
				ServerSideEncryption: "AES256",
				Metadata: { sha256 },
			}),
		);
	}

	/** Nunca lanza: borrar un objeto que ya no está es el resultado buscado. */
	async borrar(clave: string) {
		await this.s3
			.send(
				new DeleteObjectCommand({
					Bucket: this.env.S3_BUCKET_PUBLICO,
					Key: clave,
				}),
			)
			.catch(() => undefined);
	}

	/** Leer un objeto para servirlo desde nuestro origen. Ver el comentario de arriba. */
	async leer(bucket: "publico" | "privado", clave: string) {
		const nombre =
			bucket === "publico" ? this.env.S3_BUCKET_PUBLICO : this.env.S3_BUCKET_PRIVADO;

		const salida = await this.s3.send(
			new GetObjectCommand({ Bucket: nombre, Key: clave }),
		);

		return {
			cuerpo: salida.Body as Readable,
			tipo: salida.ContentType ?? "application/octet-stream",
			largo: salida.ContentLength,
		};
	}
}
