/**
 * Prueba "olvidé mi contraseña" por el CÓDIGO REAL.
 *
 * Como en `probar-registro`, el correo no sale: la cola se sustituye por una
 * lista y el enlace se lee del texto del correo, como lo abriría la persona.
 */
import { NestFactory } from "@nestjs/core";
import { eq, like } from "drizzle-orm";
import type IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { REDIS } from "../src/colas/colas.module";
import type { Correo } from "../src/correo/correo.service";
import { CuentasService } from "../src/cuentas/cuentas.service";
import { JwtService } from "../src/cuentas/jwt.service";
import { RestablecerService } from "../src/cuentas/restablecer.service";
import { SesionesService } from "../src/cuentas/sesiones.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

let fallos = 0;

function comprobar(que: string, bien: boolean, detalle = "") {
	console.log(
		`  ${bien ? "ok  " : "FALLA"}  ${que}${detalle ? ` — ${detalle}` : ""}`,
	);
	if (!bien) fallos++;
}

async function codigoDe(fn: () => Promise<unknown>) {
	try {
		await fn();
		return "(no lanzó)";
	} catch (error) {
		const r = (error as { getResponse?: () => any }).getResponse?.();
		return String(r?.codigo ?? r?.message ?? (error as Error).message);
	}
}

const meta = { ip: "192.0.2.44", agente: "probar-restablecer" };
const SUFIJO = `@prueba-restablecer-${Date.now()}.mx`;
const correo = (quien: string) => `${quien}${SUFIJO}`;

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});
	const db = app.get<Db>(DB);
	const redis = app.get<IORedis>(REDIS);
	const restablecer = app.get(RestablecerService);
	const cuentas = app.get(CuentasService);
	const sesiones = app.get(SesionesService);
	const jwt = app.get(JwtService);

	const enviados: Correo[] = [];
	(restablecer as unknown as { correos: unknown }).correos = {
		add: async (_nombre: string, datos: Correo) => enviados.push(datos),
	};
	const para = (direccion: string) =>
		enviados.filter((c) => c.para === direccion);
	/** El token, sacado del enlace del correo como lo sacaría la página. */
	const tokenDe = (c: Correo | undefined) =>
		decodeURIComponent(
			c?.texto?.match(/#tipo=[^&]+&token=([^\s]+)/)?.[1] ?? "",
		);
	const sinEspera = async () => {
		for (const k of await redis.keys("envio-*")) await redis.del(k);
	};
	const entrar = (direccion: string, contrasena: string) =>
		cuentas.entrar("comprador", { correo: direccion, contrasena }, meta);

	try {
		if (!(await jwt.activo())) {
			throw new Error("Falta JWT_LLAVE_PRIVADA en el .env (pnpm auth:llave)");
		}

		const ana = correo("ana");
		const cuenta = await cuentas.crear("comprador", {
			correo: ana,
			contrasena: "la de siempre",
			verificado: true,
		});
		const sesionA = await jwt.verificar(
			"comprador",
			(await entrar(ana, "la de siempre")).acceso,
		);
		const sesionB = await jwt.verificar(
			"comprador",
			(await entrar(ana, "la de siempre")).acceso,
		);

		/* ─── 1. Pedir el enlace ───────────────────────────────────────── */
		console.log("\n1. Pedir el enlace");

		comprobar(
			"contesta ok",
			(await restablecer.olvide("comprador", { correo: ana }, meta)).ok,
		);
		const mail = para(ana).at(-1);
		const token = tokenDe(mail);
		comprobar(
			"sale un correo con un enlace",
			!!mail && token.length > 40,
			mail?.asunto,
		);
		comprobar(
			"el token va en el FRAGMENTO, no en la query",
			!!mail?.texto?.includes("/restablecer#tipo=comprador&token="),
		);
		const [guardado] = await db
			.select()
			.from(e.tokensDeUnUso)
			.where(eq(e.tokensDeUnUso.usuarioId, cuenta.id));
		comprobar(
			"no se guarda en claro",
			guardado.huella !== token && guardado.proposito === "restablecer",
		);

		const antes = enviados.length;
		comprobar(
			"a un correo sin cuenta contesta IGUAL",
			(await restablecer.olvide("comprador", { correo: correo("nadie") }, meta))
				.ok,
		);
		comprobar("pero no manda nada", enviados.length === antes);
		comprobar(
			"otra vez al mismo correo en menos de un minuto: tope",
			(await codigoDe(() =>
				restablecer.olvide("comprador", { correo: ana }, meta),
			)) === "limite",
		);
		comprobar(
			"y el correo SIN cuenta también topa: el 429 no delata nada",
			(await codigoDe(() =>
				restablecer.olvide("comprador", { correo: correo("nadie") }, meta),
			)) === "limite",
		);

		/* ─── 2. Comprobar ─────────────────────────────────────────────── */
		console.log("\n2. Comprobar el enlace sin gastarlo");

		const c = await restablecer.comprobar("comprador", { token });
		comprobar("dice a qué correo es", c.correo === ana);
		comprobar(
			"un enlace de comprador no sirve para el taller",
			(await codigoDe(() => restablecer.comprobar("taller", { token }))) ===
				"enlace_invalido",
		);
		comprobar(
			"uno inventado tampoco",
			(await codigoDe(() =>
				restablecer.comprobar("comprador", { token: "x".repeat(43) }),
			)) === "enlace_invalido",
		);

		/* ─── 3. Restablecer ───────────────────────────────────────────── */
		console.log("\n3. Restablecer");

		comprobar(
			"contraseña corta",
			(await codigoDe(() =>
				restablecer.restablecer(
					"comprador",
					{ token, contrasena: "corta" },
					meta,
				),
			)) === "contrasena",
		);
		comprobar(
			"y el enlace sigue sirviendo después de ese error",
			(await restablecer.comprobar("comprador", { token })).ok,
		);

		const r = await restablecer.restablecer(
			"comprador",
			{ token, contrasena: "una nueva y larga" },
			meta,
		);
		const nueva = await jwt.verificar("comprador", r.emitidos.acceso);
		comprobar("abre una sesión nueva", nueva.sub === cuenta.id);
		comprobar(
			"y cierra TODAS las anteriores al instante",
			(await sesiones.bloqueada(sesionA.sid)) &&
				(await sesiones.bloqueada(sesionB.sid)),
		);
		comprobar("pero no la nueva", !(await sesiones.bloqueada(nueva.sid)));
		comprobar(
			"avisa por correo que la contraseña cambió",
			para(ana).at(-1)?.asunto === "Tu contraseña de Kustto cambió",
		);
		comprobar(
			"entra con la nueva",
			!!(await entrar(ana, "una nueva y larga")).acceso,
		);
		comprobar(
			"y no con la vieja",
			(await codigoDe(() => entrar(ana, "la de siempre"))).includes(
				"incorrectos",
			),
		);
		comprobar(
			"el enlace ya usado no sirve otra vez",
			(await codigoDe(() =>
				restablecer.restablecer(
					"comprador",
					{ token, contrasena: "otra más larga" },
					meta,
				),
			)) === "enlace_invalido",
		);

		/* ─── 4. Sólo vale el último, y vence ──────────────────────────── */
		console.log("\n4. Sólo vale el último enlace, y vence");

		await sinEspera();
		await restablecer.olvide("comprador", { correo: ana }, meta);
		const primero = tokenDe(para(ana).at(-1));
		await sinEspera();
		await restablecer.olvide("comprador", { correo: ana }, meta);
		const segundo = tokenDe(para(ana).at(-1));
		comprobar(
			"pedir otro mata el anterior",
			(await codigoDe(() =>
				restablecer.comprobar("comprador", { token: primero }),
			)) === "enlace_invalido",
		);
		await db
			.update(e.tokensDeUnUso)
			.set({ expiraEn: new Date(Date.now() - 1000) })
			.where(eq(e.tokensDeUnUso.usuarioId, cuenta.id));
		comprobar(
			"y pasada la hora ya no sirve",
			(await codigoDe(() =>
				restablecer.comprobar("comprador", { token: segundo }),
			)) === "enlace_invalido",
		);

		/* ─── 5. El mismo enlace en dos pestañas ───────────────────────── */
		console.log("\n5. El mismo enlace dos veces a la vez");

		await sinEspera();
		await restablecer.olvide("comprador", { correo: ana }, meta);
		const doble = tokenDe(para(ana).at(-1));
		const resultados = await Promise.all([
			codigoDe(() =>
				restablecer.restablecer(
					"comprador",
					{ token: doble, contrasena: "pestaña uno larga" },
					meta,
				),
			),
			codigoDe(() =>
				restablecer.restablecer(
					"comprador",
					{ token: doble, contrasena: "pestaña dos larga" },
					meta,
				),
			),
		]);
		comprobar(
			"sólo una cambia la contraseña",
			resultados.filter((x) => x === "(no lanzó)").length === 1 &&
				resultados.includes("enlace_invalido"),
			resultados.join(" / "),
		);

		/* ─── 6. Quien viene de Cognito ────────────────────────────────── */
		console.log("\n6. Una cuenta sin contraseña (como las de Cognito)");

		const beto = correo("beto");
		await db.insert(e.usuarios).values({ tipo: "comprador", correo: beto });
		comprobar(
			"sin contraseña no entra, con el mensaje de siempre",
			(await codigoDe(() => entrar(beto, "cualquier cosa larga"))).includes(
				"incorrectos",
			),
		);
		await restablecer.olvide("comprador", { correo: beto }, meta);
		const rb = await restablecer.restablecer(
			"comprador",
			{
				token: tokenDe(para(beto).at(-1)),
				contrasena: "mi primera contraseña",
			},
			meta,
		);
		comprobar("la crea con el enlace", !!rb.usuario.contrasenaHash);
		comprobar(
			"y el enlace le verifica el correo",
			rb.usuario.correoVerificadoEn !== null,
		);
		comprobar(
			"ya entra con ella",
			!!(await entrar(beto, "mi primera contraseña")).acceso,
		);

		/* ─── 7. Bloqueado por intentos ────────────────────────────────── */
		console.log("\n7. Quien se bloqueó por intentos");

		const carla = correo("carla");
		await cuentas.crear("comprador", {
			correo: carla,
			contrasena: "no me acuerdo",
			verificado: true,
		});
		for (let i = 0; i < 6; i++)
			await codigoDe(() => entrar(carla, `intento ${i}`));
		comprobar(
			"está bloqueada",
			(await codigoDe(() => entrar(carla, "no me acuerdo"))) === "limite",
		);
		await restablecer.olvide("comprador", { correo: carla }, meta);
		await restablecer.restablecer(
			"comprador",
			{ token: tokenDe(para(carla).at(-1)), contrasena: "ahora sí me acuerdo" },
			meta,
		);
		comprobar(
			"restablecer le quita el bloqueo: entra con la nueva",
			!!(await entrar(carla, "ahora sí me acuerdo")).acceso,
		);

		/* ─── 8. Desactivado ───────────────────────────────────────────── */
		console.log("\n8. Una cuenta desactivada");

		const dora = correo("dora");
		const d = await cuentas.crear("comprador", {
			correo: dora,
			contrasena: "una contraseña larga",
			verificado: true,
		});
		await db
			.update(e.usuarios)
			.set({ desactivadoEn: new Date() })
			.where(eq(e.usuarios.id, d.id));
		const previos = enviados.length;
		comprobar(
			"contesta igual",
			(await restablecer.olvide("comprador", { correo: dora }, meta)).ok,
		);
		comprobar("y no manda enlace", enviados.length === previos);
	} finally {
		await db.delete(e.usuarios).where(like(e.usuarios.correo, `%${SUFIJO}`));
		for (const k of await redis.keys("envio-*")) await redis.del(k);
		for (const k of await redis.keys(`entrar*${SUFIJO}`)) await redis.del(k);
		await redis.del(`olvide-ip:${meta.ip}`, `entrar-ip:${meta.ip}`);
		await app.close();
	}

	console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien.");
	process.exit(fallos ? 1 : 0);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
