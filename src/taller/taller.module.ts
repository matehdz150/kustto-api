import { Module } from "@nestjs/common";
import { TallerService } from "./perfil.service";
import { ProductosTallerService } from "./productos.service";
import { TallerController } from "./taller.controller";

@Module({
	controllers: [TallerController],
	providers: [TallerService, ProductosTallerService],
	exports: [ProductosTallerService],
})
export class TallerModule {}
