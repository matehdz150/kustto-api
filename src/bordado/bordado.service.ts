import {
	BadRequestException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/identidad";
import { COLAS } from "../colas/colas";
import { COLA } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { PerfilService } from "../cuenta/perfil.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import {
	canonicalJson,
	contenidoDelOriginal,
	EMBROIDERY_PROFILE_V2,
	EMBROIDERY_SCHEMA_VERSION,
	type EmbroideryStages,
	embroideryJobId,
	INKSTITCH_ENGINE_VERSION,
	aplicarPolitica,
	NUCLEO_VERSION,
	perfilDeFuentes,
	sha256,
} from "./contrato";
import {
	ErrorDeFrontera,
	leerPeticionDeBordado,
	type PeticionDeBordado,
} from "./frontera";

export type TrabajoDeBordado = { jobId: string; disenoHash: string };

/** Cuántas veces se puede reintentar a mano un trabajo que falló. */
const MAX_INTENTOS = 3;

/**
 * La preparación automática de bordado.
 *
 * ESTÁ APAGADA POR DEFECTO (`BORDADO_ACTIVO`). Los parámetros del perfil
 * salieron de un spike y NO tienen validación física: nadie ha cosido todavía
 * un diseño preparado con esto. Hasta que haya test-sew no se conecta al
 * checkout ni al taller, y con la variable en falso estas rutas contestan 404
 * — no un 403, porque para quien no la tiene activada esta función no existe.
 */
