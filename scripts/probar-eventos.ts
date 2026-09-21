/**
 * Prueba los eventos por el CÓDIGO REAL, del organizador al invitado.
 *
 * El diseño del invitado se sube A S3 DE VERDAD: es la única forma de
 * comprobar que la participación rechaza un diseño firmado pero nunca subido,
 * y acepta el que sí está. Al final se borra lo subido y el evento de prueba.
 */
import { NestFactory } from "@nestjs/core";
import { eq, ne } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { AlmacenService } from "../src/almacen/almacen.service";
import { PerfilService } from "../src/cuenta/perfil.service";
import { DB, type Db } from "../src/db/db.module";
import * as e from "../src/db/esquema";
import { EventosPublicoService } from "../src/eventos/eventos-publico.service";
import { EventosService } from "../src/eventos/eventos.service";
import { ArteService } from "../src/subidas/arte.service";

let fallos = 0;

function comprobar(que: string, bien: boolean, detalle = "") {
	console.log(`  ${bien ? "ok  " : "FALLA"}  ${que}${detalle ? ` — ${detalle}` : ""}`);
	if (!bien) fallos++;
}

async function falla(que: string, fn: () => Promise<unknown>, esperado: string) {
	try {
		await fn();
		comprobar(que, false, "no lanzó");
	} catch (error) {
		const m = (error as Error).message ?? "";
		comprobar(que, m.includes(esperado), m.slice(0, 95));
	}
}

async function subir(uploadUrl: string, cuerpo: string, tipo: string) {
	const res = await fetch(uploadUrl, {
		method: "PUT",
		headers: { "content-type": tipo },
		body: cuerpo,
	});
	if (!res.ok) throw new Error(`S3 respondió ${res.status}`);
}

