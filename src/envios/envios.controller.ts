import {
	Body,
	Controller,
	Get,
	Headers,
	Param,
	ParseUUIDPipe,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { GuardTaller, type PeticionConIdentidad } from "../auth/auth.guard";
import { EnviosService } from "./envios.service";
import { GuiasService } from "./guias.service";
import { RastreoService } from "./rastreo.service";

/**
 * Cotizar es PÚBLICO porque pasa ANTES de pagar y antes de que exista un
 * pedido. No acepta pesos ni medidas del cuerpo: sólo qué se pide y a dónde, y
 * el paquete lo arma el servidor con los datos del producto.
 */
@Controller("publico/envios")
export class EnviosPublicoController {
	constructor(
		private readonly envios: EnviosService,
		private readonly rastreo: RastreoService,
	) {}

	@Post("cotizar")
	cotizar(@Body() cuerpo: Record<string, unknown>) {
		return this.envios.crear(cuerpo);
	}

	/** La del carrito: una cotización por taller. */
	@Post("cotizar-compra")
	cotizarCompra(@Body() cuerpo: Record<string, unknown>) {
		return this.envios.crearPorTaller(cuerpo);
	}

	@Get("cotizacion/:id")
	consultar(@Param("id", ParseUUIDPipe) id: string) {
		return this.envios.consultar(id);
	}

	/**
	 * El rastreo que manda la paquetería.
	 *
	 * ABIERTA PORQUE LA LLAMA UN TERCERO, pero NO sin autenticar: verifica la
	 * firma HMAC del CUERPO CRUDO. Por eso se lee `req.rawBody` y no el cuerpo
	 * ya parseado — `JSON.stringify` de lo parseado no da los mismos bytes que
	 * llegaron, y la firma no calzaría nunca.
	 */
	@Post("rastreo")
	rastrear(
		@Req() peticion: Request & { rawBody?: Buffer },
		@Body() cuerpo: Record<string, unknown>,
		@Headers("authorization") autorizacion?: string,
	) {
		return this.rastreo.recibir(
			cuerpo,
			peticion.rawBody?.toString("utf8"),
			autorizacion,
		);
	}
}

/** Las guías las compra el taller, con el peso real ya medido. */
@Controller("proveedores/pedidos")
@UseGuards(GuardTaller)
export class GuiasController {
	constructor(private readonly guias: GuiasService) {}

	@Post(":id/guia")
	comprar(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() cuerpo: Record<string, unknown>,
	) {
		return this.guias.comprar(peticion.identidad!.sub, id, cuerpo);
	}

	@Get(":id/guia")
	refrescar(
		@Req() peticion: PeticionConIdentidad,
		@Param("id", ParseUUIDPipe) id: string,
	) {
		return this.guias.refrescar(peticion.identidad!.sub, id);
	}
}
