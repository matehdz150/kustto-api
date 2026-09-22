import { randomInt } from "node:crypto";
import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, desc, eq, gt, isNull, lt, ne, sql } from "drizzle-orm";
import type IORedis from "ioredis";
import { COLAS } from "../colas/colas";
import { COLA, REDIS } from "../colas/colas.module";
import type { Correo } from "../correo/correo.service";
import { codigoDeVerificacion } from "../correo/plantillas";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { hashear, problemaDeContrasena } from "./contrasenas";
import { CuentasService } from "./cuentas.service";
import { JwtService } from "./jwt.service";
import { type Meta, SesionesService } from "./sesiones.service";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cuánto vale un código. Lo mismo que daba Cognito: se revisa el correo tarde. */
const VIGENCIA_H = 24;
/** Al quinto fallo el código muere: seis dígitos se adivinan sin tope. */
const MAX_INTENTOS = 5;

/**
 * Los topes de mandar correo. SIN ELLOS, "reenviar código" es un botón para
 * llenarle la bandeja a cualquiera —y para quemar la reputación del
 * remitente, que es la que decide si los correos de pedidos llegan—.
 */
const ESPERA_ENTRE_ENVIOS_S = 60;
const ENVIOS_POR_HORA = 5;
const REGISTROS_POR_IP_HORA = 10;

type Usuario = typeof e.usuarios.$inferSelect;

/** Un error con `codigo`, que es lo que el front traduce a su mensaje. */
function error(
	estado: HttpStatus,
	codigo: string,
	message: string,
	extra: Record<string, unknown> = {},
) {
	return new HttpException(
		{ statusCode: estado, codigo, message, ...extra },
		estado,
	);
}

/**
 * El alta de compradores y la verificación del correo.
 *
 * Sólo compradores: los talleres llegan por invitación del admin, y el admin
 * se da de alta a mano.
 */
