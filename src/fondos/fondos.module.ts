import { Module } from "@nestjs/common";
import { FondosController } from "./fondos.controller";
import { FondosService } from "./fondos.service";

@Module({
	controllers: [FondosController],
	providers: [FondosService],
})
export class FondosModule {}
