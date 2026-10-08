import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
	Inject,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { ENTORNO } from "../config/config.module";
import type { Entorno } from "../config/entorno";
import { DB, type Db } from "../db/db.module";
import * as e from "../db/esquema";
import { type Meta, SesionesService } from "./sesiones.service";

const AUTORIZAR = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const EMISORES = ["https://accounts.google.com", "accounts.google.com"];

/** Lo que se guarda en la cookie corta entre ir a Google y volver. */
export type EstadoDeGoogle = { estado: string; nonce: string; volver: string };

type Reclamos = {
	iss?: string;
	aud?: string;
	exp?: number;
	sub?: string;
	nonce?: string;
	email?: string;
	email_verified?: boolean | string;
	name?: string;
	given_name?: string;
};

/**
 * "Continuar con Google" para compradores.
 *
 * FLUJO DE CÓDIGO EN EL SERVIDOR, no el botón de Google en el navegador: la
 * sesión de Kustto es una cookie `httpOnly` que escribe la API, y el secreto
 * del cliente no puede salir de aquí. El navegador sólo viaja a Google y
 * vuelve a `/auth/comprador/google/callback`, donde se cambia el código por
 * los datos, se abre la sesión y se manda a la persona de vuelta al sitio.
 *
 * SÓLO COMPRADORES. Los talleres entran por invitación y el admin se da de
 * alta a mano: con Google, cualquiera con una cuenta de Gmail sería taller.
 */
@Injectable()
export class GoogleService {
	constructor(
		@Inject(ENTORNO) private readonly env: Entorno,
		@Inject(DB) private readonly db: Db,
		private readonly sesiones: SesionesService,
	) {}

	get activo() {
		return Boolean(this.env.GOOGLE_CLIENT_ID && this.env.GOOGLE_CLIENT_SECRET);
	}

	private get redirigirA() {
		return (
			this.env.GOOGLE_REDIRECT_URI ??
			`${this.env.JWT_EMISOR}/auth/comprador/google/callback`
		);
	}

	/**
	 * Sólo se acepta una ruta NUESTRA como destino: `//otro.sitio` y `https://…`
	 * convertirían esto en una redirección abierta que firma Kustto.
	 */
	rutaSegura(volver: unknown) {
		const v = String(volver ?? "");
		return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")
			? v
			: "/cuenta";
	}

	/** La dirección de Google a la que se manda a la persona, y lo que hay que recordar. */
	iniciar(volver: unknown): { url: string; estado: EstadoDeGoogle } {
		if (!this.activo) throw new NotFoundException();

		const estado: EstadoDeGoogle = {
			estado: randomBytes(24).toString("base64url"),
			nonce: randomBytes(24).toString("base64url"),
			volver: this.rutaSegura(volver),
		};

		const params = new URLSearchParams({
			client_id: this.env.GOOGLE_CLIENT_ID as string,
			redirect_uri: this.redirigirA,
			response_type: "code",
			scope: "openid email profile",
			state: estado.estado,
			nonce: estado.nonce,
			/* Siempre se deja elegir la cuenta: quien comparte la computadora no
			   debe entrar con la última que usó otra persona. */
			prompt: "select_account",
		});

		return { url: `${AUTORIZAR}?${params}`, estado };
	}

	/** A dónde se manda al terminar, bien o mal. */
	sitio(ruta: string, fallo?: string) {
		const base = this.env.KUSTTO_SITIO.replace(/\/$/, "");
		const sep = ruta.includes("?") ? "&" : "?";
		return fallo ? `${base}${ruta}${sep}google=${fallo}` : `${base}${ruta}`;
	}

