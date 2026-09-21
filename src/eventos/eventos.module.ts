import { Module } from "@nestjs/common";
import { CuentaModule } from "../cuenta/cuenta.module";
import { SubidasModule } from "../subidas/subidas.module";
import {
	EventosController,
	EventosPublicoController,
} from "./eventos.controller";
import { EventosService } from "./eventos.service";
import { EventosPublicoService } from "./eventos-publico.service";

@Module({
	imports: [CuentaModule, SubidasModule],
	controllers: [EventosController, EventosPublicoController],
	providers: [EventosService, EventosPublicoService],
})
export class EventosModule {}
