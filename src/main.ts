import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ENTORNO } from "./config/config.module";
import type { Entorno } from "./config/entorno";

async function arrancar() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
		/**
		 * Guarda los BYTES que llegaron, además del cuerpo ya parseado.
		 *
		 * Lo necesita el webhook de la paquetería: su firma HMAC es sobre el
		 * cuerpo crudo, y `JSON.stringify` de lo parseado no da los mismos bytes
		 * —cambia el orden de las claves, los espacios y el escapado—, así que
		 * la firma no calzaría nunca y el webhook se rechazaría siempre.
		 */
		rawBody: true,
	});
	const env = app.get<Entorno>(ENTORNO);

	/**
	 * Sin esto, `onApplicationShutdown` no corre y ni el pool de Postgres ni la
	 * conexión de Redis se cierran: Docker manda SIGTERM, nadie lo escucha y a
	 * los 10 s llega el SIGKILL con peticiones a medias.
	 */
	app.enableShutdownHooks();

	app.useGlobalPipes(
		new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
	);

	/**
	 * CORS con lista de orígenes, no `*`.
	 *
	 * Las rutas con sesión mandan el token por cabecera, así que `*` no las
	 * rompería — pero abrirlo entero invita a que mañana alguien ponga una
	 * cookie y no se entere de que acaba de abrir la puerta.
	 */
	app.enableCors({
		origin: env.ORIGENES.split(",").map((o) => o.trim()),
		credentials: true,
	});

	await app.listen(env.PORT, "0.0.0.0");
	new Logger("arranque").log(`La API escucha en el puerto ${env.PORT}`);
}

arrancar();
