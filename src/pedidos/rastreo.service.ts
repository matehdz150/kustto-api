import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { asc, eq, type SQL, sql } from "drizzle-orm";
import { TopesService } from "../cuentas/topes.service";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";

/** Intentos por IP y por folio en la ventana: cortan a quien prueba folios. */
const TOPE_POR_IP = 20;
const TOPE_POR_FOLIO = 8;
const VENTANA_S = 15 * 60;

/**
 * "Rastrea tu pedido" con el número y el correo, para quien compró sin cuenta
 * y no tiene a mano el enlace del correo.
 *
 * DEVUELVE MUY POCO, a propósito: el folio, en qué va cada parte y el número
 * de guía. Nada de dirección, teléfono, líneas ni importes — eso sigue
 * detrás del enlace con token o de la sesión. El folio son seis dígitos y el
 * correo se puede adivinar; lo que se enseña aquí tiene que poder verlo
 * cualquiera que tenga los dos sin que importe.
 *
 * El folio de la COMPRA ("453275") trae todas sus partes; el de una parte
 * ("453275-1") o uno viejo sin compra, sólo ése. Un número que no existe y un
 * correo que no coincide contestan LO MISMO: si no, esto serviría para saber
 * qué folios existen.
 */
@Injectable()
export class RastreoService {
	constructor(
		@Inject(DB) private readonly db: Db,
		private readonly topes: TopesService,
	) {}

	async rastrear(cuerpo: Record<string, unknown>, ip: string | null) {
		const folio = String(cuerpo?.folio ?? "")
			.replace(/[#\s]/g, "")
			.trim();
		const correo = String(cuerpo?.correo ?? "")
			.trim()
			.toLowerCase();

		if (ip) await this.topes.contar(`rastreo-ip:${ip}`, TOPE_POR_IP, VENTANA_S);
		if (folio) {
			await this.topes.contar(
				`rastreo-folio:${folio}`,
				TOPE_POR_FOLIO,
				VENTANA_S,
			);
		}

		const noEsta = new NotFoundException(
			"No encontramos un pedido con ese número y ese correo",
		);
		if (!/^\d{4,8}(-\d{1,2})?$/.test(folio) || !correo.includes("@")) {
			throw noEsta;
		}

		const [compra] = await this.db
			.select({
				id: e.compras.id,
				folio: e.compras.folio,
				creadoEn: e.compras.creadoEn,
			})
			.from(e.compras)
			.where(
				sql`${e.compras.folio} = ${folio} and lower(${e.compras.correo}) = ${correo}`,
			)
			.limit(1);

		const partes = compra
			? await this.partes(eq(e.pedidos.compraId, compra.id))
			: await this.partes(
					sql`${e.pedidos.folio} = ${folio} and lower(${e.pedidos.correo}) = ${correo}`,
				);

		if (partes.length === 0) throw noEsta;

		return {
			folio: compra?.folio ?? partes[0].folio,
			creadoEn: (compra?.creadoEn ?? partes[0].creadoEn).toISOString(),
			partes: partes.map((p) => ({
				folio: p.folio,
				taller: p.tallerPublico ?? p.taller,
				estado: p.estado,
				piezas: p.piezas,
				metodoEntrega: p.metodoEntrega,
				guia: guiaVisible(p.guia),
			})),
		};
	}

	private partes(donde: SQL) {
		return this.db
			.select({
				folio: e.pedidos.folio,
				estado: e.pedidos.estado,
				piezas: e.pedidos.piezas,
				metodoEntrega: e.pedidos.metodoEntrega,
				guia: e.pedidos.guia,
				creadoEn: e.pedidos.creadoEn,
				taller: e.talleres.nombre,
				tallerPublico: e.talleres.nombrePublico,
			})
			.from(e.pedidos)
			.innerJoin(e.talleres, eq(e.talleres.id, e.pedidos.tallerId))
			.where(donde)
			.orderBy(asc(e.pedidos.folio));
	}
}

/** De la guía, sólo lo que sirve para seguir el paquete. */
function guiaVisible(guia: unknown) {
	const g = guia as Record<string, unknown> | null;
	if (!g) return null;
	return {
		paqueteria: (g.paqueteria as string | null) ?? null,
		rastreo: (g.rastreo as string | null) ?? null,
		rastreoUrl: (g.rastreoUrl as string | null) ?? null,
	};
}
