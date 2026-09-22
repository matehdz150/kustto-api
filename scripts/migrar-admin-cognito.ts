/**
 * Importa una sola vez los admins del pool anterior, sin contraseñas, y les
 * manda un enlace para crear la suya. Cognito no participa en el runtime.
 */
import { execFileSync } from "node:child_process";
import { NestFactory } from "@nestjs/core";
import { and, eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { RestablecerService } from "../src/cuentas/restablecer.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

type UsuarioCognito = {
	Enabled?: boolean;
	Attributes?: { Name: string; Value: string }[];
};

async function principal() {
	const poolId = process.env.COGNITO_ADMIN_POOL_ID;
	const aplicar = process.argv.includes("--aplicar");
	const reenviar = process.argv.includes("--reenviar");
	if (!poolId) throw new Error("Falta COGNITO_ADMIN_POOL_ID");
	if (aplicar && !process.env.SMTP_URL) {
		throw new Error("Configura SMTP_URL antes de invitar administradores");
	}

	const origen = JSON.parse(
		execFileSync(
			"aws",
			[
				"cognito-idp",
				"list-users",
				"--user-pool-id",
				poolId,
				"--region",
				process.env.AWS_REGION ?? "us-east-1",
				"--output",
				"json",
			],
			{ encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
		),
	) as { Users?: UsuarioCognito[] };

	const administradores = (origen.Users ?? [])
		.filter((u) => u.Enabled !== false)
		.map((u) => {
			const atributos = new Map(
				(u.Attributes ?? []).map((a) => [a.Name, a.Value]),
			);
			return {
				id: atributos.get("sub"),
				correo: atributos.get("email")?.trim().toLowerCase(),
				verificado: atributos.get("email_verified") === "true",
			};
		})
		.filter((u): u is { id: string; correo: string; verificado: true } =>
			Boolean(u.id && u.correo && u.verificado),
		);

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error", "warn"],
	});
	try {
		const db = app.get<Db>(DB);
		const restablecer = app.get(RestablecerService);
		let pendientes = 0;
		let invitadas = 0;
		let reenviadas = 0;
		for (const admin of administradores) {
			const [existente] = await db
				.select()
				.from(e.usuarios)
				.where(
					and(
						eq(e.usuarios.tipo, "admin"),
						eq(e.usuarios.correo, admin.correo),
					),
				)
				.limit(1);
			if (existente) {
				if (
					aplicar &&
					reenviar &&
					!existente.contrasenaHash &&
					!existente.desactivadoEn
				) {
					await restablecer.invitar(existente);
					reenviadas++;
				}
				continue;
			}
			pendientes++;
			if (!aplicar) continue;

			const [usuario] = await db
				.insert(e.usuarios)
				.values({ id: admin.id, tipo: "admin", correo: admin.correo })
				.returning();
			await restablecer.invitar(usuario);
			invitadas++;
		}
		console.log(
			aplicar
				? `${invitadas} administradores creados; ${reenviadas} invitaciones reenviadas`
				: `${pendientes} administradores pendientes; usa --aplicar para invitarlos`,
		);
	} finally {
		await app.close();
	}
}

principal().catch((error) => {
	console.error((error as Error).message);
	process.exit(1);
});
