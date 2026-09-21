import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Worker } from "bullmq";
import type IORedis from "ioredis";
import { AppModule } from "../app.module";
import { COLAS } from "../colas/colas";
import { REDIS } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { type Correo, CorreoService } from "../correo/correo.service";

/**
 * Los workers, en su propio proceso.
 *
 * MISMA IMAGEN QUE LA API, otro comando. Comparten el esquema, los servicios y
 * la configuración; dos imágenes obligarían a construir dos veces lo mismo y a
 * que se desincronicen.
 *
 * PERO NO EL MISMO PROCESO: una digitalización de bordado que se come la CPU
 * durante 75 s haría esperar a las peticiones de la tienda si compartieran
 * bucle de eventos. Separarlos también deja escalarlos aparte — hay días de
 * muchos pedidos y pocas visitas.
 *
 * Se arranca un contexto de Nest SIN servidor HTTP (`createApplicationContext`)
 * para poder pedirle los servicios ya inyectados en vez de construirlos a mano.
 */
async function arrancar() {
	const log = new Logger("workers");
	const app = await NestFactory.createApplicationContext(AppModule, {
		bufferLogs: true,
	});
	app.enableShutdownHooks();

	const conexion = app.get<IORedis>(REDIS);
	const env = app.get<Entorno>(ENTORNO);
	const correo = app.get(CorreoService);

	const workers = [
		new Worker<Correo>(
			COLAS.correo,
			async (trabajo) => correo.enviar(trabajo.data),
			{ connection: conexion, concurrency: 5 },
		),
	];

	for (const worker of workers) {
		worker.on("failed", (trabajo, error) => {
			log.error(`${worker.name} #${trabajo?.id} falló: ${error.message}`);
		});
	}

	log.log(
		`Workers en pie: ${workers.map((w) => w.name).join(", ")}` +
			(env.BORDADO_ACTIVO ? "" : " (bordado apagado)"),
	);

	/**
	 * Cerrar ordenado: `worker.close()` espera a que el trabajo EN CURSO
	 * termine antes de soltar la conexión. Sin esto, un SIGTERM a mitad de un
	 * envío de correo deja el trabajo en "activo" hasta que caduca el bloqueo,
	 * y BullMQ lo reintenta — el mismo correo sale dos veces.
	 */
	const cerrar = async () => {
		log.log("Cerrando workers…");
		await Promise.all(workers.map((w) => w.close()));
		await app.close();
		process.exit(0);
	};

	process.on("SIGTERM", cerrar);
	process.on("SIGINT", cerrar);
}

arrancar();
