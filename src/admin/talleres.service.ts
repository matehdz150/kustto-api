import { randomUUID } from "node:crypto";
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
} from "@nestjs/common";
import { asc } from "drizzle-orm";
import { RestablecerService } from "../cuentas/restablecer.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Injectable()
export class TalleresService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly restablecimiento: RestablecerService,
	) {}

	async listar() {
		const filas = await this.db
			.select()
			.from(e.talleres)
			.orderBy(asc(e.talleres.nombre));
		return filas.map(aSalida);
	}

	/** Crea perfil y cuenta local; el correo de invitación crea la contraseña. */
	async crear(cuerpo: Record<string, unknown>) {
		const correo = String(cuerpo.email ?? "")
			.trim()
			.toLowerCase();
		const nombre = String(cuerpo.name ?? "").trim();

		if (!CORREO.test(correo)) throw new BadRequestException("Correo inválido");
		if (!nombre) throw new BadRequestException("Falta el nombre del taller");

		const id = randomUUID();
		let resultado: {
			usuario: typeof e.usuarios.$inferSelect;
			taller: typeof e.talleres.$inferSelect;
		};
		try {
			resultado = await this.db.transaction(async (tx) => {
				const [u] = await tx
					.insert(e.usuarios)
					.values({
						id,
						tipo: "taller",
						correo,
					})
					.returning();
				const [t] = await tx
					.insert(e.talleres)
					.values({
						id,
						correo,
						nombre,
						nombrePublico: nombre,
						slug: await this.slugLibre(nombre),
					})
					.returning();
				return { usuario: u, taller: t };
			});
		} catch (error) {
			if ((error as { code?: string })?.code === "23505") {
				throw new ConflictException(`Ya hay un taller con el correo ${correo}`);
			}
			throw error;
		}

		const invitacionEnviada = await this.restablecimiento
			.invitar(resultado.usuario)
			.then(() => true)
			.catch(() => false);
		return { ...aSalida(resultado.taller), invitacionEnviada };
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
