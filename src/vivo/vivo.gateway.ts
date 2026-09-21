import type { IncomingMessage } from "node:http";
import {
	Inject,
	Injectable,
	Logger,
	type OnApplicationShutdown,
	type OnModuleInit,
} from "@nestjs/common";
import IORedis from "ioredis";
import { WebSocket, WebSocketServer } from "ws";
import { verificar } from "../auth/cognito";
import { REDIS } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { JwtService } from "../cuentas/jwt.service";
import { SesionesService } from "../cuentas/sesiones.service";
import { cookieDeAcceso } from "../cuentas/tipos";

/** Cada cuánto se comprueba que la conexión sigue viva. */
const LATIDO_MS = 30_000;

type Conexion = WebSocket & { tallerId?: string; vivo?: boolean };

/**
 * El canal en vivo del panel del taller.
 *
 * AQUÍ NO SE SIRVE NINGÚN DATO. Se manda un aviso corto —"entró un pedido"— y
 * el navegador recarga su lista por la API de siempre. Mandar los datos por
 * aquí convertiría el WebSocket en una segunda API con las mismas reglas de
 * qué ve cada taller, y dos caminos con las mismas reglas es como acaban
 * divergiendo.
 *
 * EN AWS ESTO ERAN CUATRO PIEZAS: una API Gateway WebSocket, una Lambda
 * autorizadora, una Lambda de conexión y una tabla de conexiones con TTL —
 * porque nada en Lambda puede sostener un socket abierto, así que había que
 * apuntar en DynamoDB quién estaba conectado y escribirle desde fuera. Con un
 * servidor, la conexión ES el estado: se sostiene en memoria y desaparece sola
 * al cerrarse. Se van la tabla, el TTL y las dos Lambdas.
 *
 * LO QUE SÍ HACE FALTA ES REDIS. Con varias instancias de la API, la que
 * atiende el checkout casi nunca es la que tiene abierta la conexión del
 * taller; el aviso se publica en un canal y lo recoge la instancia que lo
 * tenga. Es el papel que hacía `PostToConnection`.
 */
@Injectable()
export class VivoGateway implements OnModuleInit, OnApplicationShutdown {
	private readonly log = new Logger(VivoGateway.name);
	private servidor?: WebSocketServer;
	private suscriptor?: IORedis;
	private latido?: NodeJS.Timeout;

