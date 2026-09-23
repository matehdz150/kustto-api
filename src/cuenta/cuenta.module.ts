import { Module } from "@nestjs/common";
import { CarritoService } from "./carrito.service";
import { CuentaController } from "./cuenta.controller";
import { DisenosService } from "./disenos.service";
import { FavoritosService } from "./favoritos.service";
import { ImagenesService } from "./imagenes.service";
import { PerfilService } from "./perfil.service";
import { PlantillasDeCompraService } from "./plantillas.service";

@Module({
	controllers: [CuentaController],
	providers: [
		PerfilService,
		CarritoService,
		FavoritosService,
		DisenosService,
		ImagenesService,
		PlantillasDeCompraService,
	],
	exports: [PerfilService, CarritoService],
})
export class CuentaModule {}
