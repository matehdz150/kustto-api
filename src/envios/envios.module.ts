import { Global, Module } from "@nestjs/common";
import { EnviosService } from "./envios.service";

@Global()
@Module({ providers: [EnviosService], exports: [EnviosService] })
export class EnviosModule {}
