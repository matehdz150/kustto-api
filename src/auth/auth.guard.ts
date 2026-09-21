import {
	type CanActivate,
	type ExecutionContext,
	Inject,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { JwtService } from "../cuentas/jwt.service";
import { SesionesService } from "../cuentas/sesiones.service";
import { cookieDeAcceso, type TipoDeUsuario } from "../cuentas/tipos";
import { type Identidad, type Pool, verificar } from "./cognito";

/** La identidad, colgada de la petición para que la lean los controladores. */
export type PeticionConIdentidad = Request & { identidad?: Identidad };

/** El pool de Cognito que corresponde a cada tipo de cuenta propia. */
const POOL_DE: Record<TipoDeUsuario, Pool["nombre"]> = {
	comprador: "compradores",
	taller: "talleres",
	admin: "admins",
};

/**
 * DOS CAMINOS MIENTRAS DURA LA MUDANZA DE COGNITO.
 *
 * 1. La cookie `kustto_acceso_<tipo>` con NUESTRO JWT. Si está, manda ella y
 *    no se mira nada más: un JWT propio caducado es un 401 para que el front
 *    renueve, no una invitación a probar con otro token.
 * 2. Si no hay cookie, el `Authorization: Bearer` de Cognito, como siempre.
 *
 * Cuando el front deje Cognito, el segundo camino se borra y con él `jose`
 * contra los JWKS de AWS. Los servicios no notan la diferencia: los dos
 * caminos dejan el MISMO `Identidad` en la petición.
 */
abstract class GuardDeSesion implements CanActivate {
	constructor(
		@Inject(ENTORNO) protected readonly env: Entorno,
		private readonly jwt: JwtService,
		private readonly sesiones: SesionesService,
	) {}

	/** Cada guard concreto dice de QUÉ tipo acepta sesiones. */
	protected abstract tipo(): TipoDeUsuario;

	async canActivate(contexto: ExecutionContext): Promise<boolean> {
		const peticion = contexto.switchToHttp().getRequest<PeticionConIdentidad>();
		const tipo = this.tipo();

		const cookie = peticion.cookies?.[cookieDeAcceso(tipo)];
		if (cookie) {
			peticion.identidad = await this.dePropia(tipo, cookie);
			return true;
		}

		const token = tokenDe(peticion);
		if (!token) throw new UnauthorizedException("Falta el token");

		try {
			peticion.identidad = await verificar(this.pool(POOL_DE[tipo]), token);
		} catch (error) {
			/* El motivo NO sale al cliente: distinguir "firma inválida" de
			   "audiencia equivocada" le dice a quien prueba tokens por dónde
			   seguir. Al log sí va entero. */
			console.warn(`Token rechazado (${tipo}):`, (error as Error).message);
			throw new UnauthorizedException("Token inválido");
		}

		return true;
	}

	private async dePropia(
		tipo: TipoDeUsuario,
		token: string,
	): Promise<Identidad> {
		let identidad: Awaited<ReturnType<JwtService["verificar"]>>;
		try {
			identidad = await this.jwt.verificar(tipo, token);
		} catch (error) {
			console.warn(`Sesión rechazada (${tipo}):`, (error as Error).message);
			throw new UnauthorizedException("Tu sesión caducó");
		}

		/* La lista de bloqueo: lo que hace que salir o desactivar a un taller
		   corte YA, y no cuando caduque el JWT. */
		if (await this.sesiones.bloqueada(identidad.sid)) {
			throw new UnauthorizedException("Tu sesión terminó. Vuelve a entrar.");
		}

		const { sid: _sid, ...resto } = identidad;
		return resto;
	}

	private pool(nombre: Pool["nombre"]): Pool {
		const env = this.env;

		const pools: Record<Pool["nombre"], Pool> = {
			compradores: {
				nombre: "compradores",
				region: env.COGNITO_REGION,
				poolId: env.COGNITO_POOL_COMPRADORES,
				clienteId: env.COGNITO_CLIENTE_COMPRADORES,
			},
			talleres: {
				nombre: "talleres",
				region: env.COGNITO_REGION,
				poolId: env.COGNITO_POOL_TALLERES,
				clienteId: env.COGNITO_CLIENTE_TALLERES,
			},
			admins: {
				nombre: "admins",
				region: env.COGNITO_REGION,
				poolId: env.COGNITO_POOL_ADMINS,
				clienteId: env.COGNITO_CLIENTE_ADMINS,
			},
		};

		return pools[nombre];
	}
}

function tokenDe(peticion: Request): string | null {
	const cabecera = peticion.headers.authorization ?? "";
	const [tipo, valor] = cabecera.split(" ");
	return tipo?.toLowerCase() === "bearer" && valor ? valor : null;
}

/**
 * UN GUARD POR TIPO, y no uno con parámetro.
 *
 * Así la ruta DICE de quién es: `@UseGuards(GuardComprador)` se lee en la
 * misma línea, y no hay forma de montar una ruta de `/cuenta/*` con el guard
 * de talleres por descuido — que es exactamente lo que el reparto en tres
 * tipos está para impedir.
 */
@Injectable()
export class GuardComprador extends GuardDeSesion {
	protected tipo(): TipoDeUsuario {
		return "comprador";
	}
}

@Injectable()
export class GuardTaller extends GuardDeSesion {
	protected tipo(): TipoDeUsuario {
		return "taller";
	}
}

@Injectable()
export class GuardAdmin extends GuardDeSesion {
	protected tipo(): TipoDeUsuario {
		return "admin";
	}
}
