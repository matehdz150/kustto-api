import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AlmacenModule } from "./almacen/almacen.module";
import { AuthModule } from "./auth/auth.module";
import { AvisosModule } from "./avisos/avisos.module";
import { BordadoModule } from "./bordado/bordado.module";
import { CatalogoModule } from "./catalogo/catalogo.module";
import { ColasModule } from "./colas/colas.module";
import { ConfigModule } from "./config/config.module";
import { CorreoModule } from "./correo/correo.module";
import { CuentaModule } from "./cuenta/cuenta.module";
import { CuentasModule } from "./cuentas/cuentas.module";
import { DbModule } from "./db/db.module";
import { EnviosModule } from "./envios/envios.module";
import { EventosModule } from "./eventos/eventos.module";
import { FondosModule } from "./fondos/fondos.module";
import { PaquetesModule } from "./paquetes/paquetes.module";
import { PedidosModule } from "./pedidos/pedidos.module";
import { SaludModule } from "./salud/salud.module";
import { SubidasModule } from "./subidas/subidas.module";
import { TallerModule } from "./taller/taller.module";
import { VivoModule } from "./vivo/vivo.module";

@Module({
	imports: [
		ConfigModule,
		DbModule,
		ColasModule,
		CuentasModule,
		AuthModule,
		AlmacenModule,
		CorreoModule,
		AvisosModule,
		EnviosModule,
		SaludModule,
		CatalogoModule,
		PaquetesModule,
		PedidosModule,
		CuentaModule,
		SubidasModule,
		EventosModule,
		AdminModule,
		TallerModule,
		BordadoModule,
		FondosModule,
		VivoModule,
	],
})
export class AppModule {}
