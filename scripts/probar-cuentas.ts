/**
 * Prueba las cuentas propias por el CÓDIGO REAL: entrar, renovar, la ventana
 * de gracia, la detección de robo, los topes y la lista de bloqueo.
 *
 * Necesita JWT_LLAVE_PRIVADA (`pnpm auth:llave`). Crea usuarios de prueba y
 * los borra al final, con sus sesiones y sus contadores de Redis.
 */
import { NestFactory } from "@nestjs/core";
import { eq, like } from "drizzle-orm";
import type IORedis from "ioredis";
import { AppModule } from "../src/app.module";
import { REDIS } from "../src/colas/colas.module";
import { CuentasService } from "../src/cuentas/cuentas.service";
import { JwtService } from "../src/cuentas/jwt.service";
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

async function falla(
	que: string,
	fn: () => Promise<unknown>,
	esperado: string,
) {
	try {
		await fn();
		comprobar(que, false, "no lanzó");
	} catch (error) {
		const r = (error as { getResponse?: () => unknown }).getResponse?.();
		const m = `${(error as Error).message} ${JSON.stringify(r ?? "")}`;
		comprobar(que, m.includes(esperado), m.slice(0, 95));
	}
}

const meta = { ip: "203.0.113.7", agente: "probar-cuentas" };
const SUFIJO = `@prueba-cuentas-${Date.now()}.mx`;
const correo = (quien: string) => `${quien}${SUFIJO}`;

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});
	const db = app.get<Db>(DB);
	const redis = app.get<IORedis>(REDIS);
	const cuentas = app.get(CuentasService);
	const sesiones = app.get(SesionesService);
	const jwt = app.get(JwtService);

	try {
		if (!(await jwt.activo())) {
			throw new Error("Falta JWT_LLAVE_PRIVADA en el .env (pnpm auth:llave)");
		}

		/* ─── 1. Crear ─────────────────────────────────────────────────── */
		console.log("\n1. Crear cuentas");

		const ana = await cuentas.crear("comprador", {
			correo: correo("Ana"),
			contrasena: "una contraseña larga",
			verificado: true,
		});
		comprobar(
			"el correo se guarda en minúsculas",
			ana.correo === correo("ana"),
		);
		comprobar(
			"la contraseña se guarda como argon2id",
			!!ana.contrasenaHash?.startsWith("$argon2id$"),
		);

		await falla(
			"el mismo correo y tipo no se repite",
			() =>
				cuentas.crear("comprador", {
					correo: correo("ana"),
					contrasena: "otra más larga",
				}),
			"Ya hay una cuenta",
		);
		const anaTaller = await cuentas.crear("taller", {
			correo: correo("ana"),
			contrasena: "la del taller va aparte",
		});
		comprobar(
			"pero sí como otro tipo (eran dos pools)",
			anaTaller.id !== ana.id,
		);
		await falla(
			"contraseña corta",
			() =>
				cuentas.crear("comprador", {
					correo: correo("beto"),
					contrasena: "corta",
				}),
			"al menos 8",
		);
		await cuentas.crear("comprador", {
			correo: correo("sinverificar"),
			contrasena: "una contraseña larga",
		});

		/* ─── 2. Entrar ────────────────────────────────────────────────── */
		console.log("\n2. Entrar");

		await falla(
			"contraseña equivocada",
			() =>
				cuentas.entrar(
					"comprador",
					{ correo: correo("ana"), contrasena: "no es" },
					meta,
				),
			"Correo o contraseña incorrectos",
		);
		await falla(
			"cuenta que no existe: el MISMO mensaje",
			() =>
				cuentas.entrar(
					"comprador",
					{ correo: correo("nadie"), contrasena: "no es" },
					meta,
				),
			"Correo o contraseña incorrectos",
		);
		await falla(
			"la contraseña del comprador no abre el taller",
			() =>
				cuentas.entrar(
					"taller",
					{ correo: correo("ana"), contrasena: "una contraseña larga" },
					meta,
				),
			"Correo o contraseña incorrectos",
		);
		await falla(
			"sin verificar: se dice, para llevarlo al código",
			() =>
				cuentas.entrar(
					"comprador",
					{
						correo: correo("sinverificar"),
						contrasena: "una contraseña larga",
					},
					meta,
				),
			"correo_sin_verificar",
		);

		const t1 = Date.now();
		await cuentas
			.entrar(
				"comprador",
				{ correo: correo("nadie2"), contrasena: "no es" },
				meta,
			)
			.catch(() => {});
		const sinCuenta = Date.now() - t1;
		const t2 = Date.now();
		await cuentas
			.entrar(
				"comprador",
				{ correo: correo("ana"), contrasena: "tampoco" },
				meta,
			)
			.catch(() => {});
		const conCuenta = Date.now() - t2;
		comprobar(
			"no existir tarda lo mismo que fallar (argon2 corre igual)",
			sinCuenta > conCuenta * 0.5,
			`${sinCuenta} ms contra ${conCuenta} ms`,
		);

		const emitidos = await cuentas.entrar(
			"comprador",
			{ correo: correo("ana"), contrasena: "una contraseña larga" },
			meta,
		);
		const identidad = await jwt.verificar("comprador", emitidos.acceso);
		comprobar(
			"el JWT lleva su id y el correo verificado",
			identidad.sub === ana.id && identidad.correoVerificado,
		);
		await falla(
			"un JWT de comprador NO vale como taller (audiencia)",
			() => jwt.verificar("taller", emitidos.acceso),
			"aud",
		);
		const [sesion] = await db
			.select()
			.from(e.sesiones)
			.where(eq(e.sesiones.id, identidad.sid));
		comprobar(
			"la sesión guarda IP y agente",
			sesion?.ip === meta.ip && sesion?.agente === meta.agente,
		);
		comprobar(
			"el token de renovación se guarda como huella",
			(
				await db
					.select()
					.from(e.tokensDeRenovacion)
					.where(eq(e.tokensDeRenovacion.huella, emitidos.renovacion))
			).length === 0,
		);

		/* ─── 3. Renovar ───────────────────────────────────────────────── */
		console.log("\n3. Renovar");

		const r1 = await sesiones.renovar("comprador", emitidos.renovacion, meta);
		comprobar("renovar entrega un par nuevo", r1.tipo === "nuevos");
		const par2 = r1.tipo === "nuevos" ? r1.emitidos : null;
		comprobar(
			"el token de renovación rota",
			!!par2 && par2.renovacion !== emitidos.renovacion,
		);

		const repetido = await sesiones.renovar(
			"comprador",
			emitidos.renovacion,
			meta,
		);
		comprobar(
			"el viejo dentro de la ventana: gracia, sin revocar",
			repetido.tipo === "gracia",
		);
		comprobar(
			"y la sesión sigue viva",
			!(await sesiones.bloqueada(identidad.sid)),
		);

		await falla(
			"la cookie de renovación del comprador no renueva un taller",
			() => sesiones.renovar("taller", par2!.renovacion, meta),
			"Vuelve a entrar",
		);

		/* Dos pestañas a la vez con el MISMO token. */
		const [a, b] = await Promise.all([
			sesiones.renovar("comprador", par2!.renovacion, meta),
			sesiones.renovar("comprador", par2!.renovacion, meta),
		]);
		comprobar(
			"dos a la vez: una renueva y la otra cae en gracia",
			[a.tipo, b.tipo].sort().join() === "gracia,nuevos",
			`${a.tipo} / ${b.tipo}`,
		);
		const par3 = (a.tipo === "nuevos" ? a : b.tipo === "nuevos" ? b : null)
			?.emitidos;

		/* ─── 4. Robo ──────────────────────────────────────────────────── */
		console.log("\n4. Un token de renovación reutilizado");

		/* Se hace pasar el token de hace dos vueltas por viejo: gastado hace un
		   minuto, fuera de la ventana de gracia. */
		const [viejo] = await db
			.select()
			.from(e.tokensDeRenovacion)
			.where(eq(e.tokensDeRenovacion.sesionId, identidad.sid))
			.orderBy(e.tokensDeRenovacion.creadoEn)
			.limit(1);
		await db
			.update(e.tokensDeRenovacion)
			.set({ usadoEn: new Date(Date.now() - 60_000) })
			.where(eq(e.tokensDeRenovacion.id, viejo.id));

		await falla(
			"reutilizar uno gastado fuera de la ventana",
			() => sesiones.renovar("comprador", emitidos.renovacion, meta),
			"Vuelve a entrar",
		);
		const [revocada] = await db
			.select()
			.from(e.sesiones)
			.where(eq(e.sesiones.id, identidad.sid));
		comprobar(
			"revoca la sesión entera",
			revocada.motivoRevocacion === "reutilizacion",
		);
		comprobar(
			"y la bloquea en Redis al instante",
			await sesiones.bloqueada(identidad.sid),
		);
		await falla(
			"el token bueno de esa sesión tampoco sirve ya",
			() => sesiones.renovar("comprador", par3!.renovacion, meta),
			"Vuelve a entrar",
		);

		/* ─── 5. Salir y desactivar ────────────────────────────────────── */
		console.log("\n5. Salir y desactivar");

		const otra = await cuentas.entrar(
			"comprador",
			{ correo: correo("ana"), contrasena: "una contraseña larga" },
			meta,
		);
		const sidOtra = (await jwt.verificar("comprador", otra.acceso)).sid;
		await sesiones.revocar(sidOtra, "salir");
		comprobar(
			"salir bloquea el JWT aunque no haya caducado",
			await sesiones.bloqueada(sidOtra),
		);

		const tercera = await cuentas.entrar(
			"comprador",
			{ correo: correo("ana"), contrasena: "una contraseña larga" },
			meta,
		);
		await db
			.update(e.usuarios)
			.set({ desactivadoEn: new Date() })
			.where(eq(e.usuarios.id, ana.id));
		await falla(
			"desactivado: ya no renueva",
			() => sesiones.renovar("comprador", tercera.renovacion, meta),
			"Vuelve a entrar",
		);
		await falla(
			"ni entra, con el mismo mensaje de siempre",
			() =>
				cuentas.entrar(
					"comprador",
					{ correo: correo("ana"), contrasena: "una contraseña larga" },
					meta,
				),
			"Correo o contraseña incorrectos",
		);

		/* ─── 6. Topes ─────────────────────────────────────────────────── */
		console.log("\n6. Topes de intentos");

		await cuentas.crear("comprador", {
			correo: correo("carla"),
			contrasena: "una contraseña larga",
			verificado: true,
		});
		const otroMeta = { ...meta, ip: "203.0.113.99" };
		for (let i = 0; i < 5; i++) {
			await cuentas
				.entrar(
					"comprador",
					{ correo: correo("carla"), contrasena: `mal ${i}` },
					otroMeta,
				)
				.catch(() => {});
		}
		await falla(
			"al sexto intento se corta, aunque la contraseña sea buena",
			() =>
				cuentas.entrar(
					"comprador",
					{ correo: correo("carla"), contrasena: "una contraseña larga" },
					otroMeta,
				),
			"Demasiados intentos",
		);
	} finally {
		await db.delete(e.usuarios).where(like(e.usuarios.correo, `%${SUFIJO}`));
		for (const clave of await redis.keys(`entrar*${SUFIJO}`))
			await redis.del(clave);
		for (const ip of ["203.0.113.7", "203.0.113.99"])
			await redis.del(`entrar-ip:${ip}`);
		await app.close();
	}

	console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien.");
	process.exit(fallos ? 1 : 0);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
