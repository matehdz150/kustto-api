import { Global, Module } from "@nestjs/common";
import { type Entorno, leerEntorno } from "./entorno";

export const ENTORNO = Symbol("ENTORNO");

/**
 * Global a propósito: el entorno lo pide medio sistema y declararlo en cada
 * módulo sería ruido sin ninguna ventaja — no hay dos entornos distintos.
 */
@Global()
@Module({
	providers: [{ provide: ENTORNO, useFactory: (): Entorno => leerEntorno() }],
	exports: [ENTORNO],
})
export class ConfigModule {}
