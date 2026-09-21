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
	S3_BUCKET_PUBLICO: z.string(),
	S3_BUCKET_PRIVADO: z.string(),

	/* ─── Correo ──────────────────────────────────────────────────────────
	   SMTP y no el SDK de SES: hoy apunta al SES que ya funciona y mañana a
	   otro proveedor sin tocar código. Si falta, no se manda correo y se
	   avisa en el log — la API tiene que servir igual. */
	SMTP_URL: opcional(z.string().url()),
	CORREO_DESDE: z.string().default("Kustto <hola@kustto.com.mx>"),

	/* ─── Paquetería ──────────────────────────────────────────────────────
	   Skydropx admite 2 peticiones por segundo. Siete clics en "+1" tumbaron
	   el checkout una vez; el límite se respeta en la cola, no aquí. */
	SKYDROPX_API_KEY: opcional(z.string()),
	SKYDROPX_WEBHOOK_SECRETO: opcional(z.string()),

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
