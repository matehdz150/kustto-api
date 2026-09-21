import { randomBytes } from "node:crypto";
import {
	AdminCreateUserCommand,
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
} from "@nestjs/common";
import { asc } from "drizzle-orm";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Los talleres, vistos por el admin.
 *
 * LOS CAMPOS QUE SALEN SON LISTA BLANCA y no "todo menos las llaves": los
 * proveedores sembrados antes de Cognito todavía traían `passwordHash`, y
 * quitar sólo las llaves lo dejaba viajar hasta el navegador. Con lista
 * blanca, un campo sensible que aparezca mañana tampoco se escapa.
 */
@Injectable()
export class TalleresService {
	private readonly cognito: CognitoIdentityProviderClient;

	constructor(
		@Inject(DB) private readonly db: Db,
		@Inject(ENTORNO) private readonly env: Entorno,
	) {
		this.cognito = new CognitoIdentityProviderClient({
			region: env.COGNITO_REGION,
		});
	}

	async listar() {
		const filas = await this.db
			.select()
			.from(e.talleres)
			.orderBy(asc(e.talleres.nombre));

		return filas.map(aSalida);
	}

	/**
	 * Alta de taller.
	 *
	 * SON DOS SISTEMAS Y EL ORDEN IMPORTA:
	 *
	 *   1. Cognito crea el usuario y devuelve su `sub`.
	 *   2. Ese `sub` ES el id del taller en nuestra base.
	 *
	 * Usar el mismo identificador en los dos lados evita una tabla de
	 * equivalencias y, sobre todo, evita el fallo clásico: el token dice una
	 * cosa y la base otra. Cuando el taller llegue con su JWT, el `sub` apunta
	 * directo a su fila.
	 *
	 * LA CONTRASEÑA NO SE GUARDA. La administra Cognito, que además obliga a
	 * cambiarla en el primer ingreso; la temporal se devuelve UNA vez para que
	 * el admin se la pase, y no queda en ninguna parte.
	 *
	 * SI LA BASE FALLA, SE DESHACE EL USUARIO DE COGNITO. Sin esto queda un
	 * huérfano y reintentar el alta choca con "ya existe" sin que haya taller
	 * ninguno. En las Lambdas esto se resolvía cambiándole la contraseña al
	 * huérfano, que lo dejaba igualmente colgado; borrarlo es lo que de verdad
	 * permite reintentar.
	 */
	async crear(cuerpo: Record<string, unknown>) {
		if (!this.env.COGNITO_POOL_TALLERES) {
			throw new BadRequestException(
				"Falta el pool de talleres: no se puede dar de alta sin Cognito",
			);
		}

		const correo = String(cuerpo.email ?? "")
			.trim()
			.toLowerCase();
		const nombre = String(cuerpo.name ?? "").trim();

		if (!CORREO.test(correo)) throw new BadRequestException("Correo inválido");
		if (!nombre) throw new BadRequestException("Falta el nombre del taller");

		const temporal = contrasenaTemporal();

		const creado = await this.cognito
			.send(
				new AdminCreateUserCommand({
					UserPoolId: this.env.COGNITO_POOL_TALLERES,
					Username: correo,
					TemporaryPassword: temporal,
					/* Kustto le manda las credenciales por su cuenta: el correo
					   automático de Cognito no dice de qué es ni a dónde entrar. */
					MessageAction: "SUPPRESS",
					UserAttributes: [
						{ Name: "email", Value: correo },
						{ Name: "email_verified", Value: "true" },
					],
				}),
			)
			.catch((error) => {
				if ((error as { name?: string })?.name === "UsernameExistsException") {
					throw new ConflictException(
						`Ya hay un taller con el correo ${correo}`,
					);
				}
				throw error;
			});

		const sub = creado.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
		if (!sub) throw new Error("Cognito no devolvió el `sub` del usuario");

		try {
			const [fila] = await this.db
				.insert(e.talleres)
				.values({
					id: sub,
					correo,
					nombre,
					nombrePublico: nombre,
					slug: await this.slugLibre(nombre),
				})
				.returning();

			return {
				...aSalida(fila),
				/* Se devuelve UNA vez, para que el admin se la pase al taller. No
				   queda guardada en ningún lado. */
				contrasenaTemporal: temporal,
			};
		} catch (error) {
			await this.cognito
				.send(
					new AdminDeleteUserCommand({
						UserPoolId: this.env.COGNITO_POOL_TALLERES,
						Username: correo,
					}),
				)
				.catch(() => undefined);

			/* El correo es único por índice; si choca, el mensaje tiene que
			   decirlo en castellano y no salir como un error de Postgres. */
			if ((error as { code?: string })?.code === "23505") {
				throw new ConflictException(`Ya hay un taller con el correo ${correo}`);
			}
			throw error;
		}
	}

	private async slugLibre(nombre: string) {
		const base =
			nombre
				.normalize("NFD")
				.replace(/[̀-ͯ]/g, "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") || "taller";

		const usados = new Set(
			(await this.db.select({ slug: e.talleres.slug }).from(e.talleres)).map(
				(t) => t.slug,
			),
		);

		let slug = base;
		for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
		return slug;
	}
}

/** Cumple la política del pool: 10+, minúscula y número. */
function contrasenaTemporal() {
	return `Kt${randomBytes(9).toString("base64url")}7a`;
}

function aSalida(fila: typeof e.talleres.$inferSelect) {
	return {
		id: fila.id,
		email: fila.correo,
		name: fila.nombre,
		slug: fila.slug,
		displayName: fila.nombrePublico,
		bio: fila.bio,
		avatarUrl: fila.avatarUrl,
		bannerUrl: fila.bannerUrl,
		createdAt: fila.creadoEn.toISOString(),
	};
}
