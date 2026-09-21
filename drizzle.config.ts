import { defineConfig } from "drizzle-kit";

/**
 * Las migraciones se GENERAN desde el esquema y se aplican con
 * `scripts/migrar.ts`, no con `drizzle-kit migrate`: al arrancar el contenedor
 * de la API hace falta aplicarlas sin tener drizzle-kit (que es devDependency)
 * dentro de la imagen de producción.
 */
export default defineConfig({
	schema: "./src/db/esquema/index.ts",
	out: "./migraciones",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgres://kustto:kustto@localhost:5432/kustto",
	},
	casing: "snake_case",
});
