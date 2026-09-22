import { z } from "zod";

/**
 * El entorno, validado al arrancar.
 *
 * FALLA AL ARRANCAR Y NO EN LA PRIMERA PETICIÓN. En las Lambdas una variable
 * que faltaba se notaba cuando alguien pulsaba algo, y el error salía a mitad
 * de un pedido. Un contenedor que no arranca lo ve quien despliega.
 *
 * Lo que es opcional lo es de verdad: sin SMTP no se manda correo pero la API
 * sirve, y sin Skydropx no se cotiza pero se puede recoger en el taller. Eso
 * se decide aquí y no con un `??` repartido por los servicios.
 */
/**
 * Opcional de verdad, incluida la cadena vacía.
 *
 * `.optional()` a secas sólo acepta la AUSENCIA de la variable, y un `.env`
 * escrito a mano casi nunca la omite: deja `SMTP_URL=` puesto y vacío. Sin
 * esto, ese renglón hace que la API no arranque con un "Invalid url" que no
 * dice cuál es el arreglo. Lo vacío es lo mismo que lo que no está.
 */
const opcional = <T extends z.ZodTypeAny>(tipo: T) =>
	z.preprocess((v) => (v === "" ? undefined : v), tipo.optional());

/**
 * Un interruptor de entorno, leído como lo escribe la gente.
 *
 * NO SE USA `z.coerce.boolean()`, y no es una preferencia: ése hace
 * `Boolean(valor)`, así que la CADENA "false" es verdadera —y "0" también—.
 * Con eso, `BORDADO_ACTIVO=false` encendía el worker de bordado en la imagen
 * de la API, que no lleva el motor: los trabajos se tomaban, se marcaban como
 * PROCESSING y morían con `ENGINE_NOT_AVAILABLE`. Un interruptor que no apaga
 * es peor que no tener interruptor.
 *
 * Se acepta lo que alguien escribiría de verdad en un `.env`, y sólo eso:
 * cualquier otra cosa falla al arrancar en vez de adivinar.
 */
const interruptor = (porDefecto: boolean) =>
	z
		.enum(["true", "false", "1", "0", "si", "no", ""])
		.default(porDefecto ? "true" : "false")
		.transform((v) => v === "true" || v === "1" || v === "si");

