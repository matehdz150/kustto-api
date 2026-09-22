import { Module } from "@nestjs/common";
import {
	PaquetesAdminController,
	PaquetesPublicosController,
	PaquetesTallerController,
} from "./paquetes.controller";
import { PaquetesService } from "./paquetes.service";

@Module({
	controllers: [
		PaquetesAdminController,
		PaquetesTallerController,
		PaquetesPublicosController,
	],
	providers: [PaquetesService],
})
export class PaquetesModule {}
