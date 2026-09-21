import { Module } from "@nestjs/common";
import { CuentaModule } from "../cuenta/cuenta.module";
import { BordadoController } from "./bordado.controller";
import { BordadoService } from "./bordado.service";
import { DigitalizadorService } from "./digitalizador.service";

@Module({
	/* Por `PerfilService`: el trabajo cuelga del comprador. */
	imports: [CuentaModule],
	controllers: [BordadoController],
	providers: [BordadoService, DigitalizadorService],
	exports: [BordadoService, DigitalizadorService],
})
export class BordadoModule {}
