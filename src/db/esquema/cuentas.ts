import { randomUUID } from "node:crypto";
import {
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { marcas } from "./comun";

/**
 * Quién puede entrar, y a qué.
 *
 * Es lo que en Cognito eran TRES POOLS, y sigue valiendo lo mismo: una sesión
 * de taller no abre `/cuenta/*`. Antes lo impedía que cada pool firmara con su
 * propio emisor y audiencia; ahora lo impide la audiencia del JWT
 * (`kustto:comprador`…) más que cada tipo tiene su propia cookie. No es un
 * rol que se pueda olvidar comprobar: cada guard exige el suyo.
 */
export const tipoDeUsuario = pgEnum("tipo_de_usuario", [
	"comprador",
	"taller",
	"admin",
]);

/**
 * Una cuenta.
 *
 * EL ID DE LOS QUE VIENEN DE COGNITO ES SU `sub`, sin cambiarlo. Es la llave
 * de `compradores` y de `talleres`, y de ahí cuelgan pedidos, carritos y
 * productos: conservarlo hace que migrar sea insertar filas y no reescribir
 * llaves. Los nuevos llevan un uuid, que es el mismo formato.
 *
 * `UNIQUE (tipo, correo)` y no `UNIQUE (correo)`: la misma persona puede
 * comprar y tener un taller, con contraseñas distintas, igual que cuando eran
 * dos pools.
 */
export const usuarios = pgTable(
	"usuarios",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		tipo: tipoDeUsuario().notNull(),
		/** Siempre en minúsculas: es la llave con la que se entra. */
		correo: text().notNull(),
		/**
		 * Cuándo se comprobó que el correo es suyo. `null` = sin verificar.
		 *
		 * No es decorativo: el historial de pedidos se encuentra POR CORREO, así
		 * que registrarse con el correo de otro sin verificarlo bastaría para
		 * leerle los pedidos, con su dirección dentro.
		 */
		correoVerificadoEn: timestamp("correo_verificado_en", {
			withTimezone: true,
		}),
		/**
		 * argon2id. `null` es normal y quiere decir dos cosas: entra sólo con
		 * Google, o todavía no la ha creado —los que vienen de Cognito, porque
		 * Cognito no deja exportar contraseñas, y los talleres invitados.
		 */
		contrasenaHash: text("contrasena_hash"),
		desactivadoEn: timestamp("desactivado_en", { withTimezone: true }),
		ultimoAccesoEn: timestamp("ultimo_acceso_en", { withTimezone: true }),
		...marcas,
	},
	(t) => [uniqueIndex("usuarios_tipo_correo_unico").on(t.tipo, t.correo)],
);

/**
 * "Entrar con Google" y los que vengan.
 *
 * Se enlaza por el `sub` DEL PROVEEDOR y no por el correo: un correo puede
 * cambiar de dueño y el `sub` no. Los que ya entraban con Google por Cognito
 * traen ese `sub` en su atributo `identities`, así que se enlazan sin que
 * noten el cambio.
 */
export const identidadesExternas = pgTable(
	"identidades_externas",
	{
		proveedor: text().notNull(),
		sujeto: text().notNull(),
		usuarioId: text("usuario_id")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		correo: text(),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.proveedor, t.sujeto] }),
		index("identidades_externas_usuario").on(t.usuarioId),
	],
);

/**
 * Una sesión: un inicio de sesión en un aparato.
 *
 * Su `id` viaja en el JWT como `sid`. Es lo que permite cortar UNA sesión
 * —salir, "cerrar en los demás aparatos"— sin tocar las otras, y lo que se
 * pone en la lista de bloqueo de Redis para que el JWT deje de valer antes de
 * caducar.
 *
 * `expira_absoluta_en` es el tope aunque se siga renovando: sin él, un token
 * de renovación robado y usado a diario valdría para siempre.
 */
export const sesiones = pgTable(
	"sesiones",
	{
		id: uuid().primaryKey().defaultRandom(),
		usuarioId: text("usuario_id")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		/** Copiado del usuario: el guard lo compara sin otra consulta. */
		tipo: tipoDeUsuario().notNull(),
		expiraAbsolutaEn: timestamp("expira_absoluta_en", {
			withTimezone: true,
		}).notNull(),
		revocadaEn: timestamp("revocada_en", { withTimezone: true }),
		/** salir | reutilizacion | desactivado | cambio_de_contrasena */
		motivoRevocacion: text("motivo_revocacion"),
		ultimoUsoEn: timestamp("ultimo_uso_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
		ip: text(),
		agente: text(),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("sesiones_usuario").on(t.usuarioId, t.creadoEn)],
);

/**
 * Los tokens de renovación, uno por vuelta.
 *
 * SE GUARDA LA HUELLA (sha256), NUNCA EL TOKEN. Una copia de la base no debe
 * bastar para entrar como nadie.
 *
 * CADA RENOVACIÓN GASTA EL SUYO (`usado_en`) y deja apuntado cuál lo
 * reemplazó. Si llega uno ya gastado fuera de la ventana de gracia, alguien lo
 * copió: se revoca la sesión entera, porque no hay forma de saber cuál de los
 * dos que lo tienen es el legítimo.
 */
export const tokensDeRenovacion = pgTable(
	"tokens_de_renovacion",
	{
		id: uuid().primaryKey().defaultRandom(),
		sesionId: uuid("sesion_id")
			.notNull()
			.references(() => sesiones.id, { onDelete: "cascade" }),
		huella: text().notNull(),
		expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
		usadoEn: timestamp("usado_en", { withTimezone: true }),
		reemplazadoPor: uuid("reemplazado_por"),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("tokens_de_renovacion_huella").on(t.huella),
		index("tokens_de_renovacion_sesion").on(t.sesionId),
	],
);

/** Para qué es un código o un enlace de un solo uso. */
export const propositoDeToken = pgEnum("proposito_de_token", [
	"verificar_correo",
	"restablecer",
	"invitacion",
]);

/**
 * Códigos y enlaces de un solo uso: verificar el correo, restablecer la
 * contraseña, aceptar la invitación de un taller.
 *
 * `intentos` existe por los códigos de SEIS DÍGITOS: son un millón de
 * combinaciones, y sin tope se adivinan. Al quinto fallo el código muere.
 */
export const tokensDeUnUso = pgTable(
	"tokens_de_un_uso",
	{
		id: uuid().primaryKey().defaultRandom(),
		usuarioId: text("usuario_id")
			.notNull()
			.references(() => usuarios.id, { onDelete: "cascade" }),
		proposito: propositoDeToken().notNull(),
		huella: text().notNull(),
		intentos: integer().notNull().default(0),
		expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
		usadoEn: timestamp("usado_en", { withTimezone: true }),
		creadoEn: timestamp("creado_en", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("tokens_de_un_uso_usuario").on(t.usuarioId, t.proposito),
		/* NO ÚNICO a propósito: un código de seis dígitos se repite entre
		   personas —dos pueden recibir el mismo 482913 el mismo día—. Los
		   códigos se buscan por usuario y propósito; los enlaces, por huella. */
		index("tokens_de_un_uso_huella").on(t.huella),
	],
);
