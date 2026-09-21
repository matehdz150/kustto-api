import { Global, Module } from "@nestjs/common";
import { CuentasController } from "./cuentas.controller";
import { CuentasService } from "./cuentas.service";
import { JwtService } from "./jwt.service";
import { SesionesService } from "./sesiones.service";

/**
 * Las cuentas propias, que reemplazan a Cognito.
 *
 * GLOBAL porque los guards —que viven en `auth/` y se usan en todos los
 * módulos— necesitan `JwtService` y `SesionesService` para leer la cookie.
 */
@Global()
@Module({
	controllers: [CuentasController],
	providers: [JwtService, SesionesService, CuentasService],
	exports: [JwtService, SesionesService, CuentasService],
})
export class CuentasModule {}
