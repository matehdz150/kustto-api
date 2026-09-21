import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { comprobar, hashear, problemaDeContrasena } from "./contrasenas";
import { type Meta, SesionesService } from "./sesiones.service";
import type { TipoDeUsuario } from "./tipos";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Los topes de intentos de entrar, en ventanas de 15 minutos.
 *
 * DOS TOPES Y NO UNO. Por correo, para que nadie pruebe mil contraseñas
 * contra la misma cuenta. Por IP, para que nadie pruebe UNA contraseña común
 * contra mil cuentas —eso no lo para el tope por correo—. El de IP es más
 * alto porque detrás de una oficina hay mucha gente con la misma.
 */
const VENTANA_S = 15 * 60;
const TOPE_POR_CORREO = 5;
const TOPE_POR_IP = 30;

/**
 * "Correo o contraseña incorrectos", siempre el mismo.
 *
 * No se dice cuál de los dos falló, ni si la cuenta existe, ni si está
 * desactivada: cada una de esas respuestas le dice a quien prueba correos por
 * dónde seguir.
 */
const MAL = "Correo o contraseña incorrectos";

@Injectable()
export class CuentasService {
	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(REDIS) private readonly redis: IORedis,
		private readonly sesiones: SesionesService,
	) {}

	async entrar(
		tipo: TipoDeUsuario,
		cuerpo: Record<string, unknown>,
		meta: Meta,
	) {
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();
		const contrasena = String(cuerpo?.contrasena ?? "");

		if (!correo || !contrasena) {
			throw new BadRequestException("Escribe tu correo y tu contraseña");
		}

		/* El tope va ANTES de mirar la base y de correr argon2: si no, un ataque
		   sigue costándonos CPU aunque lo estemos rechazando. */
		const claveCorreo = `entrar:${tipo}:${correo}`;
		await this.contar(claveCorreo, TOPE_POR_CORREO);
		if (meta.ip) await this.contar(`entrar-ip:${meta.ip}`, TOPE_POR_IP);

		const [usuario] = await this.db
			.select()
			.from(e.usuarios)
			.where(and(eq(e.usuarios.tipo, tipo), eq(e.usuarios.correo, correo)))
			.limit(1);

		/* Se compara SIEMPRE, exista o no la cuenta: ver `comprobar`. */
		const bien = await comprobar(usuario?.contrasenaHash ?? null, contrasena);

		if (!usuario || !bien || usuario.desactivadoEn) {
			throw new UnauthorizedException(MAL);
		}

		/* Contraseña correcta: el contador de ese correo vuelve a cero. Sin esto,
		   quien se equivoca cuatro veces y acierta a la quinta queda a un error
		   de bloquearse durante un cuarto de hora. */
		await this.redis.del(claveCorreo);

		/* Aquí sí se dice qué pasa: ya demostró que la contraseña es suya, y el
		   front necesita saberlo para llevarlo a la pantalla del código. Es el
		   mismo trato que daba Cognito (`UserNotConfirmedException`). */
		if (tipo === "comprador" && !usuario.correoVerificadoEn) {
			throw new ForbiddenException({
				message: "Confirma tu correo antes de entrar",
				codigo: "correo_sin_verificar",
			});
		}

		return this.sesiones.iniciar(usuario, meta);
	}

	/** Quién es, con lo que el front necesita pintar. Ya no puede leer el JWT. */
	async yo(tipo: TipoDeUsuario, usuarioId: string) {
		const [usuario] = await this.db
			.select()
			.from(e.usuarios)
			.where(and(eq(e.usuarios.id, usuarioId), eq(e.usuarios.tipo, tipo)))
			.limit(1);

		if (!usuario || usuario.desactivadoEn) {
			throw new UnauthorizedException("Tu sesión terminó. Vuelve a entrar.");
		}

		return {
			id: usuario.id,
			tipo: usuario.tipo,
			correo: usuario.correo,
			correoVerificado: usuario.correoVerificadoEn !== null,
		};
	}

	/**
	 * Crea una cuenta con contraseña.
	 *
	 * La usan el registro de compradores y las pruebas. `verificado` es para
	 * las pruebas y para lo que se da de alta a mano; el registro normal nace
	 * sin verificar y manda el código.
	 */
	async crear(
		tipo: TipoDeUsuario,
		datos: {
			correo: string;
			contrasena: string;
			verificado?: boolean;
			id?: string;
		},
	) {
		const correo = datos.correo.trim().toLowerCase();
		if (!CORREO.test(correo))
			throw new BadRequestException("Ese correo no es válido");

		const problema = problemaDeContrasena(datos.contrasena);
		if (problema) throw new BadRequestException(problema);

		const [creado] = await this.db
			.insert(e.usuarios)
			.values({
				...(datos.id ? { id: datos.id } : {}),
				tipo,
				correo,
				contrasenaHash: await hashear(datos.contrasena),
				correoVerificadoEn: datos.verificado ? new Date() : null,
			})
			.onConflictDoNothing()
			.returning();

		if (!creado)
			throw new ConflictException("Ya hay una cuenta con ese correo");
		return creado;
	}

	/** Suma un intento y corta al pasarse del tope. */
	private async contar(clave: string, tope: number) {
		const n = await this.redis.incr(clave);
		/* El plazo se pone con el PRIMER intento y no se renueva: una ventana
		   fija. Renovarlo en cada intento dejaría bloqueado para siempre a quien
		   sigue probando cada diez minutos. */
		if (n === 1) await this.redis.expire(clave, VENTANA_S);

		if (n > tope) {
			throw new HttpException(
				"Demasiados intentos. Espera unos minutos y vuelve a probar.",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
	}
}