@Injectable()
export class BordadoService {
	private readonly log = new Logger(BordadoService.name);

	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(COLA(COLAS.bordado)) private readonly cola: Queue<TrabajoDeBordado>,
		private readonly almacen: AlmacenService,
		private readonly perfil: PerfilService,
	) {}

	/**
	 * Pide preparar un diseño.
	 *
	 * ES IDEMPOTENTE POR CONSTRUCCIÓN: el id sale de quién pide más el hash del
	 * diseño, así que el mismo dibujo del mismo comprador da el mismo trabajo.
	 * Preparar cuesta hasta 75 segundos de CPU y un doble clic no los puede
	 * pagar dos veces.
	 */
	async crear(quien: Identidad, cuerpo: Record<string, any>) {
		this.exigirActivo();

		/* V6.2: EL ORIGINAL DECIDE. El cuerpo trae el arte capturado
		   (`original`) y, como pista, lo que preparó el navegador (`design`).
		   El servidor volverá a preparar el original él mismo; la pista sólo se
		   guarda para compararla. Un cliente anterior a V6.2 manda sólo el
		   diseño: se acepta, pero sin original nunca sale READY. */
		const peticion = this.validar(cuerpo);
		const area =
			peticion.tipo === "original"
				? {
						productId: peticion.original.productId,
						sideId: peticion.original.sideId,
						widthMm: peticion.original.widthMm,
						heightMm: peticion.original.heightMm,
					}
				: {
						productId: peticion.design.productId,
						sideId: peticion.design.sideId,
						widthMm: peticion.design.physical.widthMm,
						heightMm: peticion.design.physical.heightMm,
					};
		await this.comprobarContraElProducto(area);

		/* EL HASH ES EL DEL ORIGINAL CANÓNICO (o el del diseño, en un cliente
		   viejo): es lo que el worker vuelve a comprobar antes de preparar, y lo
		   que el editor puede calcular solo para saber si una respuesta es de lo
		   que tiene en pantalla. EL ID LLEVA ADEMÁS LA VERSIÓN DEL NÚCLEO: el
		   mismo original con un servidor nuevo es otro trabajo, porque su
		   veredicto puede ser otro; con el mismo servidor, el mismo (doble clic). */
		const entrada =
			peticion.tipo === "original"
				? canonicalJson(peticion.original)
				: canonicalJson(peticion.design);
		/* Con original, la huella es la de su CONTENIDO (`contenidoDelOriginal`:
		   las imágenes por el sha256 de sus píxeles crudos, no por sus bytes
		   comprimidos, que cambian de un compresor a otro). */
		const disenoHash = await sha256(
			peticion.tipo === "original"
				? canonicalJson(contenidoDelOriginal(peticion.original))
				: entrada,
		);
		const jobId = await embroideryJobId(
			quien.sub,
			peticion.tipo === "original"
				? `${disenoHash}:${NUCLEO_VERSION}:${this.env.BORDADO_RASTER_VECTORIAL ? "raster-v5" : "raster-v4"}`
				: disenoHash,
		);

		const [existente] = await this.db
			.select()
			.from(e.trabajosDeBordado)
			.where(eq(e.trabajosDeBordado.id, jobId))
			.limit(1);

		if (existente) return this.yaExistia(quien, existente, peticion.retry);

		/* La fila del comprador tiene que existir antes: el trabajo tiene una
		   clave foránea hacia ella, y preparar un bordado es de las primeras
		   cosas que alguien hace —antes de llenar su perfil—. Es el mismo caso
		   que el carrito y los favoritos; en DynamoDB la partición existía sola
		   en cuanto escribías algo en ella. */
		await this.perfil.asegurar(quien);

		/* SE GUARDA EL CANÓNICO, no `JSON.stringify`: el hash es el sha256 de esa
		   serialización exacta y el worker lo vuelve a comprobar. El nombre dice
		   qué es: `original.json` (V6.2) o `design.json` (cliente viejo). */
		const claveEntrada = `inputs/${disenoHash}/${jobId}/${peticion.tipo === "original" ? "original" : "design"}.json`;
		await this.almacen.guardarTexto(claveEntrada, entrada, "application/json");
		if (peticion.tipo === "original" && peticion.pista !== null)
			await this.almacen.guardarTexto(
				`inputs/${disenoHash}/${jobId}/pista.json`,
				canonicalJson(peticion.pista),
				"application/json",
			);

		const versiones =
			peticion.tipo === "original"
				? {
						/* El perfil lo decide el original con la misma regla que usa el
						   núcleo; no lo que diga el navegador. */
						versionEsquema: EMBROIDERY_SCHEMA_VERSION,
						versionPerfil: perfilDeFuentes(
							aplicarPolitica(peticion.original, {
								rasterVectorial: this.env.BORDADO_RASTER_VECTORIAL,
							}).fuentes,
						).version,
						versionMotor: INKSTITCH_ENGINE_VERSION,
					}
				: {
						versionEsquema: peticion.design.schemaVersion,
						versionPerfil: peticion.design.profileVersion,
						versionMotor: peticion.design.engineVersion,
					};

		/* `onConflictDoNothing` y no un insert a secas: dos peticiones a la vez
		   calculan el MISMO id, y la segunda tiene que encontrarse la primera en
		   vez de reventar con un error de clave duplicada. */
		const [creado] = await this.db
			.insert(e.trabajosDeBordado)
			.values({
				id: jobId,
				disenoHash,
				compradorId: quien.sub,
				productoId: area.productId,
				lado: area.sideId,
				estado: "QUEUED",
				...versiones,
				anchoMm: area.widthMm,
				altoMm: area.heightMm,
				claveEntrada,
			})
			.onConflictDoNothing()
			.returning();

		if (!creado) {
			const [concurrente] = await this.db
				.select()
				.from(e.trabajosDeBordado)
				.where(eq(e.trabajosDeBordado.id, jobId))
				.limit(1);

			return this.aSalida(concurrente);
		}

		await this.encolar(jobId, disenoHash);
		this.log.log(`Trabajo de bordado creado: ${jobId}`);

		return this.aSalida(creado);
	}

	async obtener(quien: Identidad, jobId: string) {
		this.exigirActivo();

		const [trabajo] = await this.db
			.select()
			.from(e.trabajosDeBordado)
			.where(
				and(
					eq(e.trabajosDeBordado.id, jobId),
					eq(e.trabajosDeBordado.compradorId, quien.sub),
				),
			)
			.limit(1);

		/* El mismo mensaje si no existe y si es de otra persona: el id lleva el
		   hash del diseño dentro, así que distinguirlos diría si alguien más
		   preparó ese mismo dibujo. */
		if (!trabajo) throw new NotFoundException("Job no encontrado");

		return this.aSalida(trabajo);
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	private async yaExistia(
		quien: Identidad,
		existente: typeof e.trabajosDeBordado.$inferSelect,
		reintentar: boolean,
	) {
		if (existente.compradorId !== quien.sub) {
			throw new NotFoundException("Job no encontrado");
		}

		if (
			reintentar &&
			existente.estado === "FAILED" &&
			existente.intentos < MAX_INTENTOS
		) {
			/* Vuelve a la cola SÓLO si sigue fallado cuando se escribe: entre que
			   se leyó y ahora pudo entrar otro reintento. */
			const [revivido] = await this.db
				.update(e.trabajosDeBordado)
				/* Las etapas del intento fallido no son de este: el previsualizador
				   empezaría enseñando lo de antes. */
				.set({
					estado: "QUEUED",
					codigoError: null,
					etapas: null,
					actualizadoEn: new Date(),
				})
				.where(
					and(
						eq(e.trabajosDeBordado.id, existente.id),
						eq(e.trabajosDeBordado.estado, "FAILED"),
					),
				)
				.returning();

			if (revivido) {
				await this.encolar(revivido.id, revivido.disenoHash);
				this.log.log(`Reintento de bordado: ${revivido.id}`);
				return this.aSalida(revivido);
			}
		}

		/* REENVIAR UN `QUEUED` REPARA EL HUECO entre escribir el trabajo y
		   encolarlo: si la base aceptó y la cola falló, sin esto el trabajo se
		   queda esperando para siempre. Los duplicados son inocuos porque quien
		   lo toma lo hace de forma atómica. */
		if (existente.estado === "QUEUED") {
			await this.encolar(existente.id, existente.disenoHash);
		}

		return this.aSalida(existente);
	}

	private validar(cuerpo: unknown): PeticionDeBordado {
		try {
			return leerPeticionDeBordado(cuerpo);
		} catch (error) {
			const codigo =
				error instanceof ErrorDeFrontera ? error.codigo : "INVALID_DESIGN";

			/* UN MOTIVO QUE EL COMPRADOR PUEDA ACCIONAR cuando lo haya. "El diseño
			   de bordado no es válido" no le dice a nadie qué hacer, y en el caso
			   de las medidas la respuesta es concreta: el área de bordado del
			   producto es más grande de lo que la máquina admite, y eso lo arregla
			   el taller, no él. */
			const motivos: Record<string, string> = {
				RASTER_NOT_PREPARED:
					"Este raster aún no es apto para bordado automático",
				DIMENSIONS_EXCEEDED: `El área de bordado de este producto es más grande de lo que admite el bordado automático (máximo ${EMBROIDERY_PROFILE_V2.limits.maxWidthMm} x ${EMBROIDERY_PROFILE_V2.limits.maxHeightMm} mm).`,
				INVALID_DIMENSIONS: "Las medidas del área de bordado no son válidas.",
				UNSUPPORTED_PROFILE:
					"Este diseño se preparó con una versión anterior; vuelve a prepararlo.",
				PREPARATION_MISMATCH:
					"Este diseño se preparó con una versión anterior; vuelve a prepararlo.",
				ORIGINAL_VERSION_NO_SOPORTADA:
					"Este diseño se preparó con una versión anterior; vuelve a prepararlo.",
				RASTER_DEMASIADO_GRANDE:
					"La imagen es demasiado grande para prepararla; usa una más pequeña.",
				SVG_DEMASIADO_COMPLEJO:
					"El SVG es demasiado complejo para bordarlo automáticamente.",
			};

			throw new BadRequestException(
				motivos[codigo] ?? "El diseño de bordado no es válido",
			);
		}
	}

	/**
	 * Que el lado exista, se borde de verdad y mida lo que dice el diseño.
	 *
	 * LAS MEDIDAS SE COMPRUEBAN CONTRA LA BASE, no se creen del cuerpo: el
	 * tamaño del área decide cuánta puntada entra, y un diseño que declare un
	 * área más chica de la real saldría preparado para un marco que no es.
	 */
	private async comprobarContraElProducto(diseno: {
		productId: string;
		sideId: string;
		widthMm: number;
		heightMm: number;
	}) {
		const [producto] = await this.db
			.select({ id: e.productos.id })
			.from(e.productos)
			.where(
				and(
					eq(e.productos.id, diseno.productId),
					eq(e.productos.estado, "activo"),
				),
			)
			.limit(1);

		const [lado] = producto
			? await this.db
					.select()
					.from(e.productoLados)
					.where(
						and(
							eq(e.productoLados.productoId, diseno.productId),
							eq(e.productoLados.clave, diseno.sideId),
							eq(e.productoLados.activo, true),
						),
					)
					.limit(1)
			: [];

		if (!producto || !lado) {
			throw new NotFoundException("Producto o lado no disponible");
		}

		if (lado.tecnica !== "bordado") {
			throw new BadRequestException("Ese lado no usa técnica de bordado");
		}

		/* Medio décimo de milímetro de tolerancia: los centímetros vienen de un
		   `real` y el diseño trae milímetros, así que la conversión no da exacta
		   y exigir igualdad rechazaría diseños buenos. */
		if (
			Math.abs(lado.anchoCm * 10 - diseno.widthMm) > 0.05 ||
			Math.abs(lado.altoCm * 10 - diseno.heightMm) > 0.05
		) {
			throw new BadRequestException("Las medidas no coinciden con el producto");
		}
	}

	private async encolar(jobId: string, disenoHash: string) {
		await this.cola.add(
			"digitalizar",
			{ jobId, disenoHash },
			/* El id del trabajo ES el id del job en la cola: si el mismo trabajo
			   se encola dos veces —el reenvío de `QUEUED`, un doble clic— BullMQ
			   se queda con uno. */
			{ jobId },
		);
	}

	private exigirActivo() {
		if (!this.env.BORDADO_ACTIVO) {
			throw new NotFoundException("Preparación de bordado no disponible");
		}
	}

	/** La forma que el editor ya lee. Los nombres van en inglés como el resto. */
	private async aSalida(t: typeof e.trabajosDeBordado.$inferSelect) {
		return {
			jobId: t.id,
			designHash: t.disenoHash,
			/* V6.2: con un original, `designHash` ES el sha256 del original
			   canónico: el editor lo compara con el que calculó él. */
			originalHash: t.claveEntrada.endsWith("/original.json")
				? t.disenoHash
				: undefined,
			/* V6.9.2: un diseño que el SERVIDOR rechazó es un rechazo, con su
			   motivo, no un fallo: en la base es `FAILED` + `DESIGN_REJECTED`
			   (el enum es del trabajo, no del diseño), pero el editor tiene que
			   decir por qué no se puede bordar y no "no pudimos prepararlo". */
			status:
				t.estado === "FAILED" && t.codigoError === "DESIGN_REJECTED"
					? ("REJECTED" as const)
					: t.estado,
			decision: t.decision ?? undefined,
			confidence: t.confianza ?? undefined,
			issues: t.incidencias ?? [],
			metrics: t.metricas ?? undefined,
			/* La vista previa sólo cuando hay algo que ver, y firmada: el bucket
			   de bordado es privado y su prefijo caduca a los 90 días. */
			previewUrl:
				(t.estado === "READY" || t.estado === "REVIEW") && t.claveVista
					? await this.almacen.urlParaLeer(t.claveVista)
					: undefined,
			stages: await this.etapasPublicas(t),
		};
	}

	/**
	 * V6.9.2: las etapas que el previsualizador ya puede enseñar, firmadas.
	 * Las puntadas son PROVISIONALES mientras el trabajo sigue: validar y
	 * reparar puede cambiarlas (casi nunca lo hace); al terminar bien, el
	 * definitivo las reemplaza.
	 */
	private async etapasPublicas(t: typeof e.trabajosDeBordado.$inferSelect) {
		const x = (t.etapas ?? {}) as {
			forma?: { claves?: string[]; ms?: number };
			colores?: string[];
			puntadas?: { clave?: string; ms?: number };
			final?: { clave?: string; ms?: number };
		};
		const enCurso = t.estado === "QUEUED" || t.estado === "PROCESSING";
		const bien = t.estado === "READY" || t.estado === "REVIEW";
		const etapas: EmbroideryStages = {};
		if (x.forma?.claves?.length)
			etapas.shape = {
				urls: await Promise.all(
					x.forma.claves.map((c) => this.almacen.urlParaLeer(c)),
				),
				ms: x.forma.ms ?? 0,
			};
		if (Array.isArray(x.colores)) etapas.colors = x.colores.map(String);
		if (x.puntadas?.clave)
			etapas.stitches = {
				url: await this.almacen.urlParaLeer(x.puntadas.clave),
				ms: x.puntadas.ms ?? 0,
				provisional: enCurso,
			};
		if (bien && x.final?.clave)
			etapas.final = {
				url: await this.almacen.urlParaLeer(x.final.clave),
				ms: x.final.ms ?? 0,
			};
		return Object.keys(etapas).length ? etapas : undefined;
	}
}
