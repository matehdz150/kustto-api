import { Inject, Injectable, Logger } from "@nestjs/common";
import type IORedis from "ioredis";
import { REDIS } from "../colas/colas.module";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";

export type Direccion = {
	/** Código postal. Es lo único que de verdad decide el precio. */
	cp: string;
	estado: string;
	ciudad: string;
	/** La colonia. Skydropx la EXIGE: sin ella rechaza, no la adivina. */
	colonia: string;
};

export type Contacto = {
	nombre: string;
	telefono: string;
	email: string;
	calle: string;
	numero: string;
	referencias?: string | null;
};

export type Paquete = {
	/** Centímetros. */
	largo: number;
	ancho: number;
	alto: number;
	/** Kilos. */
	peso: number;
};

export type Tarifa = {
	id: string;
	paqueteria: string;
	servicio: string;
	/** Pesos mexicanos. */
	precio: number;
	dias: number | null;
};

export type Guia = {
	envioId: string;
	rastreo: string | null;
	paqueteria: string | null;
	etiquetaUrl: string | null;
	rastreoUrl: string | null;
	/** Lo que Skydropx nos cobró de verdad. Manda sobre la tarifa cotizada. */
	costo: number | null;
	/**
	 * En qué acabó el envío del lado de la paquetería.
	 *
	 * HACE FALTA PORQUE UN ENVÍO PUEDE MORIR, y sin esto no se distingue de uno
	 * que va lento: los dos se ven como "sin etiqueta". Pasó de verdad — dos
	 * envíos quedaron en `error` con `CREDENTIAL_SERVICE_PROVIDER_NOT_FOUND`
	 * (la cuenta no tenía dada de alta esa paquetería), el cobro se reembolsó,
	 * y el panel se quedó diciendo "la paquetería está tardando" para siempre.
	 */
	estado: string | null;
	/** El motivo, cuando `estado` es `error`. Es lo único accionable. */
	error: string | null;
};

/**
 * Skydropx está saturado o nos pasamos de su límite.
 *
 * SE DISTINGUE DEL RESTO A PROPÓSITO: no es un fallo nuestro ni del dato que
 * mandaron, es "vuelve a intentar". Devolverlo como 500 hace que el navegador
 * se rinda y que en el log parezca un bug donde sólo había prisa.
 */
export class DemasiadasPeticiones extends Error {}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * El cliente de Skydropx: cotizar envíos y comprar guías.
 *
 * A mano y sin SDK. Son cuatro llamadas HTTP.
 *
 * COTIZAR ES ASÍNCRONO, Y ESO MANDA EN EL DISEÑO. Crear una cotización NO
 * devuelve precios: devuelve un id y una lista de paqueterías en `pending`.
 * Los precios aparecen después, consultando esa cotización — tarda unos cinco
 * segundos y las tarifas van llegando de a poco. Por eso son dos llamadas y
 * por eso el checkout consulta desde el navegador en vez de tener al servidor
 * esperando.
 */
@Injectable()
export class SkydropxClient {
	private readonly log = new Logger(SkydropxClient.name);
	private readonly host: string;

