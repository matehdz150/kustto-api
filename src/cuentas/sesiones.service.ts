import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { JwtService } from "./jwt.service";
import { ACCESO_MAS_LARGO, DURACIONES, type TipoDeUsuario } from "./tipos";

/**
 * Cuánto después de gastado se tolera volver a ver un token de renovación.
 *
 * Dos pestañas pueden renovar a la vez con la MISMA cookie: la primera la
 * gasta y la segunda llega con un token ya usado. Sin esta ventana eso parece
 * un robo y se revoca la sesión — o sea, abrir dos pestañas te sacaría. Dentro
 * de la ventana se contesta "ya se renovó" SIN cookies nuevas: el navegador ya
 * tiene las que puso la primera, y la segunda pestaña sólo reintenta.
 */
const GRACIA_MS = 30_000;

const CLAVE_BLOQUEO = (sid: string) => `sesion-bloqueada:${sid}`;

export type Meta = { ip: string | null; agente: string | null };

export type Emitidos = {
	acceso: string;
	renovacion: string;
	/** Hasta cuándo vale la cookie de renovación. */
	renovacionExpiraEn: Date;
};

type Usuario = typeof e.usuarios.$inferSelect;

/** El resultado de renovar: tokens nuevos, o "otra pestaña ya lo hizo". */
export type Renovacion =
	| { tipo: "nuevos"; emitidos: Emitidos }
	| { tipo: "gracia" };

const huellaDe = (token: string) =>
	createHash("sha256").update(token).digest("hex");

/**
 * Las sesiones: abrirlas, renovarlas, cortarlas.
 *
 * EL JWT VALE SOLO, HASTA QUE CADUCA. Lo que permite cortar una sesión antes
 * es la LISTA DE BLOQUEO en Redis: al revocar, el `sid` entra ahí por lo que
 * dura un JWT, y el guard la consulta en cada petición. Es una lectura O(1) en
 * memoria, no una consulta a Postgres. Pasado ese tiempo la clave caduca sola,
 * porque el JWT también.
 */
