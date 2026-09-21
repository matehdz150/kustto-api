import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { productos } from "./catalogo";
import { compradores } from "./compradores";
import { marcas } from "./comun";

/**
 * Por dónde pasa un trabajo de digitalización.
 *
 * `READY` y `REVIEW` son AMBOS un éxito, y la diferencia es lo único que
 * separa hoy un bordado revisado de uno que nadie miró: el motor preparó el
 * archivo, pero su confianza no alcanza para mandarlo a la máquina sin que
 * alguien lo vea. Mientras el perfil no esté validado físicamente —falta el
 * test-sew— eso importa más que el propio DST.
 */
export const estadoBordado = pgEnum("estado_bordado", [
	"QUEUED",
	"PROCESSING",
	"READY",
	"REVIEW",
	"FAILED",
]);

/**
 * Un trabajo de digitalización de bordado.
 *
 * EL `id` NO ES UN UUID: es `emb_<40 hex>`, derivado de quién lo pide y del
 * hash del diseño. Eso lo hace IDEMPOTENTE — el mismo diseño del mismo
 * comprador da el mismo id, así que pedirlo dos veces no digitaliza dos veces.
 * Preparar un bordado cuesta hasta 75 segundos de CPU; que un doble clic los
 * pague dos veces no es aceptable.
 *
 * `disenoHash` es del CONTENIDO del diseño, sin el dueño. Es lo que permite
 * que el artefacto se guarde bajo `embroidery/<hash>/` y sirva de caché entre
 * trabajos distintos del mismo dibujo.
 *
 * CADUCA. `embroidery/` es una caché de artefactos con 90 días de vida por
 * política del bucket, no un archivo — por eso el DST se COPIA al pedido en
 * vez de enlazarse: un taller que abra un pedido de hace cuatro meses
 * encontraría el objeto borrado.
 */
export const trabajosDeBordado = pgTable(
	"trabajos_de_bordado",
	{
		id: text().primaryKey(),
		disenoHash: text("diseno_hash").notNull(),
		/** El `sub` de quien lo pidió. Sin FK: un trabajo sobrevive a la cuenta. */
		compradorId: text("comprador_id").references(() => compradores.id, {
			onDelete: "set null",
		}),
		productoId: uuid("producto_id").references(() => productos.id, {
			onDelete: "set null",
		}),
		lado: text().notNull(),
		estado: estadoBordado().notNull().default("QUEUED"),

		/* Las tres versiones del contrato. Si el editor prepara con una y el
		   motor cose con otra, el archivo sale distinto de lo que se enseñó. */
		versionEsquema: integer("version_esquema").notNull(),
		versionPerfil: text("version_perfil").notNull(),
		versionMotor: text("version_motor").notNull(),

		anchoMm: real("ancho_mm").notNull(),
		altoMm: real("alto_mm").notNull(),

		/**
		 * Cuántas veces se ha intentado.
		 *
		 * Lo sube quien lo TOMA, no quien lo encola: un trabajo puede volver a la
		 * cola sin que nadie lo haya procesado —el proceso muere, el contenedor
		 * se reinicia— y contar eso como intento gastaría los reintentos sin que
		 * el motor hubiera corrido ni una vez.
		 */
		intentos: integer().notNull().default(0),

		/** Qué decidió el motor, y con cuánta confianza. */
		decision: text(),
		confianza: real(),
		/** Lo que hay que mirar antes de coser. Se enseña en el editor. */
		incidencias: jsonb().notNull().default([]),
		/** Puntadas, colores, cambios de color, saltos y cortes. */
		metricas: jsonb(),

		/* Dónde quedaron los artefactos, bajo `embroidery/<hash>/<id>/`. */
		claveDst: text("clave_dst"),
		claveVista: text("clave_vista"),
		claveMetadatos: text("clave_metadatos"),
		/** El diseño de entrada, bajo `inputs/<hash>/<id>/design.json`. */
		claveEntrada: text("clave_entrada").notNull(),
		/** El sha256 de cada artefacto, para poder comprobar lo que se subió. */
		hashes: jsonb(),

		/** Por qué falló, cuando falló. `ENGINE_TIMEOUT` no es lo mismo que el resto. */
		codigoError: text("codigo_error"),

		empezadoEn: timestamp("empezado_en", { withTimezone: true }),
		terminadoEn: timestamp("terminado_en", { withTimezone: true }),
		...marcas,
	},
	(t) => [
		index("trabajos_de_bordado_comprador").on(t.compradorId, t.creadoEn),
		index("trabajos_de_bordado_hash").on(t.disenoHash),
	],
);