async function principal() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error"],
	});

	const db = app.get<Db>(DB);
	const eventos = app.get(EventosService);
	const publico = app.get(EventosPublicoService);
	const perfil = app.get(PerfilService);
	const almacen = app.get(AlmacenService);
	const arte = app.get(ArteService);

	const quien = {
		sub: `prueba-eventos-${Date.now()}`,
		correo: `eventos.${Date.now()}@kustto.mx`,
		correoVerificado: true,
		grupos: [] as string[],
	};
	await perfil.guardar(quien, { nombre: "Prueba" });

	const activos = await db.select().from(e.productos).where(eq(e.productos.estado, "activo"));
	const producto = activos[0];
	const mismoTaller = activos.find((p) => p.id !== producto.id && p.tallerId === producto.tallerId);
	const otroTaller = activos.find((p) => p.tallerId !== producto.tallerId);
	const [precio] = await db
		.select()
		.from(e.productoPrecios)
		.where(eq(e.productoPrecios.productoId, producto.id));
	const [inactivo] = await db
		.select()
		.from(e.productos)
		.where(ne(e.productos.estado, "activo"))
		.limit(1);

	const hora = 3600 * 1000;
	const direccion = {
		calle: "Reforma",
		numero: "100",
		colonia: "Juárez",
		ciudad: "CDMX",
		estado: "CDMX",
		cp: "06600",
	};
	const datos = (extra: Record<string, unknown> = {}) => ({
		nombre: "Evento de prueba",
		abreEn: new Date(Date.now() - hora).toISOString(),
		cierraEn: new Date(Date.now() + 24 * hora).toISOString(),
		direccion,
		productos: [producto.id, ...(mismoTaller ? [mismoTaller.id] : [])],
		...extra,
	});

	const subidasHechas: string[] = [];
	let eventoId = "";

	try {
		/* ─── 1. Validaciones ─────────────────────────────────────────── */
		console.log("\n1. Validaciones al crear");

		await falla("sin nombre", () => eventos.crear(quien, datos({ nombre: "" })), "nombre");
		await falla(
			"cierre antes de apertura",
			() => eventos.crear(quien, datos({ cierraEn: new Date(Date.now() - 2 * hora).toISOString() })),
			"posterior",
		);
		await falla(
			"dirección incompleta",
			() => eventos.crear(quien, datos({ direccion: { calle: "x" } })),
			"Completa la dirección",
		);
		await falla(
			"seis productos",
			() => eventos.crear(quien, datos({ productos: Array(6).fill(0).map(() => crypto.randomUUID()) })),
			"Elige entre 1 y 5",
		);
		if (inactivo) {
			await falla(
				"producto no publicado",
				() => eventos.crear(quien, datos({ productos: [inactivo.id] })),
				"ya no está publicado",
			);
		}
		if (otroTaller) {
			await falla(
				"productos de dos talleres",
				() => eventos.crear(quien, datos({ productos: [producto.id, otroTaller.id] })),
				"mismo taller",
			);
		}
		await falla(
			"portada en carpeta ajena",
			() => eventos.crear(quien, datos({ imagen: `/medios/eventos/otro/${crypto.randomUUID()}.png` })),
			"foto no es válida",
		);

		/* ─── 2. Borrador ─────────────────────────────────────────────── */
		console.log("\n2. Borrador");

		const creado = await eventos.crear(quien, datos());
		eventoId = creado.id;
		comprobar("nace en borrador", creado.estado === "borrador");
		comprobar("código opaco de 12", creado.codigo.length === 12, creado.codigo);
		comprobar(
			"instantánea con precio de la base",
			creado.productos[0].precioDesde === Number(precio?.precioBase ?? 0),
			String(creado.productos[0].precioDesde),
		);
		comprobar("personalización libre por defecto", creado.productos[0].personalizacion === "libre");
		comprobar("no trae participaciones", !("participaciones" in creado));

		await falla("el enlace de un borrador no existe", () => publico.obtener(creado.codigo), "no existe");

		const item = creado.productos[0];
		const editado = await eventos.actualizar(quien, eventoId, datos({ nombre: "Renombrado" }));
		comprobar("editar conserva el id del renglón", editado.productos[0].id === item.id);
		comprobar("editar cambia el nombre", editado.nombre === "Renombrado");

		const ajeno = { ...quien, sub: "otro-organizador" };
		await falla("otro organizador no lo ve", () => eventos.obtener(ajeno, eventoId), "no existe");

		/* ─── 3. Personalización y publicación ───────────────────────── */
		console.log("\n3. Personalización y publicación");

		await eventos.configurarProducto(quien, eventoId, item.id, { personalizacion: "bloqueada" });
		await falla("bloqueada sin base no publica", () => eventos.publicar(quien, eventoId), "diseño base");

		const arteId = crypto.randomUUID();
		const conBase = await eventos.configurarProducto(quien, eventoId, item.id, {
			personalizacion: "bloqueada",
			arteId,
		});
		comprobar(
			"la ruta de la base la arma el servidor",
			conBase.productos[0].disenoBase?.ruta === `/medios/plantillas/${quien.sub}/${arteId}/diseno.json`,
		);
		await falla(
			"regla inventada",
			() => eventos.configurarProducto(quien, eventoId, item.id, { personalizacion: "todo" }),
			"regla de personalización",
		);
		if (mismoTaller) {
			await eventos.configurarProducto(quien, eventoId, conBase.productos[1].id, {
				personalizacion: "sin_personalizacion",
			});
		}

		const publicado = await eventos.publicar(quien, eventoId);
		comprobar("publicado", publicado.estado === "publicado" && "publicadoEn" in publicado);
		await falla("publicar dos veces", () => eventos.publicar(quien, eventoId), "ya fue publicado");
		await falla("editar publicado", () => eventos.actualizar(quien, eventoId, datos()), "ya no puede");
		await falla("borrar publicado", () => eventos.borrar(quien, eventoId), "borrador");

		/* ─── 4. El invitado ─────────────────────────────────────────── */
		console.log("\n4. El invitado");

		const visto = await publico.obtener(creado.codigo);
		comprobar("abierto", visto.estado === "abierto");
		comprobar(
			"la calle no viaja en el enlace",
			!JSON.stringify(visto).includes("Reforma"),
			JSON.stringify(visto.entrega),
		);

		if (mismoTaller) {
			await falla(
				"sin_personalizacion no firma subidas",
				() =>
					publico.firmarSubidas(creado.codigo, {
						eventoItemId: conBase.productos[1].id,
						archivos: [{ tipo: "diseno", bytes: 10 }],
					}),
				"no admite personalización",
			);
		}

		const cuerpoDiseno = JSON.stringify({ capas: [] });
		const firmado = await publico.firmarSubidas(creado.codigo, {
			eventoItemId: item.id,
			archivos: [{ tipo: "diseno", bytes: Buffer.byteLength(cuerpoDiseno) }],
		});
		const rutaDiseno = firmado.subidas[0].ruta;
		comprobar(
			"el arte cae bajo evento y producto",
			rutaDiseno === `/eventos/${eventoId}/${item.id}/${firmado.itemId}/diseno.json`,
			rutaDiseno,
		);

		const participacion = (extra: Record<string, unknown> = {}, linea: Record<string, unknown> = {}) => ({
			intentoId: crypto.randomUUID(),
			participante: { nombre: "Invitada", email: "Invitada@Kustto.mx " },
			lineas: [
				{
					eventoItemId: item.id,
					talla: item.tallas[0],
					color: item.colores[0]?.nombre ?? "",
					piezas: 2,
					diseno: { carritoId: firmado.itemId },
					precio: 1,
					...linea,
				},
			],
			...extra,
		});

		await falla(
			"diseño firmado pero no subido",
			() => publico.participar(creado.codigo, participacion()),
			"no terminó de subir",
		);

		await subir(firmado.subidas[0].uploadUrl, cuerpoDiseno, "application/json");
		subidasHechas.push(rutaDiseno.slice(1));

		await falla(
			"talla que no existe",
			() => publico.participar(creado.codigo, participacion({}, { talla: "XXXXL" })),
			"talla",
		);
		await falla(
			"diseño de otro producto",
			() => publico.participar(creado.codigo, participacion({}, { diseno: { carritoId: crypto.randomUUID() } })),
			"no pertenece",
		);
		await falla(
			"correo inválido",
			() => publico.participar(creado.codigo, participacion({ participante: { nombre: "x", email: "x" } })),
			"correo válido",
		);

		const envio = participacion();
		const hecha = await publico.participar(creado.codigo, envio);
		const esperado = Math.round(Number(precio?.precioBase ?? 0) * 2 * 100) / 100;
		comprobar("el precio sale de la base, no del cuerpo", hecha.subtotal === esperado, String(hecha.subtotal));
		comprobar("correo normalizado", (hecha.participante as any).email === "invitada@kustto.mx");
		comprobar("pago pendiente", hecha.estadoPago === "pendiente");

		const otraVez = await publico.participar(creado.codigo, envio);
		const cuantas = (
			await db
				.select()
				.from(e.eventoParticipaciones)
				.where(eq(e.eventoParticipaciones.eventoId, eventoId))
		).length;
		comprobar("reintentar no duplica", otraVez.id === hecha.id && cuantas === 1, `${cuantas} guardadas`);

		const sinDiseno = await publico.participar(creado.codigo, participacion({}, { diseno: null }));
		comprobar(
			"sin diseño se queda con la base",
			(sinDiseno.lineas as any[])[0].diseno?.arteId === arteId,
		);

		const panel = await eventos.obtener(quien, eventoId);
		comprobar("el organizador ve las participaciones", panel.participaciones.length === 2);

		/* ─── 5. Cierre ──────────────────────────────────────────────── */
		console.log("\n5. Cierre");

		await eventos.cerrar(quien, eventoId);
		comprobar("cerrado en el enlace", (await publico.obtener(creado.codigo)).estado === "cerrado");
		await falla(
			"cerrado no acepta participaciones",
			() => publico.participar(creado.codigo, participacion({}, { diseno: null })),
			"no está recibiendo",
		);

		/* ─── 6. Subidas sueltas ─────────────────────────────────────── */
		console.log("\n6. Subidas sueltas");

		const portada = await eventos.firmarFoto(quien, { tipo: "image/png", bytes: 100 });
		comprobar("portada en la carpeta del organizador", portada.url.startsWith(`/medios/eventos/${quien.sub}/`));
		await falla("portada SVG", () => eventos.firmarFoto(quien, { tipo: "image/svg+xml", bytes: 10 }), "no se puede usar");

		const carrito = await arte.firmar({ archivos: [{ tipo: "arte", lado: "frente", bytes: 10 }] });
		comprobar(
			"carrito público firma bajo carritos/",
			carrito.subidas[0].ruta === `/carritos/${carrito.itemId}/frente-arte.png`,
			carrito.subidas[0].ruta,
		);
	} finally {
		for (const clave of subidasHechas) await almacen.borrar(clave);
		if (eventoId) await db.delete(e.eventos).where(eq(e.eventos.id, eventoId));
		await db.delete(e.compradores).where(eq(e.compradores.id, quien.sub));
		await app.close();
	}

	console.log(fallos ? `\n${fallos} FALLAS` : "\nTodo bien.");
	process.exit(fallos ? 1 : 0);
}

principal().catch((error) => {
	console.error(error);
	process.exit(1);
});
