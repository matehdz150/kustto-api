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

const esquema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.coerce.number().default(8000),

	DATABASE_URL: z.string().url(),
	REDIS_URL: z.string().url(),

	/** El origen del front, para CORS. Varios, separados por coma. */
	ORIGENES: z.string().default("http://localhost:3000"),

	/* ─── Cognito ─────────────────────────────────────────────────────────
	   Se queda tal cual: es de las dos piezas de AWS que sobreviven. Son TRES
	   pools distintos a propósito —compradores, talleres, admins— porque el
	   guard valida emisor y audiencia, y con uno solo un token de taller
	   abriría /cuenta/*. */
	COGNITO_REGION: z.string().default("us-east-1"),
	COGNITO_POOL_COMPRADORES: z.string(),
	COGNITO_CLIENTE_COMPRADORES: z.string(),
	COGNITO_POOL_TALLERES: z.string(),
	COGNITO_CLIENTE_TALLERES: z.string(),
	COGNITO_POOL_ADMINS: z.string(),
	COGNITO_CLIENTE_ADMINS: z.string(),

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

	/** El panel del editor de bordado. Apagado hasta que haya test-sew. */
	BORDADO_ACTIVO: z.coerce.boolean().default(false),
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
