import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { Identidad } from "../auth/cognito";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { PerfilService } from "./perfil.service";

/** Con más de esto no es una lista de deseos, es un raspado. */
const MAXIMO = 200;
const ID = /^[a-zA-Z0-9_-]{1,64}$/;

@Injectable()
export class FavoritosService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly perfil: PerfilService,
	) {}

	async obtener(quien: Identidad) {
		const filas = await this.db
			.select({ productoId: e.favoritos.productoId })
			.from(e.favoritos)
			.where(eq(e.favoritos.compradorId, quien.sub));

		return { ids: filas.map((f) => f.productoId) };
	}

	/**
	 * Guarda la lista entera, que es como la manda el navegador.
	 *
	 * SE LIMPIA EN VEZ DE RECHAZAR: lo que llega es una lista que el navegador
	 * fue armando a lo largo de meses, y tirarla entera porque un id venga raro
	 * le borraría los favoritos buenos a alguien.
	 *
	 * En DynamoDB era UNA lista en un solo ítem y reescribirla era un `PutItem`.
	 * Aquí son filas: se borra lo que sobra y se inserta lo que falta, así que
	 * apagar un corazón no reescribe los otros ciento noventa y nueve.
	 */
	async guardar(quien: Identidad, cuerpo: Record<string, any>) {
		const crudos = Array.isArray(cuerpo?.ids) ? cuerpo.ids : [];

		const ids = [
			...new Set(
				crudos
					.filter((v: unknown): v is string => typeof v === "string")
					.filter((v: string) => ID.test(v)),
			),
		];

		if (ids.length > MAXIMO) {
			throw new BadRequestException(
				`No se pueden guardar más de ${MAXIMO} favoritos.`,
			);
		}

		await this.perfil.asegurar(quien);

		await this.db.transaction(async (tx) => {
			await tx
				.delete(e.favoritos)
				.where(
					ids.length === 0
						? eq(e.favoritos.compradorId, quien.sub)
						: and(
								eq(e.favoritos.compradorId, quien.sub),
								notInArray(e.favoritos.productoId, ids),
							),
				);

			if (ids.length === 0) return;

			/* Sólo los que siguen en el catálogo: la clave foránea no perdona un
			   producto borrado, y un favorito colgado no le sirve a nadie. */
			const vivos = await tx
				.select({ id: e.productos.id })
				.from(e.productos)
				.where(inArray(e.productos.id, ids));

			if (vivos.length === 0) return;

			await tx
				.insert(e.favoritos)
				.values(
					vivos.map((p) => ({ compradorId: quien.sub, productoId: p.id })),
				)
				.onConflictDoNothing();
		});

		return this.obtener(quien);
	}
}
