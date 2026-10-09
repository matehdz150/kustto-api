import { Module } from "@nestjs/common";
import { AdminController, ArchivosController } from "./admin.controller";
import { CategoriasService } from "./categorias.service";
import { Modelos3dService } from "./modelos3d.service";
import { PlantillasService } from "./plantillas.service";
import { RevisionService } from "./revision.service";
import { SubidasService } from "./subidas.service";
import { TalleresService } from "./talleres.service";

@Module({
	controllers: [AdminController, ArchivosController],
	providers: [
		PlantillasService,
		Modelos3dService,
		CategoriasService,
		RevisionService,
		TalleresService,
		SubidasService,
	],
})
export class AdminModule {}
