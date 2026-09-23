import { defineConfig } from "vitest/config";

/**
 * Las pruebas son las de `src/`, no las de `dist-scripts/`.
 *
 * `dist-scripts/` lo deja cualquiera de los scripts `probar:*` y `auth:*`, que
 * compilan con `tsc` antes de correr. Dentro va una copia CommonJS de cada
 * `.spec.ts`, y vitest no puede importarla: `pnpm test` fallaba después de
 * crear un admin, con un error que no tiene nada que ver con el código.
 */
export default defineConfig({
	test: {
		include: ["src/**/*.spec.ts"],
	},
});
