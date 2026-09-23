import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Identidad } from "../auth/identidad";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { correoDe, leerDireccionGuardada, texto } from "./comun";

@Injectable()
export class PerfilService {
	constructor(@Inject(DB) private readonly db: Db) {}

	/**
	 * SIN PERFIL NO ES UN 404: es alguien que acaba de entrar y todavía no ha
	 * guardado nada. Se devuelve el esqueleto para que la pantalla pinte los
	 * campos vacíos en vez de un error.
	 */
	async obtener(quien: Identidad) {
		correoDe(quien);

		const [fila] = await this.db
			.select()
			.from(e.compradores)
			.where(eq(e.compradores.id, quien.sub))
			.limit(1);

		if (!fila) {
			return {
				id: quien.sub,
				nombre: null,
				whatsapp: null,
				direccion: null,
				creadoEn: null,
			};
		}

		return {
			id: fila.id,
			nombre: fila.nombre,
			whatsapp: fila.whatsapp,
			direccion: fila.direccion,
			creadoEn: fila.creadoEn.toISOString(),
			actualizadoEn: fila.actualizadoEn.toISOString(),
		};
	}

	async guardar(quien: Identidad, cuerpo: Record<string, unknown>) {
		const correo = correoDe(quien);
		const nombre = texto(cuerpo?.nombre);

		if (!nombre) throw new BadRequestException("Falta tu nombre");

		const valores = {
			nombre,
			whatsapp: texto(cuerpo?.whatsapp) || null,
			direccion: leerDireccionGuardada(cuerpo?.direccion),
			/* El correo del TOKEN, no del cuerpo. Es lo que ata este perfil con
			   las compras que hizo antes de tener cuenta. */
			correo,
			actualizadoEn: new Date(),
		};

		const [fila] = await this.db
			.insert(e.compradores)
			.values({ id: quien.sub, ...valores })
			.onConflictDoUpdate({ target: e.compradores.id, set: valores })
			.returning();

		return {
			id: fila.id,
			nombre: fila.nombre,
			whatsapp: fila.whatsapp,
			direccion: fila.direccion,
			creadoEn: fila.creadoEn.toISOString(),
			actualizadoEn: fila.actualizadoEn.toISOString(),
		};
	}

	/**
	 * Asegura que la fila del comprador existe antes de colgarle cosas.
	 *
	 * Hace falta porque todo lo de `/cuenta` tiene una clave foránea a
	 * `compradores`, y alguien puede guardar un favorito o una imagen ANTES de
	 * llenar su perfil — en DynamoDB la partición existía sola en cuanto
	 * escribías algo en ella.
	 */
	async asegurar(quien: Identidad) {
		await this.db
			.insert(e.compradores)
			.values({ id: quien.sub, correo: correoDe(quien) })
			.onConflictDoNothing();
	}
}
