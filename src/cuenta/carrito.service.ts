import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { Identidad } from "../auth/identidad";
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
			.orderBy(asc(e.carritoPartidas.orden));

		return {
			articulos: filas.map((f) => f.articulo),
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

			for (const [orden, a] of articulos.entries()) {
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

				/* ENTERO Y TAL CUAL: ver el comentario de la tabla. */
				await tx.insert(e.carritoPartidas).values({
					compradorId: quien.sub,
					productoId,
					orden,
					articulo: a,
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
