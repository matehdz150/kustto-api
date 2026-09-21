import {
	BadRequestException,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, eq, gt, inArray } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import {
	DemasiadasPeticiones,
	type Direccion,
	type Paquete,
	SkydropxClient,
	type Tarifa,
} from "./skydropx";

/** Lo que el taller no puede enviar todavía. El checkout ofrece recoger. */
const SIN_ENVIO = "Este taller todavía no tiene envíos configurados";

/** Cuánto vale una cotización antes de tener que rehacerla. */
const VIGENCIA_HORAS = 2;

/** Lo que se congela en el pedido sobre cómo viaja. */
export type EnvioElegido = {
	cotizacionId: string;
	tarifaId: string;
	paqueteria: string;
	servicio: string;
	precio: number;
	diasEstimados: number | null;
};

type LineaPedida = {
	productoId: string;
	tallas: { size: string; piezas: number }[];
};

/**
 * Cotizar envíos.
 *
 * EL PAQUETE LO ARMA EL SERVIDOR, SIEMPRE. De fuera sólo se acepta qué se pide
 * y a dónde va. El peso, las medidas y el origen salen de la base: si el
 * navegador pudiera mandar el peso, mandaría el precio del envío — es
 * exactamente el mismo motivo por el que el precio del producto tampoco viene
 * del cuerpo.
 */
