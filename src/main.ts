import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { ENTORNO } from "./config/config.module";
import type { Entorno } from "./config/entorno";
import { VivoGateway } from "./vivo/vivo.gateway";

async function arrancar() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	const origenes = env.ORIGENES.split(",").map((o) => o.trim());

	/**
	 * CORS con lista de orígenes, no `*`.
	 *
	 * Con la sesión en una cookie esto ya no es una precaución: con `*` y
	 * `credentials`, cualquier sitio podría leer respuestas con la sesión de
	 * quien lo visita.
	 */
	app.enableCors({ origin: origenes, credentials: true });

	/* Las cookies de sesión (`kustto_acceso_*`, `kustto_renovacion_*`). */
	app.use(cookieParser());

	/* Ver CONFIAR_EN_PROXY: decide de dónde sale `req.ip`. */
	if (env.CONFIAR_EN_PROXY) app.set("trust proxy", 1);

	/**
	 * CSRF: una escritura que viene de un origen ajeno se rechaza.
	 *
	 * CORS NO BASTA. Impide LEER la respuesta, no ENVIAR la petición: un
	 * formulario de otro sitio puede mandar un POST y el navegador le pega la
	 * cookie de sesión. `SameSite=Lax` ya frena casi todo eso; esto es la
	 * segunda capa, y la que no depende del navegador.
	 *
	 * SIN `Origin` SE DEJA PASAR a propósito: los navegadores lo mandan en
	 * toda escritura, así que no traerlo es un cliente que no es un navegador
	 * —el webhook de la paquetería, un `curl`—, y ésos no llevan la cookie de
	 * nadie.
	 */
	app.use((req: Request, res: Response, siguiente: NextFunction) => {
		const escribe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
		const origen = req.headers.origin;

		if (escribe && origen && !origenes.includes(origen)) {
			res.status(403).json({ statusCode: 403, message: "Origen no permitido" });
			return;
		}
		siguiente();
	});

	/**
	 * El canal en vivo, enganchado al MISMO servidor HTTP.
	 *
	 * Un puerto aparte serían otra regla en el balanceador, otro certificado y
	 * otro agujero que abrir. Se atiende sólo `/eventos`: cualquier otro
	 * `upgrade` se corta, para que abrir un socket contra una ruta cualquiera
	 * no deje una conexión colgada.
	 */
	const vivo = app.get(VivoGateway);

	app
		.getHttpServer()
		.on("upgrade", (peticion: any, socket: any, cabeza: any) => {
			const ruta = new URL(peticion.url ?? "", "http://interno").pathname;

			if (ruta !== "/eventos") {
				socket.destroy();
				return;
			}

			vivo.enganchar(peticion, socket, cabeza);
		});

	await app.listen(env.PORT, "0.0.0.0");
	new Logger("arranque").log(`La API escucha en el puerto ${env.PORT}`);
}

arrancar();
