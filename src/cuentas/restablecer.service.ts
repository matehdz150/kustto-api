import { createHash, randomBytes } from "node:crypto";
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, eq, gt, isNull } from "drizzle-orm";
import { COLAS } from "../colas/colas";
import { COLA } from "../colas/colas.module";
import type { Correo } from "../correo/correo.service";
import {
	contrasenaCambiada,
	enlaceParaRestablecer,
} from "../correo/plantillas";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { hashear, problemaDeContrasena } from "./contrasenas";
import { type Meta, SesionesService } from "./sesiones.service";
import type { TipoDeUsuario } from "./tipos";
import { TopesService } from "./topes.service";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cuánto vale un enlace. Corto a propósito: es una llave que abre la cuenta
 * entera, y quien la pidió la usa en los siguientes minutos o no la usa.
 */
const VIGENCIA_MIN = 60;
const PEDIDOS_POR_IP_HORA = 10;

type Usuario = typeof e.usuarios.$inferSelect;

/**
 * 32 bytes al azar: 2^256 posibilidades. A diferencia del código de seis
 * dígitos, aquí NO hace falta HMAC ni tope de intentos para que no se adivine;
 * basta con no guardarlo en claro.
 */
const huellaDe = (token: string) =>
	createHash("sha256").update(token).digest("hex");

function enlaceInvalido() {
	return new HttpException(
		{
			statusCode: HttpStatus.BAD_REQUEST,
			codigo: "enlace_invalido",
			message: "Ese enlace ya no sirve. Pide uno nuevo.",
		},
		HttpStatus.BAD_REQUEST,
	);
}

/**
 * "Olvidé mi contraseña", para los tres tipos.
 *
 * TAMBIÉN ES COMO SE CREA LA PRIMERA CONTRASEÑA de quien no tiene: los que
 * vienen de Cognito —que no deja exportarlas— y los que sólo entraban con
 * Google. Por eso el correo dice "crear o cambiar".
 */