	/** Cambia el código por los datos de la persona y abre su sesión. */
	async terminar(
		codigo: string,
		recibido: string,
		guardado: EstadoDeGoogle,
		meta: Meta,
	) {
		if (!this.activo) throw new NotFoundException();

		/* El `state` que volvió tiene que ser el que salió de ESTE navegador. Es
		   lo que impide que alguien meta en tu sesión un código suyo. */
		const a = createHash("sha256").update(recibido).digest();
		const b = createHash("sha256").update(guardado.estado).digest();
		if (!timingSafeEqual(a, b)) throw new UnauthorizedException();

		const respuesta = await fetch(TOKEN, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code: codigo,
				client_id: this.env.GOOGLE_CLIENT_ID as string,
				client_secret: this.env.GOOGLE_CLIENT_SECRET as string,
				redirect_uri: this.redirigirA,
				grant_type: "authorization_code",
			}),
		});
		if (!respuesta.ok) throw new UnauthorizedException();

		const { id_token: idToken } = (await respuesta.json()) as {
			id_token?: string;
		};
		const r = leerReclamos(idToken);

		/* El token llegó DIRECTO de Google por TLS, así que su firma no hace falta
		   comprobarla (OpenID Connect lo permite); lo que sí: para quién es,
		   quién lo emitió, que no caducó y que es de esta petición. */
		if (
			!r ||
			r.aud !== this.env.GOOGLE_CLIENT_ID ||
			!EMISORES.includes(String(r.iss)) ||
			!r.exp ||
			r.exp * 1000 < Date.now() ||
			r.nonce !== guardado.nonce ||
			!r.sub ||
			!r.email
		) {
			throw new UnauthorizedException();
		}

		/* Un correo que Google no verificó no demuestra nada: ligarlo a una
		   cuenta de Kustto dejaría que alguien entre a pedidos ajenos. */
		const verificado = r.email_verified === true || r.email_verified === "true";
		if (!verificado) throw new UnauthorizedException();

		const usuario = await this.usuarioDe(r);
		if (usuario.desactivadoEn) throw new UnauthorizedException();

		return this.sesiones.iniciar(usuario, meta);
	}

	/**
	 * Encuentra o crea la cuenta.
	 *
	 * 1. Por el `sub` de Google, que es lo que no cambia de dueño.
	 * 2. Si es la primera vez que entra con Google pero el correo ya tiene
	 *    cuenta, se LIGA: Google verificó el correo, así que es la misma
	 *    persona, y de paso queda verificado.
	 * 3. Si no hay nada, se crea una cuenta sin contraseña (podrá ponerla con
	 *    "olvidé mi contraseña").
	 */
	private async usuarioDe(r: Reclamos) {
		const correo = String(r.email).trim().toLowerCase();
		const sujeto = String(r.sub);

		const [enlazada] = await this.db
			.select({ usuario: e.usuarios })
			.from(e.identidadesExternas)
			.innerJoin(e.usuarios, eq(e.usuarios.id, e.identidadesExternas.usuarioId))
			.where(
				and(
					eq(e.identidadesExternas.proveedor, "google"),
					eq(e.identidadesExternas.sujeto, sujeto),
					eq(e.usuarios.tipo, "comprador"),
				),
			)
			.limit(1);
		if (enlazada) return enlazada.usuario;

		const [porCorreo] = await this.db
			.select()
			.from(e.usuarios)
			.where(
				and(eq(e.usuarios.tipo, "comprador"), eq(e.usuarios.correo, correo)),
			)
			.limit(1);

		let usuario = porCorreo;
		if (!usuario) {
			[usuario] = await this.db
				.insert(e.usuarios)
				.values({
					tipo: "comprador",
					correo,
					contrasenaHash: null,
					correoVerificadoEn: new Date(),
				})
				.returning();
		} else if (!usuario.correoVerificadoEn) {
			[usuario] = await this.db
				.update(e.usuarios)
				.set({ correoVerificadoEn: new Date(), actualizadoEn: new Date() })
				.where(eq(e.usuarios.id, usuario.id))
				.returning();
		}

		await this.db
			.insert(e.identidadesExternas)
			.values({
				proveedor: "google",
				sujeto,
				usuarioId: usuario.id,
				correo,
			})
			.onConflictDoNothing();

		/* El perfil: si ya existía se respeta (puede traer dirección y nombre),
		   y si no, nace con el nombre que dio Google. */
		await this.db
			.insert(e.compradores)
			.values({
				id: usuario.id,
				correo,
				nombre: (r.name ?? r.given_name ?? "").slice(0, 80) || null,
			})
			.onConflictDoNothing();

		return usuario;
	}
}

function leerReclamos(idToken: string | undefined): Reclamos | null {
	const cuerpo = idToken?.split(".")[1];
	if (!cuerpo) return null;
	try {
		return JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
	} catch {
		return null;
	}
}
