import { Module } from "@nestjs/common";
import {
	PedidosCompradorController,
	PedidosPublicoController,
	PedidosTallerController,
} from "./pedidos.controller";
import { PedidosService } from "./pedidos.service";
import { PedidosCompradorService } from "./pedidos-comprador.service";
import { PedidosTallerService } from "./pedidos-taller.service";
import { RastreoService } from "./rastreo.service";

@Module({
	controllers: [
		PedidosPublicoController,
		PedidosTallerController,
		PedidosCompradorController,
	],
	providers: [
		PedidosService,
		PedidosTallerService,
		PedidosCompradorService,
		RastreoService,
	],
	exports: [PedidosService],
})
export class PedidosModule {}
