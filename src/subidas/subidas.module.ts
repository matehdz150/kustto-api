import { Body, Controller, Module, Post } from "@nestjs/common";
import { ArteService } from "./arte.service";

/** Subir el arte al agregar al carrito. Sin sesión: ver `ArteService`. */
@Controller("publico/carrito")
export class CarritoPublicoController {
	constructor(private readonly arte: ArteService) {}

	@Post("subidas")
	firmar(@Body() cuerpo: Record<string, unknown>) {
		return this.arte.firmar(cuerpo);
	}
}

@Module({
	controllers: [CarritoPublicoController],
	providers: [ArteService],
	exports: [ArteService],
})
export class SubidasModule {}
