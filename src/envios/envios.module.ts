import { Global, Module } from "@nestjs/common";
import { EnviosPublicoController, GuiasController } from "./envios.controller";
import { EnviosService } from "./envios.service";
import { GuiasService } from "./guias.service";
import { RastreoService } from "./rastreo.service";
import { SkydropxClient } from "./skydropx";

/**
 * Global porque el checkout necesita `envioDelPedido`, y meter todo el módulo
 * de envíos dentro del de pedidos ataría dos cosas que se despliegan y se
 * prueban aparte.
 */
@Global()
@Module({
	controllers: [EnviosPublicoController, GuiasController],
	providers: [SkydropxClient, EnviosService, GuiasService, RastreoService],
	exports: [EnviosService, SkydropxClient],
})
export class EnviosModule {}
