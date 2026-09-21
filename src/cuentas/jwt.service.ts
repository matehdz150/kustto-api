import {
	Inject,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import {
	importJWK,
	type JWK,
	type JWTVerifyGetKey,
	jwtVerify,
	type KeyLike,
	SignJWT,
} from "jose";
import type { Identidad } from "../auth/cognito";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { audienciaDe, DURACIONES, type TipoDeUsuario } from "./tipos";

/** Lo que va dentro del JWT, además de lo estándar. */
export type Reclamaciones = {
	sid: string;
	email: string;
	email_verified: boolean;
};

type Llave = { kid: string; llave: KeyLike | Uint8Array };

/**
 * Firmar y verificar el JWT de acceso.
 *
 * Ed25519 (`EdDSA`): llaves de 32 bytes, firma rápida y sin los parámetros que
 * hay que elegir bien en RSA o en ECDSA. Sólo verifica esta API, así que no
 * hace falta publicar un JWKS; el `kid` está para poder rotar.
 *
 * LA AUDIENCIA ES EL TIPO (`kustto:comprador`…). Es exactamente lo que el
 * guard comprobaba con el cliente de cada pool de Cognito: un JWT de comprador
 * no pasa el guard del taller aunque alguien lo pegue en la otra cookie.
 */
@Injectable()
export class JwtService {
	private readonly log = new Logger(JwtService.name);
	private actual: Llave | null = null;
	private readonly publicas = new Map<string, KeyLike | Uint8Array>();
	private readonly lista: Promise<void>;

	constructor(@Inject(ENTORNO) private readonly env: Entorno) {
		this.lista = this.cargar();
	}

	/** Si hay llave. Sin ella, las cuentas propias están apagadas. */
	async activo() {
		await this.lista;
		return this.actual !== null;
	}

	async firmar(tipo: TipoDeUsuario, sub: string, reclamaciones: Reclamaciones) {
		await this.lista;
		if (!this.actual) {
			throw new ServiceUnavailableException(
				"Las cuentas propias no están configuradas",
			);
		}

		return new SignJWT(reclamaciones)
			.setProtectedHeader({ alg: "EdDSA", kid: this.actual.kid })
			.setIssuer(this.env.JWT_EMISOR)
			.setAudience(audienciaDe(tipo))
			.setSubject(sub)
			.setIssuedAt()
			.setExpirationTime(`${DURACIONES[tipo].acceso}s`)
			.sign(this.actual.llave);
	}

	/**
	 * Verifica firma, emisor, audiencia y caducidad. Lanza si algo no cuadra;
	 * el motivo es para el registro, no para el cliente.
	 */
	async verificar(
		tipo: TipoDeUsuario,
		token: string,
	): Promise<Identidad & { sid: string }> {
		await this.lista;
		if (this.publicas.size === 0) {
			throw new Error("Las cuentas propias no están configuradas");
		}

		const llavePorKid: JWTVerifyGetKey = (cabecera) => {
			const llave = cabecera.kid ? this.publicas.get(cabecera.kid) : null;
			if (!llave) throw new Error(`No conozco la llave ${cabecera.kid}`);
			return llave as KeyLike;
		};

		const { payload } = await jwtVerify(token, llavePorKid, {
			issuer: this.env.JWT_EMISOR,
			audience: audienciaDe(tipo),
			algorithms: ["EdDSA"],
		});

		const sub = typeof payload.sub === "string" ? payload.sub : "";
		const sid = typeof payload.sid === "string" ? payload.sid : "";
		if (!sub || !sid) throw new Error("El JWT no trae `sub` o `sid`");

		return {
			sub,
			sid,
			correo: String(payload.email ?? "").toLowerCase(),
			correoVerificado: payload.email_verified === true,
			grupos: [],
		};
	}

	private async cargar() {
		const privada = this.env.JWT_LLAVE_PRIVADA;

		if (!privada) {
			this.log.warn(
				"Sin JWT_LLAVE_PRIVADA: /auth/* apagado, sólo se acepta Cognito.",
			);
			return;
		}

		const jwk = leerJwk(privada, "JWT_LLAVE_PRIVADA");
		if (!jwk.d) {
			throw new Error("JWT_LLAVE_PRIVADA tiene que ser la llave PRIVADA");
		}

		const kid = jwk.kid as string;
		this.actual = { kid, llave: await importJWK(jwk, "EdDSA") };

		/* La pública sale de la privada quitándole `d`. */
		const { d: _d, ...publica } = jwk;
		this.publicas.set(kid, await importJWK(publica, "EdDSA"));

		if (this.env.JWT_LLAVE_ANTERIOR) {
			const anterior = leerJwk(
				this.env.JWT_LLAVE_ANTERIOR,
				"JWT_LLAVE_ANTERIOR",
			);
			/* Sólo la parte pública: la anterior ya no firma, y guardar su
			   secreto donde no hace falta es un secreto más que se puede filtrar. */
			const { d: _sinSecreto, ...soloPublica } = anterior;
			this.publicas.set(
				anterior.kid as string,
				await importJWK(soloPublica, "EdDSA"),
			);
		}
	}
}

/**
 * Lee un JWK de una variable de entorno y exige lo mínimo.
 *
 * FALLA AL ARRANCAR con un mensaje que dice qué variable está mal: una llave
 * rota que se descubre en el primer intento de entrar deja a todos fuera.
 */
function leerJwk(texto: string, nombre: string): JWK {
	let jwk: JWK;
	try {
		jwk = JSON.parse(texto);
	} catch {
		throw new Error(`${nombre} no es un JWK en JSON`);
	}

	if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.x) {
		throw new Error(`${nombre} tiene que ser una llave Ed25519 (OKP)`);
	}
	if (!jwk.kid) {
		throw new Error(`${nombre} no trae \`kid\`: sin él no se puede rotar`);
	}

	return jwk;
}
