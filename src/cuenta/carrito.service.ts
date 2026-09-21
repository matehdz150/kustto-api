import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { Identidad } from "../auth/cognito";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { PerfilService } from "./perfil.service";

/** Un carrito no es un almacén. Con más de esto, algo va mal. */
const MAXIMO = 30;

/**
 * El carrito de quien tiene sesión.
 *
 * QUÉ GUARDA, Y QUÉ NO. Sólo rutas y cantidades: el arte ya vive en S3 desde
 * que se agregó, bajo `carritos/<id>/`, y ese prefijo CADUCA A LOS 30 DÍAS
 * porque la mayor parte de lo que se sube ahí es de gente que nunca compró.
 *
 * SE REEMPLAZA ENTERO EN CADA GUARDADO, no se reconcilia artículo por artículo.
 * El navegador manda la lista completa —es como la tiene en memoria, y es lo
 * que hace trivial la fusión al entrar: se juntan dos listas, no se
 * reconcilian dos historiales—. En DynamoDB era un solo ítem; aquí son filas
 * dentro de una transacción, que da lo mismo de cara afuera.
 */
@Injectable()
export class CarritoService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly perfil: PerfilService,
	) {}

	async obtener(quien: Identidad) {
		const filas = await this.db
			.select()
			.from(e.carritoPartidas)
			.where(eq(e.carritoPartidas.compradorId, quien.sub))
			.orderBy(asc(e.carritoPartidas.creadoEn));

		return {
			articulos: filas.map(aArticulo),
			actualizadoEn:
				filas
					.map((f) => f.actualizadoEn.toISOString())
					.sort()
					.at(-1) ?? null,
		};
	}

	/**
	 * Guarda el carrito tal como viene.
	 *
	 * NO SE VALIDA CONTRA EL CATÁLOGO AQUÍ, a propósito: un producto puede
	 * agotarse o dejar de publicarse mientras está en el carrito, y bloquear el
	 * guardado dejaría a alguien sin poder ni QUITAR lo que ya no existe. Lo
	 * que de verdad decide —que el producto siga publicado y a qué precio— se
	 * comprueba al crear el pedido, que es donde importa.
	 *
	 * Lo único que sí se exige es que el producto EXISTA, porque hay una clave
	 * foránea: un id inventado reventaría la escritura con un error de base de
	 * datos en vez de con un mensaje.
	 */
	async guardar(quien: Identidad, cuerpo: Record<string, any>) {
		const articulos = Array.isArray(cuerpo?.articulos) ? cuerpo.articulos : [];

		if (articulos.length > MAXIMO) {
			throw new BadRequestException(
				`El carrito no admite más de ${MAXIMO} artículos. Pide en dos veces.`,
			);
		}

		await this.perfil.asegurar(quien);

		const ahora = new Date();

		await this.db.transaction(async (tx) => {
			await tx
				.delete(e.carritoPartidas)
				.where(eq(e.carritoPartidas.compradorId, quien.sub));

			for (const a of articulos) {
				const productoId = String(a?.productoId ?? "").trim();
				if (!productoId) continue;

				const [existe] = await tx
					.select({ id: e.productos.id })
					.from(e.productos)
					.where(eq(e.productos.id, productoId))
					.limit(1);

				/* Un producto borrado del catálogo se cae del carrito en silencio.
				   Es lo mismo que pasaba antes: la lista se guardaba entera y al
				   pedir se descubría que ya no estaba. */
				if (!existe) continue;

				await tx.insert(e.carritoPartidas).values({
					compradorId: quien.sub,
					productoId,
					color: a?.colorPrenda ?? a?.color ?? null,
					talla: a?.talla ?? null,
					piezas: Math.max(1, Math.trunc(Number(a?.piezas ?? 1))),
					/* Todo lo demás del artículo se guarda tal cual: son rutas del
					   arte, tallas y lo que el editor necesite para reabrirlo, y
					   normalizarlo obligaría a conocer su forma, que cambia con el
					   editor y no con la base de datos. */
					arte: a?.arte ?? null,
					diseno: a?.diseno ?? null,
					creadoEn: ahora,
					actualizadoEn: ahora,
				});
			}
		});

		return this.obtener(quien);
	}

	/** Vaciar es borrar las filas: un carrito vacío y uno que no existe son lo mismo. */
	async vaciar(quien: Identidad) {
		await this.db
			.delete(e.carritoPartidas)
			.where(eq(e.carritoPartidas.compradorId, quien.sub));

		return { articulos: [], actualizadoEn: null };
	}
}

function aArticulo(f: typeof e.carritoPartidas.$inferSelect) {
	return {
		id: f.id,
		productoId: f.productoId,
		colorPrenda: f.color,
		talla: f.talla,
		piezas: f.piezas,
		arte: f.arte,
		diseno: f.diseno,
	};
}
