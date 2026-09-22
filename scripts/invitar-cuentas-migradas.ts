/**
 * Crea cuentas sin contraseña para perfiles migrados y les manda el enlace
 * para definirla. Es idempotente: sólo invita los que aún no están en usuarios.
 */
import { NestFactory } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { RestablecerService } from "../src/cuentas/restablecer.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

async function principal() {
	const reenviar = process.argv.includes("--reenviar");
	if (!process.env.SMTP_URL) {
		throw new Error(
			"Configura SMTP_URL antes de invitar: sin correo nadie recibiría su enlace",
		);
	}
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error", "warn"],
	});
	const db = app.get<Db>(DB);
	const restablecer = app.get(RestablecerService);
	let creadas = 0;
	let reenviadas = 0;

	try {
		const perfiles = [
			...(
				await db
					.select({ id: e.talleres.id, correo: e.talleres.correo })
					.from(e.talleres)
			).map((p) => ({ ...p, tipo: "taller" as const })),
			...(
				await db
					.select({ id: e.compradores.id, correo: e.compradores.correo })
					.from(e.compradores)
			)
				.filter((p): p is { id: string; correo: string } => Boolean(p.correo))
				.map((p) => ({ ...p, tipo: "comprador" as const })),
		];

		for (const perfil of perfiles) {
			const [existente] = await db
				.select()
				.from(e.usuarios)
				.where(eq(e.usuarios.id, perfil.id))
				.limit(1);
			if (existente) {
				if (reenviar && !existente.contrasenaHash && !existente.desactivadoEn) {
					await restablecer.invitar(existente);
					reenviadas++;
				}
				continue;
			}

			const [usuario] = await db
				.insert(e.usuarios)
				.values({
					id: perfil.id,
					tipo: perfil.tipo,
					correo: perfil.correo.toLowerCase(),
				})
				.returning();
			await restablecer.invitar(usuario);
			creadas++;
		}
		console.log(
			`${creadas} cuentas creadas; ${reenviadas} invitaciones reenviadas`,
		);
	} finally {
		await app.close();
	}
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