@Injectable()
export class RestablecerService {
	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(COLA(COLAS.correo)) private readonly correos: Queue<Correo>,
		private readonly topes: TopesService,
		private readonly sesiones: SesionesService,
	) {}

	/**
	 * Manda el enlace si hay cuenta. CONTESTA LO MISMO SI NO LA HAY.
	 *
	 * Y LOS TOPES TAMBIÉN SE CUENTAN SIN CUENTA, con el correo como llave: si
	 * sólo se contaran para las que existen, el 429 al tercer intento diría
	 * justo lo que la respuesta se esfuerza en callar.
	 */
	async olvide(
		tipo: TipoDeUsuario,
		cuerpo: Record<string, unknown>,
		meta: Meta,
	) {
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();
		if (!CORREO.test(correo)) {
			throw new BadRequestException("Ese correo no es válido");
		}

		if (meta.ip) {
			await this.topes.contar(
				`olvide-ip:${meta.ip}`,
				PEDIDOS_POR_IP_HORA,
				60 * 60,
			);
		}

		const [usuario] = await this.db
			.select()
			.from(e.usuarios)
			.where(and(eq(e.usuarios.tipo, tipo), eq(e.usuarios.correo, correo)))
			.limit(1);

		const vivo = usuario && !usuario.desactivadoEn ? usuario : null;
		await this.topes.envio(
			"restablecer",
			vivo ? vivo.id : `sin-cuenta:${tipo}:${correo}`,
		);

		if (vivo) await this.emitirEnlace(vivo);

		return { ok: true };
	}

	/**
	 * Si el enlace sirve, SIN gastarlo. La página lo pregunta al abrirse para
	 * decir "este enlace venció" antes de que la persona invente una
	 * contraseña nueva, y no después.
	 */
	async comprobar(tipo: TipoDeUsuario, cuerpo: Record<string, unknown>) {
		const { usuario } = await this.vigente(tipo, String(cuerpo?.token ?? ""));
		return { ok: true, correo: usuario.correo };
	}

	/**
	 * Pone la contraseña nueva, cierra TODAS las sesiones y abre una.
	 *
	 * CERRARLAS TODAS es el punto de cambiar la contraseña después de un
	 * susto: si alguien tenía la cuenta abierta en otro aparato, se queda
	 * fuera ya, no cuando caduque su token de renovación dentro de un mes.
	 */
	async restablecer(
		tipo: TipoDeUsuario,
		cuerpo: Record<string, unknown>,
		meta: Meta,
	) {
		const contrasena = String(cuerpo?.contrasena ?? "");
		const problema = problemaDeContrasena(contrasena);
		if (problema) {
			throw new HttpException(
				{
					statusCode: HttpStatus.BAD_REQUEST,
					codigo: "contrasena",
					message: problema,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const { token, usuario } = await this.vigente(
			tipo,
			String(cuerpo?.token ?? ""),
		);

		/* Se gasta CON CONDICIÓN: el mismo enlace abierto en dos pestañas no
		   cambia la contraseña dos veces. */
		const gastado = await this.db
			.update(e.tokensDeUnUso)
			.set({ usadoEn: new Date() })
			.where(
				and(eq(e.tokensDeUnUso.id, token.id), isNull(e.tokensDeUnUso.usadoEn)),
			)
			.returning({ id: e.tokensDeUnUso.id });
		if (gastado.length === 0) throw enlaceInvalido();

		const [actualizado] = await this.db
			.update(e.usuarios)
			.set({
				contrasenaHash: await hashear(contrasena),
				/* El enlace llegó a ese correo y se abrió: el correo es suyo. Es
				   lo que desbloquea a un comprador que se registró y nunca metió
				   el código. */
				correoVerificadoEn: usuario.correoVerificadoEn ?? new Date(),
				actualizadoEn: new Date(),
			})
			.where(eq(e.usuarios.id, usuario.id))
			.returning();

		await this.sesiones.revocarTodas(usuario.id, "cambio_de_contrasena");

		/* Quien pidió el enlace muchas veces seguramente se equivocó muchas
		   veces al entrar: el contador de intentos vuelve a cero con la
		   contraseña nueva, o lo primero que vería es "demasiados intentos". */
		await this.topes.olvidar(`entrar:${tipo}:${usuario.correo}`);

		await this.correos.add(
			"contrasena-cambiada",
			contrasenaCambiada({
				para: usuario.correo,
				nombre: await this.nombreDe(usuario),
			}),
		);

		return {
			emitidos: await this.sesiones.iniciar(actualizado, meta),
			usuario: actualizado,
		};
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	/**
	 * Genera un enlace y deja muertos los anteriores: sólo vale el último que
	 * se pidió, que es el que la persona tiene delante.
	 */
	private async emitirEnlace(usuario: Usuario) {
		const token = randomBytes(32).toString("base64url");

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.tokensDeUnUso)
				.set({ usadoEn: new Date() })
				.where(
					and(
						eq(e.tokensDeUnUso.usuarioId, usuario.id),
						eq(e.tokensDeUnUso.proposito, "restablecer"),
						isNull(e.tokensDeUnUso.usadoEn),
					),
				);
			await tx.insert(e.tokensDeUnUso).values({
				usuarioId: usuario.id,
				proposito: "restablecer",
				huella: huellaDe(token),
				expiraEn: new Date(Date.now() + VIGENCIA_MIN * 60 * 1000),
			});
		});

		await this.correos.add(
			"restablecer",
			enlaceParaRestablecer({
				para: usuario.correo,
				nombre: await this.nombreDe(usuario),
				tipo: usuario.tipo,
				token,
				vigencia: VIGENCIA_MIN,
			}),
		);
	}

	/**
	 * El enlace, si sigue vivo y es de ESE tipo.
	 *
	 * Todos los fallos son el mismo: no existe, ya se usó, venció, es de otro
	 * tipo, la cuenta está desactivada. Distinguirlos no le sirve a nadie más
	 * que a quien está probando enlaces.
	 */
	private async vigente(tipo: TipoDeUsuario, crudo: string) {
		if (!crudo || crudo.length > 100) throw enlaceInvalido();

		const [fila] = await this.db
			.select({ token: e.tokensDeUnUso, usuario: e.usuarios })
			.from(e.tokensDeUnUso)
			.innerJoin(e.usuarios, eq(e.usuarios.id, e.tokensDeUnUso.usuarioId))
			.where(
				and(
					eq(e.tokensDeUnUso.huella, huellaDe(crudo)),
					eq(e.tokensDeUnUso.proposito, "restablecer"),
					isNull(e.tokensDeUnUso.usadoEn),
					gt(e.tokensDeUnUso.expiraEn, new Date()),
				),
			)
			.limit(1);

		if (!fila || fila.usuario.tipo !== tipo || fila.usuario.desactivadoEn) {
			throw enlaceInvalido();
		}
		return fila;
	}

	/** El nombre para el saludo. Sólo el comprador lo tiene a la mano. */
	private async nombreDe(usuario: Usuario) {
		if (usuario.tipo !== "comprador") return null;
		const [perfil] = await this.db
			.select({ nombre: e.compradores.nombre })
			.from(e.compradores)
			.where(eq(e.compradores.id, usuario.id))
			.limit(1);
		return perfil?.nombre ?? null;
	}
}
