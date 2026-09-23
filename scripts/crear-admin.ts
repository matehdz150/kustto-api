/**
 * Crea la primera cuenta local de backoffice.
 *
 * ADMIN_CORREO=... ADMIN_CONTRASENA=... pnpm auth:crear-admin
 */
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { CuentasService } from "../src/cuentas/cuentas.service";

async function principal() {
	const correo = process.env.ADMIN_CORREO?.trim().toLowerCase() ?? "";
	const contrasena = process.env.ADMIN_CONTRASENA ?? "";
	if (!correo || !contrasena) {
		throw new Error("Define ADMIN_CORREO y ADMIN_CONTRASENA");
	}

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error", "warn"],
	});
	try {
		await app.get(CuentasService).crear("admin", {
			correo,
			contrasena,
			verificado: true,
		});
		console.log(`Administrador creado: ${correo}`);
	} finally {
		await app.close();
	}
}

principal().catch((error) => {
	console.error((error as Error).message);
	process.exit(1);
});
