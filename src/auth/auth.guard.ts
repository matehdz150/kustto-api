import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtService } from "../cuentas/jwt.service";
import { SesionesService } from "../cuentas/sesiones.service";
import { cookieDeAcceso, type TipoDeUsuario } from "../cuentas/tipos";
import type { Identidad } from "./identidad";

/** La identidad, colgada de la petición para que la lean los controladores. */
export type PeticionConIdentidad = Request & { identidad?: Identidad };

/**
 * Sólo acepta la cookie de sesión propia correspondiente al tipo de ruta.
 *
 * EL `@Injectable()` DE AQUÍ NO SOBRA aunque lo lleven las tres hijas: Nest
 * lee los tipos del constructor de ESTA clase, y TypeScript sólo los guarda en
 * una clase con decorador. Sin él, `jwt` y `sesiones` llegan `undefined` y
 * toda sesión válida sale como 401. Pasó al quitar `@Inject(ENTORNO)`, que era
 * lo que los guardaba sin que nadie lo supiera.
 */
@Injectable()
abstract class GuardDeSesion implements CanActivate {
	constructor(
		private readonly jwt: JwtService,
		private readonly sesiones: SesionesService,
	) {}

	/** Cada guard concreto dice de QUÉ tipo acepta sesiones. */
	protected abstract tipo(): TipoDeUsuario;

	async canActivate(contexto: ExecutionContext): Promise<boolean> {
		const peticion = contexto.switchToHttp().getRequest<PeticionConIdentidad>();
		const tipo = this.tipo();

		const cookie = peticion.cookies?.[cookieDeAcceso(tipo)];
		if (!cookie) throw new UnauthorizedException("No has entrado");
		peticion.identidad = await this.dePropia(tipo, cookie);
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