	/**
	 * El token, en memoria del proceso.
	 *
	 * Caduca a las 2 horas y SE RENUEVA UN MINUTO ANTES, no al caducar: si se
	 * apura hasta el final, una petición lenta puede salir con el token ya
	 * muerto.
	 */
	private token: { valor: string; expira: number } | null = null;
	/** Compartir la promesa evita que cinco llamadas pidan cinco tokens. */
	private pidiendo: Promise<string> | null = null;

	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(REDIS) private readonly redis: IORedis,
	) {
		this.host = env.SKYDROPX_HOST;
	}

	get configurado() {
		return Boolean(this.env.SKYDROPX_CLIENT_ID && this.env.SKYDROPX_CLIENT_SECRET);
	}

	/**
	 * Espera su turno antes de llamar a Skydropx.
	 *
	 * EL LÍMITE ES DE 2 PETICIONES POR SEGUNDO y se mide por cuenta, o sea
	 * entre todo lo nuestro a la vez. Ya tumbó el checkout una vez: siete clics
	 * en "+1".
	 *
	 * EN LAS LAMBDAS ESTO NO SE PODÍA HACER. Cada invocación vivía en su propio
	 * contenedor, así que contar en memoria no servía de nada y lo único que
	 * quedaba era reintentar tras el 429 y espaciar a mano 600 ms entre
	 * cotizaciones. Con un Redis compartido sí se puede contar de verdad: esta
	 * es una ventana deslizante por segundo, común a todas las instancias de la
	 * API y a todos los workers.
	 *
	 * Se espera en vez de rechazar: quien llama está en mitad de un checkout y
	 * un cuarto de segundo de espera es mejor que un "inténtalo otra vez".
	 */
	private async turno() {
		const limite = this.env.SKYDROPX_POR_SEGUNDO;

		for (let intento = 0; intento < 40; intento++) {
			const ventana = Math.floor(Date.now() / 1000);
			const llave = `skydropx:rps:${ventana}`;

			const cuantas = await this.redis.incr(llave);
			/* El TTL se pone sólo la primera vez de la ventana: sin esto, cada
			   llamada lo empujaría y la llave no caducaría nunca. */
			if (cuantas === 1) await this.redis.expire(llave, 2);

			if (cuantas <= limite) return;

			/* Hasta el borde de la ventana siguiente, no un tiempo fijo: si
			   esperáramos un segundo entero desde ahora, todos los que están
			   haciendo cola despertarían a la vez. */
			await esperar(1000 - (Date.now() % 1000) + 10);
		}

		throw new DemasiadasPeticiones("Skydropx está saturado ahora mismo");
	}

	private async autenticar(): Promise<string> {
		if (this.token && Date.now() < this.token.expira) return this.token.valor;

		this.pidiendo ??= (async () => {
			try {
				if (!this.configurado) {
					throw new Error("Falta SKYDROPX_CLIENT_ID o SKYDROPX_CLIENT_SECRET");
				}

				const res = await fetch(`${this.host}/api/v1/oauth/token`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						client_id: this.env.SKYDROPX_CLIENT_ID,
						client_secret: this.env.SKYDROPX_CLIENT_SECRET,
						grant_type: "client_credentials",
					}),
				});

				const dato = (await res.json()) as {
					access_token?: string;
					expires_in?: number;
					error_description?: string;
				};

				if (!res.ok || !dato.access_token) {
					throw new Error(
						`Skydropx no dio token: ${dato.error_description ?? res.status}`,
					);
				}

				this.token = {
					valor: dato.access_token,
					expira: Date.now() + ((dato.expires_in ?? 7200) - 60) * 1000,
				};

				return this.token.valor;
			} finally {
				this.pidiendo = null;
			}
		})();

		return this.pidiendo;
	}

	private async llamar<T>(
		ruta: string,
		opciones?: { metodo?: string; cuerpo?: unknown },
	): Promise<T> {
		/* Tres intentos con espera creciente, ADEMÁS del limitador. El limitador
		   evita que nos pasemos nosotros; esto cubre que la cuenta se use desde
		   otro sitio o que Skydropx apriete el límite sin avisar. */
		for (let intento = 0; ; intento++) {
			await this.turno();
			const jwt = await this.autenticar();

			const res = await fetch(`${this.host}${ruta}`, {
				method: opciones?.metodo ?? "GET",
				headers: {
					authorization: `Bearer ${jwt}`,
					"content-type": "application/json",
				},
				body: opciones?.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
			});

			if (res.status === 429 && intento < 2) {
				await esperar(600 * (intento + 1));
				continue;
			}

			const dato = await res.json().catch(() => null);

			if (!res.ok) {
				/* El cuerpo de error trae el detalle por campo y es lo único que
				   dice qué falta de verdad; al log entero, hacia fuera nada. */
				this.log.error(`Skydropx ${res.status} en ${ruta}: ${JSON.stringify(dato)}`);

				if (res.status === 429) {
					throw new DemasiadasPeticiones("Skydropx está saturado ahora mismo");
				}
				throw new Error(`Skydropx respondió ${res.status}`);
			}

			return dato as T;
		}
	}

	/** Arranca la cotización. Devuelve el id con el que se consulta después. */
	async cotizar(origen: Direccion, destino: Direccion, paquete: Paquete) {
		const dato = await this.llamar<{ id: string }>("/api/v1/quotations", {
			metodo: "POST",
			cuerpo: {
				quotation: {
					address_from: aDireccion(origen),
					address_to: aDireccion(destino),
					parcel: {
						length: paquete.largo,
						width: paquete.ancho,
						height: paquete.alto,
						weight: paquete.peso,
					},
				},
			},
		});

		return dato.id;
	}

	/**
	 * Consulta una cotización ya creada.
	 *
	 * `lista` dice si Skydropx terminó de preguntarle a todas las paqueterías.
	 * Mientras sea `false` hay que volver a consultar; las tarifas que ya estén
	 * se devuelven igual, para poder ir pintando.
	 */
	async consultarCotizacion(id: string): Promise<{ lista: boolean; tarifas: Tarifa[] }> {
		const dato = await this.llamar<{
			is_completed: boolean;
			rates: {
				id: string;
				provider_display_name: string | null;
				provider_service_name: string | null;
				total: string | null;
				days: number | null;
			}[];
		}>(`/api/v1/quotations/${id}`);

		const tarifas = (dato.rates ?? [])
			/* Skydropx devuelve TODAS las paqueterías, incluidas las que no cubren
			   la ruta, con el precio en null. Enseñar eso sería enseñar ruido. */
			.filter((r) => r.total !== null && Number(r.total) > 0)
			.filter((r) => this.paqueteriaPermitida(r.provider_display_name))
			.map((r) => ({
				id: r.id,
				paqueteria: r.provider_display_name ?? "—",
				servicio: r.provider_service_name ?? "—",
				precio: Number(r.total),
				dias: r.days,
			}))
			.sort((a, b) => a.precio - b.precio);

		return { lista: dato.is_completed === true, tarifas };
	}

	/**
	 * Compra la guía de una cotización ya hecha.
	 *
	 * IMPORTANTE: la cotización tiene que ser la del peso REAL, no la del
	 * estimado que se le enseñó al comprador. Comprar sobre la vieja imprime
	 * una etiqueta con un peso que no es, y la paquetería repesa y factura la
	 * diferencia semanas después, cuando ya nadie se acuerda del pedido.
	 */
	async comprarGuia(
		cotizacionId: string,
		tarifaId: string,
		origen: Direccion & Contacto,
		destino: Direccion & Contacto,
		paquete: Paquete,
	): Promise<Guia> {
		const dato = await this.llamar<any>("/api/v1/shipments", {
			metodo: "POST",
			cuerpo: {
				shipment: {
					quotation_id: cotizacionId,
					rate_id: tarifaId,
					address_from: aDireccionCompleta(origen),
					address_to: aDireccionCompleta(destino),
					/* `packages`, NO `parcels`.
					 *
					 * Costó encontrarlo: la cotización usa `parcel` en singular, el
					 * envío usa `packages` en plural, y mandándolo como `parcels` la
					 * API contesta "consignment_note es requerido en todos los
					 * paquetes" — como si faltara el dato, no como si la clave
					 * estuviera mal. Su documentación no trae el ejemplo.
					 *
					 * `package_number` tiene que coincidir con el de la cotización,
					 * que para un solo bulto es 1. Con 0 rechaza. */
					packages: [
						{
							package_number: 1,
							length: paquete.largo,
							width: paquete.ancho,
							height: paquete.alto,
							weight: paquete.peso,
							package_type: this.env.KUSTTO_TIPO_EMPAQUE,
							/* La clave del SAT de lo que va dentro: México la exige en la
							   carta porte y Skydropx rechaza el envío sin ella. 53102500
							   es "ropa". Si algún día se mandan termos o gorras habrá que
							   variarla por producto, y conviene confirmarla con el
							   contador antes de facturar en serio. */
							consignment_note: this.env.KUSTTO_CLAVE_SAT,
						},
					],
				},
			},
		});

		/* La etiqueta NO viene en la respuesta de creación, y esperarla aquí fue
		 * un error que costó descubrir: el envío nace en `in_progress` y cada
		 * paquetería tarda lo suyo. Con ampm seguía sin etiqueta minutos
		 * después, o sea que ninguna espera razonable la habría alcanzado —
		 * sólo habría gastado el tiempo y muerto por timeout DESPUÉS de que el
		 * envío ya se pagó.
		 *
		 * Así que se devuelve lo que haya y la etiqueta se consulta aparte. Lo
		 * que importa guardar ya está: el id y el cobro. */
		return aGuia(String(dato?.data?.id ?? ""), dato);
	}

	/** Relee un envío ya creado. Es como aparece la etiqueta cuando esté lista. */
	async consultarEnvio(envioId: string): Promise<Guia> {
		return aGuia(envioId, await this.llamar<any>(`/api/v1/shipments/${envioId}`));
	}

	/**
	 * Qué paqueterías se pueden ofrecer.
	 *
	 * COTIZAR NO ES LO MISMO QUE PODER DESPACHAR. Skydropx cotiza con todas las
	 * de la cuenta, pero si la credencial de una no está dada de alta, la guía
	 * se compra y muere con "Credential ... was not found in cache". Para
	 * entonces el cliente YA eligió y pagó ese envío, y el taller se queda sin
	 * forma de mandarlo: el pedido se atasca con el dinero dentro. Pasó de
	 * verdad con ampm y con tresguerras.
	 *
	 * Con la variable vacía se ofrecen todas, que es como estaba.
	 */
	private paqueteriaPermitida(nombre: string | null | undefined) {
		const permitidas = this.env.SKYDROPX_PAQUETERIAS.split(",")
			.map(nombreLlano)
			.filter(Boolean);

		if (permitidas.length === 0) return true;
		return permitidas.includes(nombreLlano(String(nombre ?? "")));
	}
}

