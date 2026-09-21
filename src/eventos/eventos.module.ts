import { Module } from "@nestjs/common";
import { CuentaModule } from "../cuenta/cuenta.module";
import { SubidasModule } from "../subidas/subidas.module";
import { EventosController, EventosPublicoController } from "./eventos.controller";
import { EventosPublicoService } from "./eventos-publico.service";
import { EventosService } from "./eventos.service";

@Module({
	imports: [CuentaModule, SubidasModule],
	controllers: [EventosController, EventosPublicoController],
	providers: [EventosService, EventosPublicoService],
})
export class EventosModule {}
