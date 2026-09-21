import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AlmacenModule } from "./almacen/almacen.module";
import { AuthModule } from "./auth/auth.module";
import { BordadoModule } from "./bordado/bordado.module";
import { AvisosModule } from "./avisos/avisos.module";
import { CatalogoModule } from "./catalogo/catalogo.module";
import { ColasModule } from "./colas/colas.module";
import { ConfigModule } from "./config/config.module";
import { CuentaModule } from "./cuenta/cuenta.module";
import { CorreoModule } from "./correo/correo.module";
import { DbModule } from "./db/db.module";
import { EnviosModule } from "./envios/envios.module";
import { PedidosModule } from "./pedidos/pedidos.module";
import { SaludModule } from "./salud/salud.module";
import { TallerModule } from "./taller/taller.module";
import { VivoModule } from "./vivo/vivo.module";

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
		CuentaModule,
		AdminModule,
		TallerModule,
		BordadoModule,
		VivoModule,
	],
})
export class AppModule {}
