import { Global, Module } from "@nestjs/common";
import { VivoGateway } from "./vivo.gateway";

@Global()
@Module({ providers: [VivoGateway], exports: [VivoGateway] })
export class VivoModule {}
