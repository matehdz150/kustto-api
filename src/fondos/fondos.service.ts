import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { TopesService } from "../cuentas/topes.service";
import {
	claveDeEntrada,
	claveDeSalida,
	type Extension,
	extensionDe,
	leerPedido,
} from "./contrato";

type Trabajo = { extension: Extension; enviadoEn: number | null };

export type EstadoDeFondo = "subiendo" | "procesando" | "listo" | "fallo";

/**
 * Cuántas veces por hora puede una IP quitar un fondo.
 *
 * Se puede diseñar sin cuenta, así que esto no puede ir por usuario. Cada
 * trabajo son hasta 3 GB de Lambda durante varios segundos, y la cola admite
 * DOS a la vez: sin tope, una sola persona dejaría esperando a todos los
 * demás. Veinte a la hora sobra para alguien que está diseñando.
 */
const TOPE_POR_IP = 20;
const VENTANA_S = 60 * 60;

/** Lo que vive el trabajo en Redis. Pasado esto, su id ya no sirve. */
const VIDA_S = 60 * 60;

/**
 * Cuánto se espera antes de dar un trabajo por fallido.
 *
 * LA LAMBDA NO AVISA CUANDO FALLA: lanza, SQS vuelve a intentarlo y, a la
 * quinta, el mensaje va a la DLQ. Nada escribe un "falló" que se pueda leer,
 * y cada reintento espera a que la visibilidad caduque (18 minutos), así que
 * esperar a la DLQ sería dejar a alguien mirando un spinner hora y media.
 *
 * Arrancar en frío tardó 47 s en la prueba de despliegue; con la cola
 * ocupada puede haber uno delante. Tres minutos cubren eso con margen.
 */
const PLAZO_MS = 3 * 60 * 1000;

/**
 * Quitar el fondo de una imagen del editor.
 *
 * EL ARCHIVO NO PASA POR LA API, como en el resto de subidas: el navegador
 * sube directo a S3 con una URL firmada. La API decide la clave, avisa a la
 * cola cuando la subida terminó y sirve el resultado desde su origen —desde
 * S3 el PNG llegaría de otro origen y contaminaría el lienzo del editor—.
 *
 * NADIE ESPERA EN UNA PETICIÓN a que la Lambda termine: se devuelve un id y el
 * navegador pregunta. Es la regla de todo lo que depende de un tercero.
 */
@Injectable()
export class FondosService {
	private readonly s3: S3Client;
	private readonly sqs: SQSClient;

	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(REDIS) private readonly redis: IORedis,
		private readonly topes: TopesService,
	) {
		this.s3 = new S3Client({ region: env.AWS_REGION });
		this.sqs = new SQSClient({ region: env.AWS_REGION });
	}

	/** Reserva un trabajo y devuelve dónde subir la imagen. */
	async crear(cuerpo: unknown, ip: string | null) {
		const { bucket } = this.configuracion();

		const leido = leerPedido(cuerpo);
		if (!leido.ok) throw new BadRequestException(leido.error);
		const { tipo, bytes } = leido.pedido;

		// El tope va antes de firmar nada: rechazar tiene que salir gratis.
		if (ip)
			await this.topes.contar(
				`fondo-ip:${ip}`,
				TOPE_POR_IP,
				VENTANA_S,
				"Quitaste el fondo de muchas imágenes seguidas. Espera un rato y vuelve a probar.",
			);

		const id = randomUUID();
		const extension = extensionDe(tipo);
		await this.guardar(id, { extension, enviadoEn: null });

		/* El tamaño va DENTRO de la firma: lo hace cumplir S3, no una promesa
		   del navegador. */
		const uploadUrl = await getSignedUrl(
			this.s3,
			new PutObjectCommand({
				Bucket: bucket,
				Key: claveDeEntrada(id, extension),
				ContentType: tipo,
				ContentLength: bytes,
			}),
			{ expiresIn: 300 },
		);

		return { id, uploadUrl };
	}

	/**
	 * La subida terminó: a la cola.
	 *
	 * Se comprueba en S3 que la imagen está antes de mandar el mensaje. Si no,
	 * la Lambda fallaría al leerla, SQS la reintentaría cinco veces y el
	 * mensaje acabaría en la DLQ por una pestaña que se cerró a medias.
	 *
	 * Idempotente: un segundo aviso del mismo trabajo no manda otro mensaje.
	 */
	async procesar(id: string) {
		const { bucket, cola } = this.configuracion();
		const trabajo = await this.leer(id);
		if (trabajo.enviadoEn) return { estado: "procesando" as EstadoDeFondo };

		const entrada = claveDeEntrada(id, trabajo.extension);
		if (!(await this.existe(bucket, entrada)))
			throw new ConflictException("La imagen no terminó de subir.");

		await this.sqs.send(
			new SendMessageCommand({
				QueueUrl: cola,
				MessageBody: JSON.stringify({ input_key: entrada }),
			}),
		);
		await this.guardar(id, { ...trabajo, enviadoEn: Date.now() });
		return { estado: "procesando" as EstadoDeFondo };
	}

	async estado(id: string): Promise<{ estado: EstadoDeFondo }> {
		const { bucket } = this.configuracion();
		const trabajo = await this.leer(id);
		if (!trabajo.enviadoEn) return { estado: "subiendo" };
		if (await this.existe(bucket, claveDeSalida(id)))
			return { estado: "listo" };
		return {
			estado:
				Date.now() - trabajo.enviadoEn > PLAZO_MS ? "fallo" : "procesando",
		};
	}

	/** El PNG sin fondo, para servirlo desde nuestro origen. */
	async resultado(id: string) {
		const { bucket } = this.configuracion();
		await this.leer(id);

		const salida = await this.s3
			.send(new GetObjectCommand({ Bucket: bucket, Key: claveDeSalida(id) }))
			.catch((error) => {
				const nombre = (error as { name?: string })?.name;
				if (nombre === "NoSuchKey" || nombre === "NotFound")
					throw new NotFoundException("El fondo todavía no está quitado.");
				throw error;
			});

		return {
			cuerpo: salida.Body as Readable,
			largo: salida.ContentLength,
		};
	}

	private configuracion() {
		const bucket = this.env.FONDO_BUCKET;
		const cola = this.env.FONDO_COLA_URL;
		if (!bucket || !cola)
			throw new ServiceUnavailableException(
				"Quitar el fondo no está disponible por ahora.",
			);
		return { bucket, cola };
	}

	private async guardar(id: string, trabajo: Trabajo) {
		await this.redis.set(`fondo:${id}`, JSON.stringify(trabajo), "EX", VIDA_S);
	}

	/* El trabajo tiene que haberlo creado esta API. Así un id inventado no
	   sirve para leer —ni para meter en la cola— lo que haya en el bucket. */
	private async leer(id: string): Promise<Trabajo> {
		const crudo = await this.redis.get(`fondo:${id}`);
		if (!crudo)
			throw new NotFoundException("Ese trabajo no existe o ya caducó.");
		return JSON.parse(crudo) as Trabajo;
	}

	/* `HeadObject` responde 403 y no 404 cuando falta el objeto si el rol no
	   tiene ListBucket, que es el caso: las dos cosas quieren decir "no está". */
	private async existe(bucket: string, clave: string) {
		try {
			await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: clave }));
			return true;
		} catch (error) {
			const estado = (error as { $metadata?: { httpStatusCode?: number } })
				?.$metadata?.httpStatusCode;
			if (estado === 404 || estado === 403) return false;
			throw error;
		}
	}
}
