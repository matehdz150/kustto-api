/**
 * Prueba el alta de compradores por el CÓDIGO REAL: registrar, el código por
 * correo, verificar, reenviar, los topes y los casos que se prestan a abuso.
 *
 * EL CORREO NO SALE: se sustituye la cola por una lista, y de ahí se lee el
 * código como lo leería la persona. Así la prueba no depende del SMTP ni
 * compite con el worker de correo, que también está escuchando esa cola.
 */
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { eq, like } from "drizzle-orm";
import type IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { REDIS } from "../src/colas/colas.module";
import type { Correo } from "../src/correo/correo.service";
import { CuentasService } from "../src/cuentas/cuentas.service";
import { JwtService } from "../src/cuentas/jwt.service";
import { RegistroService } from "../src/cuentas/registro.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";

let fallos = 0;

function comprobar(que: string, bien: boolean, detalle = "") {
	console.log(
		`  ${bien ? "ok  " : "FALLA"}  ${que}${detalle ? ` — ${detalle}` : ""}`,
	);
	if (!bien) fallos++;
}

/** El `codigo` del error, que es lo que el front traduce. */
async function codigoDe(fn: () => Promise<unknown>) {
	try {
		await fn();
		return "(no lanzó)";
	} catch (error) {
		const r = (error as { getResponse?: () => any }).getResponse?.();
		return String(r?.codigo ?? r?.message ?? (error as Error).message);
	}
}

