import { Global, Module } from "@nestjs/common";
import { CuentasController } from "./cuentas.controller";
import { CuentasService } from "./cuentas.service";
import { GoogleController } from "./google.controller";
import { GoogleService } from "./google.service";
import { JwtService } from "./jwt.service";
import { RegistroService } from "./registro.service";
import { RestablecerService } from "./restablecer.service";
import { SesionesService } from "./sesiones.service";
import { TopesService } from "./topes.service";

/**
 * Las cuentas propias, que reemplazan a Cognito.
 *
 * GLOBAL porque los guards —que viven en `auth/` y se usan en todos los
 * módulos— necesitan `JwtService` y `SesionesService` para leer la cookie.
 */
@Global()
@Module({
	controllers: [CuentasController, GoogleController],
	providers: [
		JwtService,
		SesionesService,
		TopesService,
		CuentasService,
		RegistroService,
		RestablecerService,
		GoogleService,
	],
	exports: [
		JwtService,
		SesionesService,
		TopesService,
		CuentasService,
		RestablecerService,
	],
})
export class CuentasModule {}
