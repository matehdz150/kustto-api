import { Module } from "@nestjs/common";
import { AlmacenModule } from "./almacen/almacen.module";
import { AuthModule } from "./auth/auth.module";
import { AvisosModule } from "./avisos/avisos.module";
import { CatalogoModule } from "./catalogo/catalogo.module";
import { ColasModule } from "./colas/colas.module";
import { ConfigModule } from "./config/config.module";
import { CorreoModule } from "./correo/correo.module";
import { DbModule } from "./db/db.module";
import { EnviosModule } from "./envios/envios.module";
import { PedidosModule } from "./pedidos/pedidos.module";
import { SaludModule } from "./salud/salud.module";

@Module({
	imports: [
		ConfigModule,
		DbModule,
		ColasModule,
		AuthModule,
		AlmacenModule,
		CorreoModule,
		AvisosModule,
		EnviosModule,
		SaludModule,
		CatalogoModule,
		PedidosModule,
	],
})
export class AppModule {}