	/** Qué conexiones tiene cada taller EN ESTA instancia. */
	private readonly porTaller = new Map<string, Set<Conexion>>();

	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(REDIS) private readonly redis: IORedis,
		private readonly jwt: JwtService,
		private readonly sesiones: SesionesService,
	) {}

	onModuleInit() {
		/**
		 * `noServer` y no un puerto propio: el socket se engancha al mismo
		 * servidor HTTP de la API en `main.ts`. Un puerto aparte serían otra
		 * regla en el balanceador, otro certificado y otro agujero que abrir.
		 */
		this.servidor = new WebSocketServer({ noServer: true });

		/**
		 * Una conexión SUELTA a Redis para escuchar.
		 *
		 * No se reutiliza la de las colas: un cliente en modo suscripción no
		 * puede ejecutar comandos normales, así que compartirla rompería BullMQ
		 * y el limitador de Skydropx en cuanto entrara el primer taller.
		 */
		this.suscriptor = new IORedis(this.env.REDIS_URL, {
			maxRetriesPerRequest: null,
		});

		/* Un patrón y no un canal por taller: suscribirse y desuscribirse en
		   cada conexión sería un viaje a Redis por pestaña abierta. */
		this.suscriptor.psubscribe("taller:*");
		this.suscriptor.on("pmessage", (_patron, canal, mensaje) => {
			this.repartir(canal.slice("taller:".length), mensaje);
		});

		/**
		 * El latido.
		 *
		 * Un cliente que se va sin avisar —el portátil se suspende, el móvil
		 * cambia de red— deja un socket que parece abierto y no lo está. Sin
		 * esto, la lista crece con fantasmas a los que escribir. Es lo que en
		 * AWS hacía el TTL del ítem de conexión.
		 */
		this.latido = setInterval(() => {
			for (const conexiones of this.porTaller.values()) {
				for (const socket of conexiones) {
					if (socket.vivo === false) {
						socket.terminate();
						continue;
					}
					socket.vivo = false;
					socket.ping();
				}
			}
		}, LATIDO_MS);
	}

	/** Lo llama `main.ts` con el `upgrade` del servidor HTTP. */
	async enganchar(peticion: IncomingMessage, socket: any, cabeza: Buffer) {
		const tallerId = await this.deQuienEs(peticion);

		if (!tallerId) {
			/* Se responde en HTTP y se corta: el `upgrade` no llegó a pasar, así
			   que no hay WebSocket al que mandarle un código de cierre. */
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}

		this.servidor!.handleUpgrade(peticion, socket, cabeza, (ws) => {
			const conexion = ws as Conexion;
			conexion.tallerId = tallerId;
			conexion.vivo = true;

			const suyas = this.porTaller.get(tallerId) ?? new Set();
			suyas.add(conexion);
			this.porTaller.set(tallerId, suyas);

			conexion.on("pong", () => {
				conexion.vivo = true;
			});

			conexion.on("close", () => {
				const lista = this.porTaller.get(tallerId);
				lista?.delete(conexion);
				if (lista?.size === 0) this.porTaller.delete(tallerId);
			});

			/* El cliente no manda nada hoy; si mandara, se ignora. Contestar algo
			   invitaría a que esto se convirtiera en una segunda API. */
			conexion.on("error", (error) => {
				this.log.warn(`Socket de ${tallerId}: ${error.message}`);
			});
		});
	}

	/**
	 * De quién es la conexión.
	 *
	 * EL TOKEN VIAJA EN LA URL porque `new WebSocket(url)` no admite cabeceras.
	 * Se verifica igual que en cualquier ruta —contra el pool de TALLERES, por
	 * emisor y audiencia— y el `sub` del token es el taller: fiarse de un id
	 * que mandara el cliente sería dejar que cualquiera escuchara los pedidos
	 * de otro.
	 */
	private async deQuienEs(peticion: IncomingMessage) {
		try {
			/* LA COOKIE PRIMERO. Con las cuentas propias la sesión viaja sola en
			   el `upgrade`, como en cualquier petición del mismo sitio, y el token
			   deja de ir en la URL —donde acaba en los logs de cualquier proxy—.
			   El `?token=` de Cognito se queda mientras dura la mudanza. */
			const cookie = leerCookie(
				peticion.headers.cookie,
				cookieDeAcceso("taller"),
			);
			if (cookie) {
				const identidad = await this.jwt.verificar("taller", cookie);
				if (await this.sesiones.bloqueada(identidad.sid)) return null;
				return identidad.sub;
			}

			const url = new URL(peticion.url ?? "", "http://interno");
			const token = url.searchParams.get("token");
			if (!token) return null;

			const identidad = await verificar(
				{
					nombre: "talleres",
					region: this.env.COGNITO_REGION,
					poolId: this.env.COGNITO_POOL_TALLERES,
					clienteId: this.env.COGNITO_CLIENTE_TALLERES,
				},
				token,
			);

			return identidad.sub;
		} catch (error) {
			/* El motivo va al registro, no al cliente: decirle a quien prueba
			   tokens cuál falló y por qué le ahorra trabajo. */
			this.log.warn(`Conexión rechazada: ${(error as Error).message}`);
			return null;
		}
	}

	private repartir(tallerId: string, mensaje: string) {
		for (const socket of this.porTaller.get(tallerId) ?? []) {
			if (socket.readyState === WebSocket.OPEN) socket.send(mensaje);
		}
	}

	async onApplicationShutdown() {
		clearInterval(this.latido);
		await this.suscriptor?.quit().catch(() => undefined);

		/* 1001 = "me voy": el cliente lo distingue de una caída y reconecta con
		   su espera creciente en vez de creer que hay un problema. */
		for (const conexiones of this.porTaller.values()) {
			for (const socket of conexiones) socket.close(1001, "Cerrando");
		}

		this.servidor?.close();
	}
}

/** Una cookie de la cabecera del `upgrade`, que no pasa por `cookie-parser`. */
function leerCookie(cabecera: string | undefined, nombre: string) {
	for (const parte of (cabecera ?? "").split(";")) {
		const [llave, ...valor] = parte.trim().split("=");
		if (llave === nombre) return decodeURIComponent(valor.join("="));
	}
	return null;
}
