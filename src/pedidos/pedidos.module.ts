import { Module } from "@nestjs/common";
import { PedidosCompradorService } from "./pedidos-comprador.service";
import { PedidosTallerService } from "./pedidos-taller.service";
import {
	PedidosCompradorController,
	PedidosPublicoController,
	PedidosTallerController,
} from "./pedidos.controller";
import { PedidosService } from "./pedidos.service";

@Module({
	controllers: [
		PedidosPublicoController,
		PedidosTallerController,
		PedidosCompradorController,
	],
	providers: [PedidosService, PedidosTallerService, PedidosCompradorService],
	exports: [PedidosService],
})
export class PedidosModule {}