@Injectable()
export class SesionesService {
	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(REDIS) private readonly redis: IORedis,
		private readonly jwt: JwtService,
	) {}

	/** Abre una sesión nueva: después de entrar, con contraseña o con Google. */
	async iniciar(usuario: Usuario, meta: Meta): Promise<Emitidos> {
		const d = DURACIONES[usuario.tipo];
		const ahora = Date.now();

		const [sesion] = await this.db
			.insert(e.sesiones)
			.values({
				usuarioId: usuario.id,
				tipo: usuario.tipo,
				expiraAbsolutaEn: new Date(ahora + d.absoluta * 1000),
				ip: meta.ip,
				agente: recortar(meta.agente),
			})
			.returning();

		const { crudo, expiraEn } = await this.emitirRenovacion(sesion);

		await this.db
			.update(e.usuarios)
			.set({ ultimoAccesoEn: new Date(ahora) })
			.where(eq(e.usuarios.id, usuario.id));

		return {
			acceso: await this.firmarPara(usuario, sesion.id),
			renovacion: crudo,
			renovacionExpiraEn: expiraEn,
		};
	}

	/**
	 * Gasta un token de renovación y entrega el par siguiente.
	 *
	 * NO DISTINGUE hacia fuera por qué falló —caducado, revocado, inventado—:
	 * todo es 401 y "vuelve a entrar". Al registro sí va el motivo.
	 */
	async renovar(
		tipo: TipoDeUsuario,
		crudo: string,
		meta: Meta,
	): Promise<Renovacion> {
		const ahora = new Date();

		const [fila] = await this.db
			.select({
				token: e.tokensDeRenovacion,
				sesion: e.sesiones,
				usuario: e.usuarios,
			})
			.from(e.tokensDeRenovacion)
			.innerJoin(e.sesiones, eq(e.sesiones.id, e.tokensDeRenovacion.sesionId))
			.innerJoin(e.usuarios, eq(e.usuarios.id, e.sesiones.usuarioId))
			.where(eq(e.tokensDeRenovacion.huella, huellaDe(crudo)))
			.limit(1);

		if (!fila) throw fuera();

		const { token, sesion, usuario } = fila;

		/* La cookie de renovación del comprador no renueva una de taller, aunque
		   alguien la copie de una a otra. */
		if (sesion.tipo !== tipo) throw fuera();
		if (sesion.revocadaEn || sesion.expiraAbsolutaEn <= ahora) throw fuera();

		if (token.usadoEn) {
			if (ahora.getTime() - token.usadoEn.getTime() <= GRACIA_MS) {
				return { tipo: "gracia" };
			}
			/* Gastado y fuera de la ventana: alguien más tiene este token. No hay
			   forma de saber cuál de los dos es el legítimo, así que se corta la
			   sesión entera y los dos vuelven a entrar. */
			await this.revocar(sesion.id, "reutilizacion");
			throw fuera();
		}

		if (token.expiraEn <= ahora) throw fuera();

		if (usuario.desactivadoEn) {
			await this.revocar(sesion.id, "desactivado");
			throw fuera();
		}

		/* SE GASTA CON CONDICIÓN, no leyendo y luego escribiendo: dos peticiones
		   que llegan a la vez con el mismo token pasan las dos la comprobación
		   de arriba, pero sólo una encuentra `usado_en IS NULL`. La otra es la
		   pestaña que perdió la carrera: ventana de gracia. */
		const gastado = await this.db
			.update(e.tokensDeRenovacion)
			.set({ usadoEn: ahora })
			.where(
				and(
					eq(e.tokensDeRenovacion.id, token.id),
					isNull(e.tokensDeRenovacion.usadoEn),
				),
			)
			.returning({ id: e.tokensDeRenovacion.id });

		if (gastado.length === 0) return { tipo: "gracia" };

		const { crudo: nuevo, id, expiraEn } = await this.emitirRenovacion(sesion);

		await Promise.all([
			this.db
				.update(e.tokensDeRenovacion)
				.set({ reemplazadoPor: id })
				.where(eq(e.tokensDeRenovacion.id, token.id)),
			this.db
				.update(e.sesiones)
				.set({ ultimoUsoEn: ahora, ip: meta.ip, agente: recortar(meta.agente) })
				.where(eq(e.sesiones.id, sesion.id)),
		]);

		return {
			tipo: "nuevos",
			emitidos: {
				acceso: await this.firmarPara(usuario, sesion.id),
				renovacion: nuevo,
				renovacionExpiraEn: expiraEn,
			},
		};
	}

	/**
	 * Corta una sesión YA: en la base, para que no se renueve, y en Redis, para
	 * que su JWT deje de valer antes de caducar.
	 */
	async revocar(sesionId: string, motivo: string) {
		await this.db
			.update(e.sesiones)
			.set({ revocadaEn: new Date(), motivoRevocacion: motivo })
			.where(and(eq(e.sesiones.id, sesionId), isNull(e.sesiones.revocadaEn)));

		await this.redis.set(
			CLAVE_BLOQUEO(sesionId),
			motivo,
			"EX",
			ACCESO_MAS_LARGO,
		);
	}

	/** Todas las de un usuario: al cambiar la contraseña o desactivarlo. */
	async revocarTodas(usuarioId: string, motivo: string) {
		const vivas = await this.db
			.select({ id: e.sesiones.id })
			.from(e.sesiones)
			.where(
				and(eq(e.sesiones.usuarioId, usuarioId), isNull(e.sesiones.revocadaEn)),
			);

		for (const { id } of vivas) await this.revocar(id, motivo);
	}

	/** Lo consulta el guard en cada petición. */
	async bloqueada(sesionId: string) {
		return (await this.redis.exists(CLAVE_BLOQUEO(sesionId))) === 1;
	}

	/** Busca a qué sesión pertenece un token de renovación, sin gastarlo. */
	async sesionDeRenovacion(crudo: string) {
		const [fila] = await this.db
			.select({ sesionId: e.tokensDeRenovacion.sesionId })
			.from(e.tokensDeRenovacion)
			.where(eq(e.tokensDeRenovacion.huella, huellaDe(crudo)))
			.limit(1);
		return fila?.sesionId ?? null;
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	private async emitirRenovacion(sesion: typeof e.sesiones.$inferSelect) {
		/* 32 bytes aleatorios: no se adivinan, y como sólo se guarda su
		   sha256 no hace falta un hash lento — no hay nada que probar por
		   fuerza bruta en un espacio de 2^256. */
		const crudo = randomBytes(32).toString("base64url");
		const tope = sesion.expiraAbsolutaEn.getTime();
		const expiraEn = new Date(
			Math.min(Date.now() + DURACIONES[sesion.tipo].renovacion * 1000, tope),
		);

		const [fila] = await this.db
			.insert(e.tokensDeRenovacion)
			.values({ sesionId: sesion.id, huella: huellaDe(crudo), expiraEn })
			.returning({ id: e.tokensDeRenovacion.id });

		return { crudo, id: fila.id, expiraEn };
	}

	private firmarPara(usuario: Usuario, sesionId: string) {
		return this.jwt.firmar(usuario.tipo, usuario.id, {
			sid: sesionId,
			email: usuario.correo,
			email_verified: usuario.correoVerificadoEn !== null,
		});
	}
}

function fuera() {
	return new UnauthorizedException("Tu sesión terminó. Vuelve a entrar.");
}

/** El User-Agent llega del cliente: sin tope, cualquiera llena la tabla. */
function recortar(texto: string | null) {
	return texto ? texto.slice(0, 300) : null;
}