const meta = { ip: "198.51.100.23", agente: "probar-registro" };
const SUFIJO = `@prueba-registro-${Date.now()}.mx`;
const correo = (quien: string) => `${quien}${SUFIJO}`;

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});
	const db = app.get<Db>(DB);
	const redis = app.get<IORedis>(REDIS);
	const registro = app.get(RegistroService);
	const cuentas = app.get(CuentasService);
	const jwt = app.get(JwtService);

	const enviados: Correo[] = [];
	(registro as unknown as { correos: unknown }).correos = {
		add: async (_nombre: string, datos: Correo) => enviados.push(datos),
	};
	/** El último código que le llegó a esa dirección, leído del asunto. */
	const ultimoCodigo = (para: string) =>
		enviados
			.filter((c) => c.para === para)
			.at(-1)
			?.asunto.slice(0, 6) ?? "";
	/** Quita la espera entre envíos, que en una prueba sólo estorba. */
	const sinEspera = async () => {
		for (const k of await redis.keys("envio-*")) await redis.del(k);
	};

	try {
		if (!(await jwt.activo())) {
			throw new Error("Falta JWT_LLAVE_PRIVADA en el .env (pnpm auth:llave)");
		}

		/* ─── 1. Registrar ─────────────────────────────────────────────── */
		console.log("\n1. Registrar");

		const ana = correo("ana");
		const r = await registro.registrar(
			{
				nombre: "Ana",
				correo: ana.toUpperCase(),
				contrasena: "primera clave larga",
			},
			meta,
		);
		comprobar(
			"contesta ok con el correo normalizado",
			r.ok && r.correo === ana,
		);

		const [u] = await db
			.select()
			.from(e.usuarios)
			.where(eq(e.usuarios.correo, ana));
		comprobar(
			"la cuenta nace SIN verificar",
			!!u && u.correoVerificadoEn === null,
		);
		const [perfil] = await db
			.select()
			.from(e.compradores)
			.where(eq(e.compradores.id, u.id));
		comprobar("el perfil nace con el nombre", perfil?.nombre === "Ana");

		const mail = enviados.at(-1);
		const codigo = ultimoCodigo(ana);
		comprobar("sale un correo a esa dirección", mail?.para === ana);
		comprobar(
			"con el código en el asunto",
			/^\d{6} es tu código/.test(mail?.asunto ?? ""),
			mail?.asunto,
		);
		comprobar("y en el texto", !!mail?.texto?.includes(codigo));

		const [token] = await db
			.select()
			.from(e.tokensDeUnUso)
			.where(eq(e.tokensDeUnUso.usuarioId, u.id));
		comprobar(
			"el código no se guarda en claro",
			token.huella !== codigo && token.huella.length === 64,
		);

		comprobar(
			"sin verificar no entra (y lo dice)",
			(await codigoDe(() =>
				cuentas.entrar(
					"comprador",
					{ correo: ana, contrasena: "primera clave larga" },
					meta,
				),
			)) === "correo_sin_verificar",
		);

		comprobar(
			"otro registro en menos de un minuto: tope",
			(await codigoDe(() =>
				registro.registrar(
					{ nombre: "Ana", correo: ana, contrasena: "segunda clave larga" },
					meta,
				),
			)) === "limite",
		);
		const [trasElTope] = await db
			.select()
			.from(e.usuarios)
			.where(eq(e.usuarios.id, u.id));
		comprobar(
			"y el registro rechazado NO cambió la contraseña",
			trasElTope.contrasenaHash === u.contrasenaHash,
		);

		/* ─── 2. Alguien registra tu correo antes que tú ───────────────── */
		console.log("\n2. Registrar otra vez un correo sin verificar");

		await sinEspera();
		await registro.registrar(
			{
				nombre: "Ana de verdad",
				correo: ana,
				contrasena: "segunda clave larga",
			},
			meta,
		);
		comprobar(
			"el código anterior deja de valer",
			(await codigoDe(() =>
				registro.verificar({ correo: ana, codigo }, meta),
			)) === "codigo_invalido",
		);
		const [renombrado] = await db
			.select()
			.from(e.compradores)
			.where(eq(e.compradores.id, u.id));
		comprobar(
			"es la MISMA cuenta, con el nombre nuevo",
			renombrado?.nombre === "Ana de verdad",
		);

		/* ─── 3. Adivinar ──────────────────────────────────────────────── */
		console.log("\n3. Adivinar el código");

		const bueno = ultimoCodigo(ana);
		const malo = bueno === "000000" ? "111111" : "000000";

		/* Veinte a la vez: con el intento contado DESPUÉS de comparar, las veinte
		   leerían "0 intentos" y serían veinte oportunidades. */
		const rafaga = await Promise.all(
			Array.from({ length: 20 }, () =>
				codigoDe(() => registro.verificar({ correo: ana, codigo: malo }, meta)),
			),
		);
		const probados = rafaga.filter((c) => c === "codigo_invalido").length;
		comprobar(
			"veinte en paralelo: sólo se prueban los que quedaban (≤ 5)",
			probados <= 4,
			`${probados} probados, ${rafaga.filter((c) => c === "codigo_vencido").length} cortados`,
		);
		comprobar(
			"y después ni el código BUENO sirve",
			(await codigoDe(() =>
				registro.verificar({ correo: ana, codigo: bueno }, meta),
			)) === "codigo_vencido",
		);

		/* ─── 4. Reenviar y verificar ──────────────────────────────────── */
		console.log("\n4. Reenviar y verificar");

		await sinEspera();
		const antes = enviados.length;
		comprobar(
			"reenviar contesta ok",
			(await registro.reenviar({ correo: ana })).ok,
		);
		comprobar("y manda un código nuevo", enviados.length === antes + 1);

		const nadie = enviados.length;
		comprobar(
			"reenviar a un correo sin cuenta contesta IGUAL",
			(await registro.reenviar({ correo: correo("nadie") })).ok,
		);
		comprobar("pero no manda nada", enviados.length === nadie);

		const { emitidos, usuario } = await registro.verificar(
			{ correo: ana, codigo: ultimoCodigo(ana).replace(/(\d{3})/, "$1 ") },
			meta,
		);
		comprobar(
			"el código bueno verifica (aunque traiga un espacio)",
			usuario.correoVerificadoEn !== null,
		);
		const identidad = await jwt.verificar("comprador", emitidos.acceso);
		comprobar(
			"y abre la sesión, ya con el correo verificado",
			identidad.sub === u.id && identidad.correoVerificado,
		);

		comprobar(
			"verificar otra vez: ya está",
			(await codigoDe(() =>
				registro.verificar({ correo: ana, codigo: "123456" }, meta),
			)) === "ya_verificado",
		);
		comprobar(
			"registrar un correo ya verificado: ya existe",
			(await codigoDe(() =>
				registro.registrar(
					{ nombre: "Otra", correo: ana, contrasena: "tercera clave larga" },
					meta,
				),
			)) === "ya_existe",
		);

		comprobar(
			"entra con la contraseña del SEGUNDO registro",
			!!(
				await cuentas.entrar(
					"comprador",
					{ correo: ana, contrasena: "segunda clave larga" },
					meta,
				)
			).acceso,
		);
		comprobar(
			"y no con la del primero",
			(
				await codigoDe(() =>
					cuentas.entrar(
						"comprador",
						{ correo: ana, contrasena: "primera clave larga" },
						meta,
					),
				)
			).includes("incorrectos"),
		);

		/* ─── 5. Mudanza de Cognito ────────────────────────────────────── */
		console.log("\n5. Alguien de Cognito que todavía no está en usuarios");

		const beto = correo("beto");
		await db
			.insert(e.compradores)
			.values({ id: randomUUID(), correo: beto, nombre: "Beto" });
		comprobar(
			"no se le crea una segunda cuenta: ya existe",
			(await codigoDe(() =>
				registro.registrar(
					{ nombre: "Beto", correo: beto, contrasena: "una clave larga" },
					meta,
				),
			)) === "ya_existe",
		);

		/* ─── 6. Validaciones ──────────────────────────────────────────── */
		console.log("\n6. Validaciones");

		comprobar(
			"contraseña corta",
			(await codigoDe(() =>
				registro.registrar(
					{ nombre: "C", correo: correo("carla"), contrasena: "corta" },
					meta,
				),
			)) === "contrasena",
		);
		comprobar(
			"código de cinco dígitos",
			(await codigoDe(() =>
				registro.verificar({ correo: ana, codigo: "12345" }, meta),
			)) === "codigo_invalido",
		);
	} finally {
		await db
			.delete(e.compradores)
			.where(like(e.compradores.correo, `%${SUFIJO}`));
		await db.delete(e.usuarios).where(like(e.usuarios.correo, `%${SUFIJO}`));
		for (const k of await redis.keys("envio-*")) await redis.del(k);
		for (const k of await redis.keys(`entrar*${SUFIJO}`)) await redis.del(k);
		await redis.del(`registrar-ip:${meta.ip}`, `entrar-ip:${meta.ip}`);
		await app.close();
	}

	console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien.");
	process.exit(fallos ? 1 : 0);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