@Injectable()
export class EnviosService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly skydropx: SkydropxClient,
	) {}

	/**
	 * Arranca la cotización de un pedido de UN taller.
	 *
	 * Misma regla que al pedir: un pedido sale de un solo taller, así que el
	 * envío también. Con dos orígenes no hay una cotización, hay dos.
	 */
	async crear(cuerpo: Record<string, any>) {
		const lineas = this.leerLineas(cuerpo);
		const destino = leerDestino(cuerpo.destino);
		const productos = await this.leerProductos(lineas);

		const talleres = new Set([...productos.values()].map((p) => p.tallerId));
		if (talleres.size > 1) {
			throw new BadRequestException("Un envío sale de un solo taller");
		}

		const tallerId = [...talleres][0];

		try {
			return {
				id: await this.arrancar(tallerId, destino, lineas, productos),
			};
		} catch (error) {
			throw this.traducir(error);
		}
	}

	/**
	 * Cotiza una COMPRA: una por taller.
	 *
	 * Cada taller manda desde SU dirección, así que no hay un envío sino uno
	 * por parte, con su precio y su plazo. El checkout los enseña por separado
	 * porque es lo que de verdad va a pasar: llegarán en paquetes distintos.
	 *
	 * UN TALLER QUE NO PUEDE NO TUMBA LA COMPRA. Si le falta la dirección de
	 * recolección, esa parte vuelve con su `error` y las demás con sus tarifas.
	 * El cliente decide: quitarla o recogerla con el taller. Fallar entero por
	 * uno mal configurado sería perder la venta completa.
	 *
	 * YA NO SE ESPACIAN LAS LLAMADAS A MANO. En las Lambdas había un
	 * `setTimeout` de 600 ms entre talleres porque no había forma de contar el
	 * límite de Skydropx entre contenedores; ahora lo cuenta el limitador de
	 * Redis, que además cubre las otras pestañas y los workers.
	 */
	async crearPorTaller(cuerpo: Record<string, any>) {
		const lineas = this.leerLineas(cuerpo);
		const destino = leerDestino(cuerpo.destino);
		const productos = await this.leerProductos(lineas);

		const grupos = new Map<string, LineaPedida[]>();
		for (const linea of lineas) {
			const tallerId = productos.get(linea.productoId)!.tallerId;
			grupos.set(tallerId, [...(grupos.get(tallerId) ?? []), linea]);
		}

		const nombres = new Map(
			(
				await this.db
					.select({ id: e.talleres.id, nombre: e.talleres.nombre })
					.from(e.talleres)
					.where(inArray(e.talleres.id, [...grupos.keys()]))
			).map((t) => [t.id, t.nombre]),
		);

		const partes: {
			proveedorId: string;
			taller: string | null;
			cotizacionId?: string;
			error?: string;
		}[] = [];

		for (const [tallerId, suyas] of grupos) {
			const taller = nombres.get(tallerId) ?? null;

			try {
				partes.push({
					proveedorId: tallerId,
					taller,
					cotizacionId: await this.arrancar(
						tallerId,
						destino,
						suyas,
						productos,
					),
				});
			} catch (error) {
				/* Pasarse del límite SÍ tumba la compra entera, porque reintentar
				   más tarde va a funcionar; lo demás es de este taller y sólo cae
				   su parte. */
				if (error instanceof DemasiadasPeticiones) throw this.traducir(error);

				/* Lo que sabemos decir se dice; lo demás no se filtra al cliente. */
				partes.push({
					proveedorId: tallerId,
					taller,
					error:
						error instanceof Error && error.message === SIN_ENVIO
							? SIN_ENVIO
							: "No pudimos cotizar el envío de este taller",
				});
			}
		}

		return { partes };
	}

	/**
	 * Lee la cotización y guarda lo que conteste.
	 *
	 * SE GUARDA, y ése es el cambio respecto a las Lambdas: allí el checkout
	 * volvía a preguntarle a Skydropx por la cotización en mitad del cobro —una
	 * llamada a un tercero dentro de la petición que espera quien está pagando,
	 * contra un servicio que admite dos por segundo—. Aquí queda en nuestra
	 * base y `envioDelPedido` la lee de ahí.
	 *
	 * `lista` dice si Skydropx terminó de preguntarle a todas. Mientras sea
	 * `false` el navegador vuelve a consultar; las tarifas que ya estén se
	 * devuelven igual, para poder ir pintando.
	 */
	async consultar(id: string) {
		const [guardada] = await this.db
			.select()
			.from(e.cotizacionesDeEnvio)
			.where(eq(e.cotizacionesDeEnvio.id, id))
			.limit(1);

		if (!guardada) throw new NotFoundException("No encontramos esa cotización");

		/* Ya completa: no se vuelve a preguntar. Una cotización cerrada no
		   cambia, y consultarla otra vez sólo gasta cupo del limitador. */
		if (guardada.estado === "lista") {
			return (guardada.respuesta as { tarifas: Tarifa[] }) ?? { tarifas: [] };
		}

		try {
			const { lista, tarifas } = await this.skydropx.consultarCotizacion(
				String((guardada.peticion as any).skydropxId),
			);

			await this.db
				.update(e.cotizacionesDeEnvio)
				.set({
					estado: lista ? "lista" : "pendiente",
					respuesta: { tarifas },
				})
				.where(eq(e.cotizacionesDeEnvio.id, id));

			return { lista, tarifas };
		} catch (error) {
			throw this.traducir(error);
		}
	}

	/**
	 * La tarifa elegida, leída de la cotización guardada.
	 *
	 * EL PRECIO NO VIENE DEL CUERPO. Del navegador sólo se aceptan dos ids; el
	 * importe sale de aquí. Es la misma regla que con el producto: lo que
	 * decide cuánto se cobra no lo manda quien paga.
	 */
	async envioDelPedido(valor: unknown): Promise<EnvioElegido> {
		const v = (valor ?? {}) as Record<string, unknown>;
		const cotizacionId = String(v.cotizacionId ?? "").trim();
		const tarifaId = String(v.tarifaId ?? "").trim();

		if (!cotizacionId || !tarifaId) {
			throw new BadRequestException("Falta elegir cómo se envía");
		}

		const [cotizacion] = await this.db
			.select()
			.from(e.cotizacionesDeEnvio)
			.where(
				and(
					eq(e.cotizacionesDeEnvio.id, cotizacionId),
					/* Caducada es lo mismo que inexistente: un precio de hace una
					   semana no es un precio. */
					gt(e.cotizacionesDeEnvio.expiraEn, new Date()),
				),
			)
			.limit(1);

		const tarifas = (cotizacion?.respuesta as { tarifas?: Tarifa[] } | null)
			?.tarifas;
		const tarifa = tarifas?.find((t) => t.id === tarifaId);

		/* Cobrar un precio que ya no existe es peor que pedir un clic más. */
		if (!tarifa) {
			throw new BadRequestException(
				"Esa opción de envío ya no está disponible. Vuelve a elegirla.",
			);
		}

		return {
			cotizacionId,
			tarifaId,
			paqueteria: tarifa.paqueteria,
			servicio: tarifa.servicio,
			precio: Number(tarifa.precio),
			diasEstimados: tarifa.dias ?? null,
		};
	}

	/**
	 * Cotiza contra Skydropx y guarda la fila. Devuelve NUESTRO id, no el suyo.
	 *
	 * El id de Skydropx queda dentro de `peticion`: hacia fuera se usa el
	 * nuestro, para que el navegador no tenga en la mano una llave de un
	 * tercero y para poder cambiar de paquetería sin cambiar el contrato.
	 */
	private async arrancar(
		tallerId: string,
		destino: Direccion,
		lineas: LineaPedida[],
		productos: Map<string, ProductoParaEnviar>,
	) {
		const origen = await this.origenDe(tallerId);
		const paquete = armarPaquete(lineas, productos);

		const skydropxId = await this.skydropx.cotizar(origen, destino, paquete);

		const [fila] = await this.db
			.insert(e.cotizacionesDeEnvio)
			.values({
				estado: "pendiente",
				peticion: { skydropxId, tallerId, origen, destino, paquete },
				expiraEn: new Date(Date.now() + VIGENCIA_HORAS * 3_600_000),
			})
			.returning({ id: e.cotizacionesDeEnvio.id });

		return fila.id;
	}

	/**
	 * De dónde sale el paquete.
	 *
	 * SIN DIRECCIÓN DE RECOLECCIÓN NO HAY ENVÍO POSIBLE, y decirlo claro
	 * importa: el checkout usa este error para ofrecer recoger con el taller en
	 * vez de enseñar una pantalla rota.
	 */
	private async origenDe(tallerId: string): Promise<Direccion> {
		const [taller] = await this.db
			.select({ recoleccion: e.talleres.recoleccion })
			.from(e.talleres)
			.where(eq(e.talleres.id, tallerId))
			.limit(1);

		const r = taller?.recoleccion as Record<string, unknown> | null;
		if (!r?.cp) throw new BadRequestException(SIN_ENVIO);

		return {
			cp: String(r.cp),
			estado: String(r.estado ?? ""),
			ciudad: String(r.ciudad ?? ""),
			colonia: String(r.colonia ?? ""),
		};
	}

	private leerLineas(c: Record<string, any>): LineaPedida[] {
		const lineas = Array.isArray(c.lineas) ? c.lineas : [];
		if (lineas.length === 0) {
			throw new BadRequestException("No dijiste qué vas a pedir");
		}

		return lineas.map((l: any) => {
			const productoId = String(l?.productoId ?? "");
			if (!productoId) {
				throw new BadRequestException("Una línea no dice qué producto es");
			}

			const tallas = (Array.isArray(l?.tallas) ? l.tallas : []).map(
				(t: any) => ({
					size: String(t?.size ?? ""),
					piezas: Math.trunc(Number(t?.piezas ?? 0)),
				}),
			);

			if (tallas.length === 0) {
				throw new BadRequestException(
					"Una línea no dice cuántas piezas ni de qué talla",
				);
			}

			return { productoId, tallas };
		});
	}

	/** Sólo lo publicado: cotizar un borrador filtraría que existe. */
	private async leerProductos(lineas: LineaPedida[]) {
		const ids = [...new Set(lineas.map((l) => l.productoId))];

		const filas = await this.db
			.select({
				id: e.productos.id,
				tallerId: e.productos.tallerId,
				caja: e.productos.caja,
			})
			.from(e.productos)
			.where(
				and(inArray(e.productos.id, ids), eq(e.productos.estado, "activo")),
			);

		if (filas.length !== ids.length) {
			throw new NotFoundException("Ese producto no está disponible");
		}

		const pesos = await this.db
			.select()
			.from(e.productoTallas)
			.where(inArray(e.productoTallas.productoId, ids));

		return new Map<string, ProductoParaEnviar>(
			filas.map((p) => [
				p.id,
				{
					tallerId: p.tallerId,
					caja: p.caja as {
						largo?: number;
						ancho?: number;
						alto?: number;
					} | null,
					pesoPorTalla: new Map(
						pesos
							.filter((t) => t.productoId === p.id)
							.map((t) => [t.talla, t.pesoG ?? 0]),
					),
				},
			]),
		);
	}

	/**
	 * 429 y no 500: pasarse del límite de Skydropx no es un fallo del pedido ni
	 * del dato. El navegador puede volver a intentar, y con un 500 se rendiría
	 * creyendo que algo se rompió.
	 */
	private traducir(error: unknown) {
		if (error instanceof DemasiadasPeticiones) {
			return new HttpException(
				"Estamos cotizando muchos envíos. Inténtalo en un momento.",
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
		return error;
	}
}

type ProductoParaEnviar = {
	tallerId: string;
	caja: { largo?: number; ancho?: number; alto?: number } | null;
	pesoPorTalla: Map<string, number>;
};

export function leerDestino(valor: unknown): Direccion {
	const d = (valor ?? {}) as Record<string, unknown>;
	const texto = (v: unknown) => String(v ?? "").trim();

	const destino = {
		cp: texto(d.cp),
		estado: texto(d.estado),
		ciudad: texto(d.ciudad),
		colonia: texto(d.colonia),
	};

	/* La colonia es tan obligatoria como el resto: Skydropx la exige y sin ella
	   rechaza la cotización entera en vez de adivinarla. */
	for (const [campo, comoSeLlama] of [
		["cp", "el código postal"],
		["estado", "el estado"],
		["ciudad", "la ciudad"],
		["colonia", "la colonia"],
	] as const) {
		if (!destino[campo]) {
			throw new BadRequestException(`Falta ${comoSeLlama} de destino`);
		}
	}

	if (!/^\d{5}$/.test(destino.cp)) {
		throw new BadRequestException("El código postal son cinco dígitos");
	}

	return destino;
}

/**
 * El paquete que se va a cotizar.
 *
 * EL PESO ES EXACTO; LA CAJA ES UNA APROXIMACIÓN, y conviene saber cuál es
 * cuál. El peso sale de sumar lo que pesa cada talla por las piezas que se
 * piden, y eso no tiene margen de error. La caja no: se apilan las piezas a lo
 * alto y se conserva el largo y el ancho mayores, que es como se acomodan unas
 * prendas dobladas, pero la tela cede y la caja real casi siempre sale más
 * chica. Por eso el taller confirma las medidas de verdad al terminar, y ésas
 * son las que compran la guía.
 */
export function armarPaquete(
	lineas: LineaPedida[],
	productos: Map<string, ProductoParaEnviar>,
): Paquete {
	let gramos = 0;
	let piezas = 0;
	let largo = 0;
	let ancho = 0;
	let alto = 0;

	for (const linea of lineas) {
		const p = productos.get(linea.productoId)!;
		const caja = p.caja;

		if (!caja?.largo) throw new BadRequestException(SIN_ENVIO);

		let deLaLinea = 0;

		for (const t of linea.tallas) {
			if (!Number.isFinite(t.piezas) || t.piezas <= 0) {
				throw new BadRequestException(
					`La cantidad de la talla "${t.size}" no es válida`,
				);
			}

			const g = p.pesoPorTalla.get(t.size) ?? 0;
			/* Una talla sin peso no se puede cotizar, y adivinarla sería peor: un
			   envío mal cotizado lo paga alguien. */
			if (!g) throw new BadRequestException(SIN_ENVIO);

			gramos += g * t.piezas;
			piezas += t.piezas;
			deLaLinea += t.piezas;
		}

		largo = Math.max(largo, Number(caja.largo));
		ancho = Math.max(ancho, Number(caja.ancho ?? 0));
		alto += Number(caja.alto ?? 0) * deLaLinea;
	}

	if (piezas > 500) {
		throw new BadRequestException(
			"Para más de 500 piezas escríbenos y lo cotizamos",
		);
	}

	return {
		largo,
		ancho,
		alto,
		/* Skydropx quiere kilos. Los gramos son nuestros porque es como piensa
		   el peso quien captura una prenda. */
		peso: Math.max(0.1, Math.round((gramos / 1000) * 100) / 100),
	};
}
