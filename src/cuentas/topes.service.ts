import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";

/**
 * Los topes de las rutas de cuentas: intentos de entrar, códigos, enlaces.
 *
 * VENTANA FIJA: el plazo se pone con el PRIMER intento y no se renueva.
 * Renovarlo en cada intento dejaría bloqueado para siempre a quien sigue
 * probando cada diez minutos, que casi siempre es una persona que no se
 * acuerda de su contraseña y no un ataque.
 *
 * EN REDIS Y NO EN MEMORIA: con dos réplicas de la API, un tope en memoria
 * serían dos topes, y el doble de intentos.
 */
@Injectable()
export class TopesService {
	constructor(@Inject(REDIS) private readonly redis: IORedis) {}

	/** Suma uno y lanza 429 si se pasa. `codigo` es el que lee el front. */
	async contar(
		clave: string,
		maximo: number,
		ventanaS: number,
		mensaje = "Demasiados intentos. Espera unos minutos y vuelve a probar.",
	) {
		const n = await this.redis.incr(clave);
		if (n === 1) await this.redis.expire(clave, ventanaS);

		if (n > maximo) {
			throw new HttpException(
				{
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					codigo: "limite",
					message: mensaje,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
	}

	/**
	 * Los topes de MANDAR CORREO a una cuenta: uno por minuto y cinco por
	 * hora. Sin ellos, "reenviar" es un botón para llenarle la bandeja a
	 * cualquiera —y para quemar la reputación del remitente, que es la que
	 * decide si los correos de pedidos llegan—.
	 *
	 * Por propósito: pedir un código de verificación no gasta el presupuesto
	 * de los enlaces para restablecer, ni al revés.
	 */
	async envio(proposito: string, usuarioId: string) {
		const mensaje = "Espera un momento antes de pedir otro correo.";
		await this.contar(`envio-espera:${proposito}:${usuarioId}`, 1, 60, mensaje);
		await this.contar(
			`envio-hora:${proposito}:${usuarioId}`,
			5,
			60 * 60,
			mensaje,
		);
	}

	/** Vuelve a cero, por ejemplo al acertar la contraseña. */
	async olvidar(clave: string) {
		await this.redis.del(clave);
	}
}
