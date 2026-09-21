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
import { type Identidad, type Pool, verificar } from "./cognito";

/** La identidad, colgada de la petición para que la lean los controladores. */
export type PeticionConIdentidad = Request & { identidad?: Identidad };

abstract class GuardDeCognito implements CanActivate {
	constructor(@Inject(ENTORNO) protected readonly env: Entorno) {}

	/** Cada guard concreto dice de QUÉ pool acepta tokens. */
	protected abstract cual(): Pool["nombre"];

	async canActivate(contexto: ExecutionContext): Promise<boolean> {
		const peticion = contexto.switchToHttp().getRequest<PeticionConIdentidad>();
		const token = tokenDe(peticion);
		const cual = this.cual();

		if (!token) throw new UnauthorizedException("Falta el token");

		try {
			peticion.identidad = await verificar(this.pool(cual), token);
		} catch (error) {
			/* El motivo NO sale al cliente: distinguir "firma inválida" de
			   "audiencia equivocada" le dice a quien prueba tokens por dónde
			   seguir. Al log sí va entero. */
			console.warn(`Token rechazado (${cual}):`, (error as Error).message);
			throw new UnauthorizedException("Token inválido");
		}

		return true;
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
 * UN GUARD POR POOL, y no uno con parámetro.
 *
 * Así la ruta DICE de quién es: `@UseGuards(GuardComprador)` se lee en la
 * misma línea, y no hay forma de montar una ruta de `/cuenta/*` con el guard
 * de talleres por descuido — que es exactamente lo que el reparto en tres
 * pools está para impedir.
 */
@Injectable()
export class GuardComprador extends GuardDeCognito {
	protected cual(): Pool["nombre"] {
		return "compradores";
	}
}

@Injectable()
export class GuardTaller extends GuardDeCognito {
	protected cual(): Pool["nombre"] {
		return "talleres";
	}
}

@Injectable()
export class GuardAdmin extends GuardDeCognito {
	protected cual(): Pool["nombre"] {
		return "admins";
	}
}