/**
 * El rango de diacríticos se arma en tiempo de ejecución a propósito: escrito
 * literal, las herramientas de edición lo convierten en el carácter combinante
 * de verdad y el reemplazo deja de funcionar sin avisar.
 */
const DIACRITICOS = new RegExp(
	`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`,
	"g",
);

/** El nombre llega como lo escribe Skydropx: "Paquetexpress", "Tres Guerras". */
function nombreLlano(s: string) {
	return s
		.normalize("NFD")
		.replace(DIACRITICOS, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function aDireccion(d: Direccion) {
	return {
		country_code: "MX",
		postal_code: d.cp,
		area_level1: d.estado,
		area_level2: d.ciudad,
		area_level3: d.colonia,
	};
}

function aDireccionCompleta(d: Direccion & Contacto) {
	return {
		...aDireccion(d),
		name: d.nombre,
		phone: d.telefono,
		email: d.email,
		street1: `${d.calle} ${d.numero}`.trim(),
		/* Skydropx rechaza una referencia vacía. Cuando no hay, se manda la
		   colonia: es verdad, ayuda al repartidor, y no inventa nada. */
		reference: d.referencias?.trim() || d.colonia,
	};
}

function aGuia(envioId: string, doc: any): Guia {
	const a = doc?.data?.attributes ?? {};
	const paquete =
		(doc?.included ?? []).find((i: any) => i?.type === "package")?.attributes ?? {};
	const detalle = a.error_detail ?? null;

	return {
		envioId,
		/* El del paquete manda: el `master_tracking_number` del envío existe
		   antes que la guía y con varios bultos sería otro número. */
		rastreo: paquete.tracking_number ?? a.master_tracking_number ?? null,
		paqueteria: a.carrier_name ?? null,
		etiquetaUrl: paquete.label_url ?? null,
		rastreoUrl: paquete.tracking_url_provider ?? null,
		estado: a.workflow_status ?? null,
		/* El mensaje largo primero: el corto es "vuelve a intentarlo", que no
		   dice nada. El largo trae la causa real. */
		error: detalle
			? (detalle.error_message_detail ??
				detalle.error_message ??
				detalle.error_code ??
				null)
			: null,
		/* Lo que Skydropx nos cobró de verdad. No tiene por qué coincidir con la
		   tarifa cotizada, y es el número que manda para las cuentas. */
		costo: a.total !== undefined ? Number(a.total) : null,
	};
}