@Injectable()
export class RegistroService {
	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(REDIS) private readonly redis: IORedis,
		@Inject(COLA(COLAS.correo)) private readonly correos: Queue<Correo>,
		private readonly cuentas: CuentasService,
		private readonly sesiones: SesionesService,
		private readonly jwt: JwtService,
	) {}

	/**
	 * Crea la cuenta sin verificar y manda el código. NO ABRE SESIÓN: eso pasa
	 * al verificar.
	 */
	async registrar(cuerpo: Record<string, unknown>, meta: Meta) {
		const nombre = String(cuerpo?.nombre ?? "")
			.trim()
			.slice(0, 80);
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();
		const contrasena = String(cuerpo?.contrasena ?? "");

		if (!nombre) throw new BadRequestException("Escribe tu nombre");
		if (!CORREO.test(correo)) {
			throw new BadRequestException("Ese correo no es válido");
		}
		const problema = problemaDeContrasena(contrasena);
		if (problema) throw error(HttpStatus.BAD_REQUEST, "contrasena", problema);

		if (meta.ip) {
			await this.tope(
				`registrar-ip:${meta.ip}`,
				REGISTROS_POR_IP_HORA,
				60 * 60,
			);
		}

		const [existente] = await this.db
			.select()
			.from(e.usuarios)
			.where(
				and(eq(e.usuarios.tipo, "comprador"), eq(e.usuarios.correo, correo)),
			)
			.limit(1);

		let usuario: Usuario;

		/* MIENTRAS DURA LA MUDANZA DE COGNITO: quien entraba por Cognito y
		   todavía no está en `usuarios` ya tiene su perfil en `compradores`
		   con ese correo. Registrarse otra vez le crearía una segunda cuenta
		   —otro id, sin sus pedidos ni su carrito— y además chocaría con el
		   correo único del perfil. Ya tiene cuenta: eso se le dice. */
		const [perfilAjeno] = await this.db
			.select({ id: e.compradores.id })
			.from(e.compradores)
			.where(
				and(
					eq(e.compradores.correo, correo),
					...(existente ? [ne(e.compradores.id, existente.id)] : []),
				),
			)
			.limit(1);

		if (existente?.correoVerificadoEn || perfilAjeno) {
			/* Se dice, como lo decía Cognito: la pantalla lo manda a entrar. Es
			   saber que el correo tiene cuenta, que es poco, y a cambio quien
			   ya se registró no se queda esperando un código que no llega. */
			throw error(
				HttpStatus.CONFLICT,
				"ya_existe",
				"Ya hay una cuenta con ese correo. Entra con tu contraseña.",
			);
		}

		if (existente) {
			/* EL TOPE ANTES DE TOCAR NADA: si fuera después, un registro
			   rechazado por "espera un minuto" ya habría cambiado la contraseña
			   sin que nadie se enterara. */
			await this.contarEnvio(existente.id);

			/* EXISTE PERO SIN VERIFICAR: la contraseña nueva REEMPLAZA a la
			   vieja. Si no, cualquiera podría registrar tu correo antes que tú
			   con una contraseña suya y dejarte fuera para siempre. Una cuenta
			   sin verificar no tiene nada que proteger: no ve pedidos. */
			[usuario] = await this.db
				.update(e.usuarios)
				.set({
					contrasenaHash: await hashear(contrasena),
					actualizadoEn: new Date(),
				})
				.where(eq(e.usuarios.id, existente.id))
				.returning();
		} else {
			usuario = await this.cuentas.crear("comprador", { correo, contrasena });
			/* Cuenta nueva: nada que proteger todavía, pero el envío se cuenta
			   igual para que el siguiente registro con ese correo respete la
			   espera. */
			await this.contarEnvio(usuario.id);
		}

		/* El perfil nace con el nombre, que es donde lo guardaba Cognito (su
		   atributo `name`). Si ya había uno, se le pone el nombre nuevo. */
		await this.db
			.insert(e.compradores)
			.values({ id: usuario.id, correo, nombre })
			.onConflictDoUpdate({ target: e.compradores.id, set: { nombre } });

		await this.emitirCodigo(usuario, nombre);

		return { ok: true, correo };
	}

	/**
	 * Comprueba el código y, si cuadra, marca el correo y ABRE LA SESIÓN.
	 *
	 * Entrar directo es a propósito: quien acaba de escribir el código
	 * demostró que el correo es suyo, y pedirle la contraseña otra vez es un
	 * paso de más. Con Cognito el front lo resolvía volviendo a entrar con la
	 * contraseña que guardaba en memoria; así ya no tiene que guardarla.
	 */
	async verificar(cuerpo: Record<string, unknown>, meta: Meta) {
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();
		const codigo = String(cuerpo?.codigo ?? "").replace(/\D/g, "");

		if (codigo.length !== 6) {
			throw error(
				HttpStatus.BAD_REQUEST,
				"codigo_invalido",
				"El código tiene seis dígitos",
			);
		}

		const [usuario] = await this.db
			.select()
			.from(e.usuarios)
			.where(
				and(eq(e.usuarios.tipo, "comprador"), eq(e.usuarios.correo, correo)),
			)
			.limit(1);

		/* Sin cuenta: el MISMO mensaje que un código equivocado. */
		if (!usuario || usuario.desactivadoEn) throw codigoMal();

		if (usuario.correoVerificadoEn) {
			throw error(
				HttpStatus.CONFLICT,
				"ya_verificado",
				"Ese correo ya está confirmado. Entra con tu contraseña.",
			);
		}

		const [vivo] = await this.db
			.select()
			.from(e.tokensDeUnUso)
			.where(
				and(
					eq(e.tokensDeUnUso.usuarioId, usuario.id),
					eq(e.tokensDeUnUso.proposito, "verificar_correo"),
					isNull(e.tokensDeUnUso.usadoEn),
					gt(e.tokensDeUnUso.expiraEn, new Date()),
				),
			)
			.orderBy(desc(e.tokensDeUnUso.creadoEn))
			.limit(1);

		if (!vivo) {
			throw error(
				HttpStatus.BAD_REQUEST,
				"codigo_vencido",
				"Ese código ya no vale. Pide uno nuevo.",
			);
		}

		/* EL INTENTO SE GASTA ANTES DE COMPARAR, y con condición. Al revés
		   —comparar y luego contar— mil peticiones en paralelo leen todas
		   "0 intentos" antes de que ninguna sume, y son mil oportunidades en vez
		   de cinco. Así, la sexta no encuentra fila que actualizar aunque
		   lleguen todas en el mismo milisegundo. */
		const [intento] = await this.db
			.update(e.tokensDeUnUso)
			.set({ intentos: sql`${e.tokensDeUnUso.intentos} + 1` })
			.where(
				and(
					eq(e.tokensDeUnUso.id, vivo.id),
					isNull(e.tokensDeUnUso.usadoEn),
					lt(e.tokensDeUnUso.intentos, MAX_INTENTOS),
				),
			)
			.returning({ intentos: e.tokensDeUnUso.intentos });

		if (!intento) {
			throw error(
				HttpStatus.BAD_REQUEST,
				"codigo_vencido",
				"Demasiados intentos con ese código. Pide uno nuevo.",
			);
		}

		if (vivo.huella !== (await this.huella(usuario.id, codigo))) {
			throw error(
				HttpStatus.BAD_REQUEST,
				"codigo_invalido",
				"Ese código no es correcto",
				{ restantes: MAX_INTENTOS - intento.intentos },
			);
		}

		/* Se gasta CON CONDICIÓN: dos peticiones con el código bueno a la vez no
		   abren dos sesiones. */
		const gastado = await this.db
			.update(e.tokensDeUnUso)
			.set({ usadoEn: new Date() })
			.where(
				and(eq(e.tokensDeUnUso.id, vivo.id), isNull(e.tokensDeUnUso.usadoEn)),
			)
			.returning({ id: e.tokensDeUnUso.id });
		if (gastado.length === 0) throw codigoMal();

		const [verificado] = await this.db
			.update(e.usuarios)
			.set({ correoVerificadoEn: new Date(), actualizadoEn: new Date() })
			.where(eq(e.usuarios.id, usuario.id))
			.returning();

		return {
			emitidos: await this.sesiones.iniciar(verificado, meta),
			usuario: verificado,
		};
	}

	/**
	 * Manda otro código.
	 *
	 * SIEMPRE CONTESTA LO MISMO, exista la cuenta o no, esté verificada o no:
	 * esta ruta no tiene por qué decir qué correos tienen cuenta. Los topes sí
	 * se aplican siempre, para que tampoco lo diga el tiempo que tarda.
	 */
	async reenviar(cuerpo: Record<string, unknown>) {
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();
		if (!CORREO.test(correo)) {
			throw new BadRequestException("Ese correo no es válido");
		}

		const [usuario] = await this.db
			.select()
			.from(e.usuarios)
			.where(
				and(eq(e.usuarios.tipo, "comprador"), eq(e.usuarios.correo, correo)),
			)
			.limit(1);

		if (usuario && !usuario.correoVerificadoEn && !usuario.desactivadoEn) {
			await this.contarEnvio(usuario.id);
			const [perfil] = await this.db
				.select({ nombre: e.compradores.nombre })
				.from(e.compradores)
				.where(eq(e.compradores.id, usuario.id))
				.limit(1);
			await this.emitirCodigo(usuario, perfil?.nombre ?? null);
		}

		return { ok: true };
	}

	/* ─── Lo que sostiene todo lo de arriba ───────────────────────────────── */

	/**
	 * Genera un código, deja muertos los anteriores y lo manda.
	 *
	 * LOS ANTERIORES SE MATAN: si no, el de hace tres reenvíos seguiría
	 * valiendo, y "cinco intentos por código" serían cinco por cada uno que
	 * alguien se molestó en pedir.
	 */
	private async emitirCodigo(usuario: Usuario, nombre: string | null) {
		/* `randomInt` y no `Math.random`: éste no es criptográfico, y un código
		   predecible es un correo que cualquiera puede confirmar. */
		const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");

		await this.db.transaction(async (tx) => {
			await tx
				.update(e.tokensDeUnUso)
				.set({ usadoEn: new Date() })
				.where(
					and(
						eq(e.tokensDeUnUso.usuarioId, usuario.id),
						eq(e.tokensDeUnUso.proposito, "verificar_correo"),
						isNull(e.tokensDeUnUso.usadoEn),
					),
				);
			await tx.insert(e.tokensDeUnUso).values({
				usuarioId: usuario.id,
				proposito: "verificar_correo",
				huella: await this.huella(usuario.id, codigo),
				expiraEn: new Date(Date.now() + VIGENCIA_H * 60 * 60 * 1000),
			});
		});

		/* A la cola y no en línea: un SMTP lento no puede dejar la pantalla de
		   registro dando vueltas. */
		await this.correos.add(
			"codigo-verificacion",
			codigoDeVerificacion({
				para: usuario.correo,
				nombre,
				codigo,
				vigencia: VIGENCIA_H,
			}),
		);
	}

	/**
	 * Los topes de envío. Se llaman ANTES de cambiar nada, por eso no viven
	 * dentro de `emitirCodigo`.
	 */
	private async contarEnvio(usuarioId: string) {
		await this.tope(`codigo-espera:${usuarioId}`, 1, ESPERA_ENTRE_ENVIOS_S);
		await this.tope(`codigo-hora:${usuarioId}`, ENVIOS_POR_HORA, 60 * 60);
	}

	/** El usuario va en la huella: el mismo código no vale para otra cuenta. */
	private huella(usuarioId: string, codigo: string) {
		return this.jwt.huellaSecreta(`verificar_correo:${usuarioId}:${codigo}`);
	}

	/** Un tope de Redis en ventana fija. Ver `CuentasService.contar`. */
	private async tope(clave: string, maximo: number, ventanaS: number) {
		const n = await this.redis.incr(clave);
		if (n === 1) await this.redis.expire(clave, ventanaS);
		if (n > maximo) {
			throw error(
				HttpStatus.TOO_MANY_REQUESTS,
				"limite",
				"Espera un momento antes de pedir otro código.",
			);
		}
	}
}

function codigoMal() {
	return error(
		HttpStatus.BAD_REQUEST,
		"codigo_invalido",
		"Ese código no es correcto",
	);
}
