import { Module } from "@nestjs/common";
import { AdminController, ArchivosController } from "./admin.controller";
import { CategoriasService } from "./categorias.service";
import { PaquetesService } from "./paquetes.service";
import { PlantillasService } from "./plantillas.service";
import { RevisionService } from "./revision.service";
import { SubidasService } from "./subidas.service";
import { TalleresService } from "./talleres.service";

@Module({
	controllers: [AdminController, ArchivosController],
	providers: [
		PlantillasService,
		CategoriasService,
		RevisionService,
		TalleresService,
		SubidasService,
		PaquetesService,
	],
	exports: [PaquetesService],
})
export class AdminModule {}