const esquema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().default(8000),

	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url(),

	/** El origen del front, para CORS. Varios, separados por coma. */
	ORIGENES: z.string().default("http://localhost:3000"),

	/* ─── Cuentas propias ─────────────────────────────────────────────────
	   JWT de acceso de 15 minutos y renovación, ambos en cookies `httpOnly`. */

	/**
	 * La llave PRIVADA Ed25519, como JWK en una línea y con su `kid`.
	 * `pnpm auth:llave` genera una. Es un secreto: va en el gestor de secretos
	 * del servidor, nunca en el repo.
	 */
	JWT_LLAVE_PRIVADA: z.string().min(1),
	/**
	 * La PÚBLICA de la llave anterior, con su `kid`, para rotar sin sacar a
	 * nadie: los JWT firmados con ella siguen valiendo los 15 minutos que les
	 * quedan. Se borra en cuanto pasan.
	 */
	JWT_LLAVE_ANTERIOR: opcional(z.string()),
	JWT_EMISOR: z.string().default("https://api.kustto.com.mx"),
	/**
	 * `.kustto.com.mx` en producción: así la cookie que pone la API llega
	 * también al sitio. Vacío en local, donde `localhost:3000` y
	 * `localhost:8001` ya son el mismo sitio.
	 */
	COOKIE_DOMINIO: opcional(z.string()),
	/**
	 * `Secure` en las cookies. Sólo se apaga en local sin HTTPS: con él
	 * puesto, Safari no guarda la cookie en `http://localhost`.
	 */
	COOKIE_SEGURA: interruptor(true),
	/**
	 * Detrás de un proxy o balanceador, la IP del cliente viene en
	 * `X-Forwarded-For`. Sin esto, el límite de intentos por IP contaría a
	 * todo el mundo como si fuera el balanceador. Encenderlo SIN proxy delante
	 * deja que cualquiera invente su IP con esa cabecera.
	 */
	CONFIAR_EN_PROXY: interruptor(false),

	/* ─── S3 ──────────────────────────────────────────────────────────────
	   La otra pieza que se queda. Los buckets siguen CERRADOS: nada se sirve
	   público, ni los mockups. Se leen con credenciales y se reparten desde
	   aquí, que es lo que ya hacía el rewrite del front. */
	AWS_REGION: z.string().default("us-east-1"),
	/**
	 * Cómo se autentica contra S3.
	 *
	 * En un servidor de verdad esto va por el ROL de la máquina y las tres
	 * variables se quedan vacías: el SDK lo resuelve solo. En local hacen falta
	 * porque el contenedor no ve el `~/.aws` del host a menos que se le monte
	 * —ver `docker compose`—, y sin credenciales la API arranca bien y se cae
	 * al primer mockup con "Could not load credentials", que no dice qué falta.
	 */
	AWS_PROFILE: opcional(z.string()),
	AWS_ACCESS_KEY_ID: opcional(z.string()),
	AWS_SECRET_ACCESS_KEY: opcional(z.string()),
	S3_BUCKET_PUBLICO: z.string(),
	S3_BUCKET_PRIVADO: z.string(),

	/* ─── Correo ──────────────────────────────────────────────────────────
	   SMTP y no el SDK de SES: hoy apunta al SES que ya funciona y mañana a
	   otro proveedor sin tocar código. Si falta, no se manda correo y se
	   avisa en el log — la API tiene que servir igual. */
	SMTP_URL: opcional(z.string().url()),
	CORREO_DESDE: z.string().default("Kustto <hola@kustto.com.mx>"),
	/** Buzón interno al que llegan las solicitudes de nuevos talleres. */
	CORREO_SOLICITUDES: z.string().email().default("hola@kustto.com.mx"),

	/* ─── Paquetería ────────────────────────────────────────────────────── */
	SKYDROPX_HOST: z.string().url().default("https://sb-pro.skydropx.com"),
	SKYDROPX_CLIENT_ID: opcional(z.string()),
	SKYDROPX_CLIENT_SECRET: opcional(z.string()),
	/**
	 * Cuántas peticiones por segundo admite la cuenta.
	 *
	 * SON DOS, y es poquísimo: un solo cliente tecleando su código postal lo
	 * revienta si se cotiza en cada tecla. Se cuenta en Redis, común a todas
	 * las instancias — en las Lambdas no se podía y había que espaciar a mano.
	 */
	SKYDROPX_POR_SEGUNDO: z.coerce.number().default(2),
	/**
	 * Qué paqueterías se ofrecen. Vacío = todas.
	 *
	 * Cotizar no es poder despachar: si la credencial de una no está dada de
	 * alta, la guía se compra y muere, con el cliente ya habiendo pagado ese
	 * envío. Pasó con ampm y con tresguerras.
	 */
	SKYDROPX_PAQUETERIAS: z.string().default(""),
	/** Firma el webhook de rastreo. Sin esto, el webhook se rechaza entero. */
	SKYDROPX_WEBHOOK_SECRETO: opcional(z.string()),
	/** La clave del SAT de lo que se manda. 53102500 = ropa. */
	KUSTTO_CLAVE_SAT: z.string().default("53102500"),
	/** El tipo de empaque de la carta porte. 4G = caja de cartón. */
	KUSTTO_TIPO_EMPAQUE: z.string().default("4G"),

	/* ─── Bordado ─────────────────────────────────────────────────────────
	   APAGADO POR DEFECTO. Los parámetros del perfil salieron de un spike y NO
	   tienen validación física: nadie ha cosido todavía un diseño preparado
	   con esto. Hasta que haya test-sew no se conecta al checkout ni al
	   taller. */
	BORDADO_ACTIVO: interruptor(false),
	/** Dónde está el intérprete y el motor, dentro de la imagen de bordado. */
	BORDADO_PYTHON: z.string().default("/usr/bin/python3"),
	BORDADO_MOTOR: z.string().default("/app/servicios/bordado/motor.py"),
	/**
	 * Cuánto se le da al motor antes de cortarlo.
	 *
	 * Aquí ya no hay un máximo de función encima —era lo que obligaba a
	 * exprimir los 75 segundos de la Lambda— pero el tope se queda: un diseño
	 * que tarda cinco minutos no es uno lento, es uno que no se va a poder
	 * coser.
	 */
	BORDADO_TIMEOUT_MS: z.coerce.number().default(180_000),
	/** Cuántas digitalizaciones a la vez. Cada una se come una CPU entera. */
	BORDADO_CONCURRENCIA: z.coerce.number().default(1),
});

export type Entorno = z.infer<typeof esquema>;

export function leerEntorno(fuente: NodeJS.ProcessEnv = process.env): Entorno {
	const r = esquema.safeParse(fuente);

	if (!r.success) {
		const faltan = r.error.issues
			.map((i) => `  ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		throw new Error(`El entorno no es válido:\n${faltan}`);
	}

	return r.data;
}
