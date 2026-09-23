/**
 * Aplicar las migraciones.
 *
 * NO SE USA `drizzle-kit migrate`: drizzle-kit es una devDependency y no viaja
 * en la imagen de producción. Esto usa el migrador de `drizzle-orm`, que sí
 * está, y así el contenedor puede migrarse a sí mismo al arrancar.
 *
 * Es idempotente: drizzle lleva su propia tabla de migraciones aplicadas.
 *
 * VIVE EN `src/` Y NO EN `scripts/` para que `nest build` lo compile a `dist/`:
 * la imagen de producción sólo copia `dist/` y `migraciones/`, así que un
 * script suelto fuera de `src/` no llegaría al contenedor que tiene que
 * aplicarlas.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function principal() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("Falta DATABASE_URL");

	const pool = new Pool({ connectionString: url, max: 1 });

	try {
		await migrate(drizzle(pool), { migrationsFolder: "./migraciones" });
		console.log("migraciones aplicadas");
	} finally {
		await pool.end();
	}
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
