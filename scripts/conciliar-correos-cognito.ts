/**
 * Paso único de migración: recupera correos VERIFICADOS del pool anterior para
 * perfiles de comprador que DynamoDB guardó sin correo. No toca Cognito y no
 * forma parte de la API en ejecución.
 *
 * COGNITO_COMPRADORES_POOL_ID=... pnpm auth:conciliar-correos
 * COGNITO_COMPRADORES_POOL_ID=... pnpm auth:conciliar-correos --aplicar
 */
import { execFileSync } from "node:child_process";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as e from "../src/db/esquema";

type UsuarioCognito = {
	Attributes?: { Name: string; Value: string }[];
};

async function principal() {
	const poolId = process.env.COGNITO_COMPRADORES_POOL_ID;
	const url = process.env.DATABASE_URL;
	if (!poolId || !url) {
		throw new Error("Faltan COGNITO_COMPRADORES_POOL_ID o DATABASE_URL");
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

	const pool = new Pool({ connectionString: url, max: 1 });
	try {
		const db = drizzle(pool);
		const faltantes = await db
			.select({ id: e.compradores.id })
			.from(e.compradores)
			.where(isNull(e.compradores.correo));
		const ids = new Set(faltantes.map((p) => p.id));
		const coincidencias = new Map<string, string>();

		for (const usuario of origen.Users ?? []) {
			const atributos = new Map(
				(usuario.Attributes ?? []).map((a) => [a.Name, a.Value]),
			);
			const id = atributos.get("sub");
			const correo = atributos.get("email")?.trim().toLowerCase();
			if (
				id &&
				ids.has(id) &&
				correo &&
				atributos.get("email_verified") === "true"
			) {
				coincidencias.set(id, correo);
			}
		}

		console.log(
			`${faltantes.length} perfiles sin correo; ${coincidencias.size} coincidencias verificadas en Cognito`,
		);
		if (!process.argv.includes("--aplicar")) {
			console.log("Vista previa: usa --aplicar para escribir los correos");
			return;
		}

		let actualizados = 0;
		for (const [id, correo] of coincidencias) {
			const filas = await db
				.update(e.compradores)
				.set({ correo })
				.where(and(eq(e.compradores.id, id), isNull(e.compradores.correo)))
				.returning({ id: e.compradores.id });
			actualizados += filas.length;
		}
		console.log(`${actualizados} perfiles completados`);
	} finally {
		await pool.end();
	}
}

principal().catch((error) => {
	console.error((error as Error).message);
	process.exit(1);
});
