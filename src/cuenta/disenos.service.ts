import {
	BadRequestException,
	Inject,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { AlmacenService } from "../almacen/almacen.service";
import type { Identidad } from "../auth/identidad";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { correoDe, idOrdenable } from "./comun";
import { PerfilService } from "./perfil.service";

const MAX_NOMBRE = 60;

/**
 * Lo que se guarda en `lienzo` además de la ruta.
 *
 * VA EN EL JSON Y NO EN COLUMNAS: son datos congelados de la línea de la que
 * salió el diseño, que nadie filtra ni ordena, y la tabla ya tiene filas
 * guardadas sin ellos. Las viejas los traen en null y la web lo aguanta.
 */
type Lienzo = {
	ruta?: string;
	origen?: { pedidoId: string; lineaId: string };
	colorPrenda?: string | null;
	lados?: string[];
};

/**
 * La forma que lee la web (`DisenoGuardado`).
 *
 * Antes se devolvía la fila tal cual y la página de diseños tronaba en cuanto
 * había uno guardado: buscaba `origen`, `producto` y `miniatura`, que la fila
 * no tiene con esos nombres.
 */
function aVista(fila: typeof e.disenos.$inferSelect, producto: string | null) {
	const lienzo = (fila.lienzo ?? {}) as Lienzo;
	return {
		id: fila.id,
		nombre: fila.nombre,
		productoId: fila.productoId,
		producto,
		colorPrenda: lienzo.colorPrenda ?? null,
		lados: Array.isArray(lienzo.lados) ? lienzo.lados : [],
		diseno: lienzo.ruta ?? null,
		miniatura: fila.vistaPreviaUrl,
		origen: lienzo.origen ?? null,
		creadoEn: fila.creadoEn,
	};
}
/** Un tope alto pero real: sin él, un bucle deja la cuenta inservible. */
const MAXIMOS = 200;

/**
 * Los diseños guardados del comprador.
 *
 * QUÉ RESUELVE. "Mis diseños" se derivaba de los pedidos: para una empresa que
 * pide su logo cada mes, encontrarlo significaba acordarse de en qué pedido
 * iba. Ponerle nombre lo convierte de subproducto en algo que se busca.
 *
 * NO HAY UN "GUARDAR" EN EL EDITOR, y es deliberado. Un diseño guardado nace
 * de una línea de pedido que ya existe: se le pone nombre y se asciende. Así
 * quien compra una vez no ve un concepto nuevo, y quien repite lo tiene arriba.
 */
@Injectable()
export class DisenosService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly almacen: AlmacenService,
		private readonly perfil: PerfilService,
	) {}

	async listar(quien: Identidad) {
		correoDe(quien);

		const filas = await this.db
			.select({ diseno: e.disenos, producto: e.productos.nombre })
			.from(e.disenos)
			.leftJoin(e.productos, eq(e.productos.id, e.disenos.productoId))
			.where(eq(e.disenos.compradorId, quien.sub))
			.orderBy(desc(e.disenos.creadoEn));

		return filas.map((f) => aVista(f.diseno, f.producto));
	}

	private async uno(quien: Identidad, id: string) {
		const [f] = await this.db
			.select({ diseno: e.disenos, producto: e.productos.nombre })
			.from(e.disenos)
			.leftJoin(e.productos, eq(e.productos.id, e.disenos.productoId))
			.where(and(eq(e.disenos.id, id), eq(e.disenos.compradorId, quien.sub)))
			.limit(1);
		if (!f) throw new NotFoundException("No encontramos ese diseño");
		return aVista(f.diseno, f.producto);
	}

	/**
	 * Asciende una línea de pedido a diseño guardado.
	 *
	 * EL ARTE SE COPIA, NO SE REFERENCIA. Un diseño guardado sobrevive a su
	 * pedido: apuntar a `medios/pedidos/<pedido>/…` lo dejaría colgando el día
	 * que ese pedido se limpie, y además ata la vida del activo a la del
	 * documento que sólo lo produjo una vez.
	 *
	 * La copia es de SERVIDOR A SERVIDOR: ningún byte pasa por el navegador.
	 */
	async guardar(quien: Identidad, cuerpo: Record<string, any>) {
		correoDe(quien);

		const nombre = String(cuerpo?.nombre ?? "").trim();
		if (!nombre) {
			throw new BadRequestException("Ponle un nombre para poder encontrarlo");
		}
		if (nombre.length > MAX_NOMBRE) {
			throw new BadRequestException(
				`El nombre no puede pasar de ${MAX_NOMBRE} caracteres`,
			);
		}

		const pedidoId = String(cuerpo?.pedidoId ?? "").trim();
		const lineaId = String(cuerpo?.lineaId ?? "").trim();

		if (!pedidoId || !lineaId) {
			throw new BadRequestException(
				"Falta de qué pedido y de qué línea sale el diseño",
			);
		}

		const partida = await this.suyaOFalla(quien, pedidoId, lineaId);

		const cuantos = await this.listar(quien);
		if (cuantos.length >= MAXIMOS) {
			throw new BadRequestException(
				`Ya tienes ${MAXIMOS} diseños guardados. Borra alguno para guardar otro.`,
			);
		}

		const id = idOrdenable();
		const base = `medios/disenos/${quien.sub}/${id}`;

		const copiado = await this.almacen.copiar(
			`medios/pedidos/${pedidoId}/${lineaId}-diseno.json`,
			`${base}.json`,
		);

		/* SIN EL LIENZO NO HAY DISEÑO. Es el único archivo obligatorio: sin él,
		   lo guardado no se puede reabrir en el editor y la tarjeta sería una
		   mentira. */
		if (!copiado) {
			throw new NotFoundException(
				"No encontramos el diseño de esa línea. Puede que el pedido sea muy antiguo.",
			);
		}

		/* La miniatura es la FOTO REAL de la prenda con el diseño, y sólo esa. Ni
		   el arte suelto (recortado y transparente, en pequeño no se reconoce) ni
		   la colocación sobre el mockup, que es un dibujo plano y no se parece a
		   lo que llega. Sin foto real la web enseña la foto del producto. */
		const vista =
			(partida.arte as { prenda?: string; conPrenda?: boolean }[]).find(
				(a) => a.conPrenda && a.prenda,
			)?.prenda ?? null;
		const miniatura = vista
			? (await this.almacen.copiar(
					vista.replace(/^\//, ""),
					`${base}-vista.png`,
				))
				? `/${base}-vista.png`
				: null
			: null;

		await this.perfil.asegurar(quien);

		const [fila] = await this.db
			.insert(e.disenos)
			.values({
				id,
				compradorId: quien.sub,
				productoId: partida.productoId,
				nombre,
				lienzo: {
					ruta: `/${base}.json`,
					origen: { pedidoId, lineaId },
					colorPrenda: partida.color,
					lados: (partida.lados as string[]) ?? [],
				} satisfies Lienzo,
				vistaPreviaUrl: miniatura,
			})
			.returning();

		return this.uno(quien, fila.id);
	}

	async renombrar(quien: Identidad, id: string, cuerpo: Record<string, any>) {
		correoDe(quien);

		const nombre = String(cuerpo?.nombre ?? "").trim();
		if (!nombre) throw new BadRequestException("Ponle un nombre");
		if (nombre.length > MAX_NOMBRE) {
			throw new BadRequestException(
				`El nombre no puede pasar de ${MAX_NOMBRE} caracteres`,
			);
		}

		const [fila] = await this.db
			.update(e.disenos)
			.set({ nombre, actualizadoEn: new Date() })
			.where(and(eq(e.disenos.id, id), eq(e.disenos.compradorId, quien.sub)))
			.returning();

		if (!fila) throw new NotFoundException("No encontramos ese diseño");
		return this.uno(quien, fila.id);
	}

	/**
	 * Borra el diseño y sus archivos.
	 *
	 * LA FILA PRIMERO Y LOS ARCHIVOS DESPUÉS. Al revés, un fallo a mitad deja
	 * una tarjeta apuntando a un objeto que ya no está —una imagen rota en la
	 * rejilla—, mientras que así lo que queda son objetos que nadie referencia,
	 * que es ruido barato.
	 *
	 * UNA PLANTILLA PUEDE ESTAR APUNTÁNDOLO. La clave foránea lo deja en null
	 * en vez de impedir el borrado: quien quiso borrar su diseño quiso borrarlo,
	 * y la plantilla enseña esa línea sin arte en vez de no poder abrirse.
	 */
	async borrar(quien: Identidad, id: string) {
		correoDe(quien);

		const [fila] = await this.db
			.delete(e.disenos)
			.where(and(eq(e.disenos.id, id), eq(e.disenos.compradorId, quien.sub)))
			.returning();

		if (!fila) throw new NotFoundException("No encontramos ese diseño");

		const base = `medios/disenos/${quien.sub}/${id}`;
		await this.almacen.borrar(`${base}.json`);
		await this.almacen.borrar(`${base}-vista.png`);

		return { ok: true };
	}

	/**
	 * La partida, sólo si el pedido es de quien pregunta.
	 *
	 * Se comprueba por CORREO, que es como se encuentran los pedidos de alguien
	 * —incluidos los que hizo antes de tener cuenta—.
	 */
	private async suyaOFalla(
		quien: Identidad,
		pedidoId: string,
		lineaId: string,
	) {
		const [fila] = await this.db
			.select({ partida: e.pedidoPartidas })
			.from(e.pedidoPartidas)
			.innerJoin(e.pedidos, eq(e.pedidos.id, e.pedidoPartidas.pedidoId))
			.where(
				and(
					eq(e.pedidoPartidas.id, lineaId),
					eq(e.pedidos.id, pedidoId),
					eq(e.pedidos.correo, correoDe(quien)),
				),
			)
			.limit(1);

		/* El mismo mensaje si no existe y si es de otra persona: distinguirlos
		   convierte esto en una forma de averiguar qué pedidos existen. */
		if (!fila)
			throw new NotFoundException("No encontramos esa línea de pedido");
		return fila.partida;
	}
}
