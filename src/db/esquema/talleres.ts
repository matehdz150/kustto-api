import {
	jsonb,
	numeric,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { marcas } from "./comun";

/**
 * El taller.
 *
 * EL ID ES EL `sub` DE COGNITO, no un uuid nuestro. Viene de DynamoDB y se
 * conserva a propósito: el token que llega en cada petición trae el `sub`, y
 * con cualquier otro id haría falta una tabla de equivalencias consultada en
 * todas las rutas del panel para responder a "¿este pedido es tuyo?".
 *
 * Por eso es `text` y no `uuid`: Cognito emite uuid hoy, pero el formato del
 * `sub` es suyo, no nuestro, y declararlo `uuid` ataría el esquema a un
 * detalle de otro sistema.
 */
export const talleres = pgTable(
	"talleres",
	{
		id: text().primaryKey(),
		correo: text().notNull(),
		nombre: text().notNull(),
		slug: text().notNull(),
		nombrePublico: text("nombre_publico"),
		bio: text(),
		avatarUrl: text("avatar_url"),
		bannerUrl: text("banner_url"),
		whatsapp: text(),
		/**
		 * Lo que el taller lleva gastado en guías y todavía no se le cobra.
		 *
		 * NUMERIC porque es dinero. Sale de `saldoEnvios` en DynamoDB, donde era
		 * un número de JavaScript — o sea que ya venía perdiendo centavos.
		 */
		saldoEnvios: numeric("saldo_envios", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		/** Cómo cobra el envío: lo que contestó al darse de alta. */
		cargosEnvio: jsonb("cargos_envio"),
		/** Dirección y horarios de recolección para la paquetería. */
		recoleccion: jsonb(),
		...marcas,
	},
	(t) => [
		/**
		 * En DynamoDB esto era un ítem `PROVIDER_EMAIL#<correo>` escrito en la
		 * misma transacción que el taller, porque allí no existe el UNIQUE. Aquí
		 * es un índice y el candado desaparece: son 8 líneas menos y una forma
		 * menos de que los dos ítems se separen.
		 *
		 * El correo se guarda ya en minúsculas —lo normaliza el servicio—, así
		 * que el índice no necesita `lower()`.
		 */
		uniqueIndex("talleres_correo_unico").on(t.correo),
		uniqueIndex("talleres_slug_unico").on(t.slug),
	],
);
