import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
