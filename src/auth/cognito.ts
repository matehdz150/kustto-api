import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

/**
 * Quién es quien llega.
 *
 * `sub` es EL ID: es el de la tabla de talleres y el de la de compradores, y
 * no una equivalencia que haya que consultar. Viene de DynamoDB y se conserva
 * a propósito.
 */
export type Identidad = {
	sub: string;
	correo: string;
	correoVerificado: boolean;
	grupos: string[];
};

export type Pool = {
	nombre: "compradores" | "talleres" | "admins";
	region: string;
	poolId: string;
	clienteId: string;
};

/**
 * Las llaves públicas de un pool, cacheadas.
 *
 * `createRemoteJWKSet` las pide una vez y las refresca sola cuando aparece un
 * `kid` que no conoce. Una por pool, creada al arrancar: si se creara por
 * petición, cada token verificado sería una llamada a Cognito.
 */
const juegosDeLlaves = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function llavesDe(pool: Pool) {
	const emisor = emisorDe(pool);
	let juego = juegosDeLlaves.get(emisor);

	if (!juego) {
		juego = createRemoteJWKSet(new URL(`${emisor}/.well-known/jwks.json`));
		juegosDeLlaves.set(emisor, juego);
	}

	return juego;
}

function emisorDe(pool: Pool) {
	return `https://cognito-idp.${pool.region}.amazonaws.com/${pool.poolId}`;
}

/**
 * Verificar un token contra UN pool.
 *
 * COMPRUEBA EMISOR Y AUDIENCIA, no grupos, y ésa es toda la razón de que haya
 * tres pools en vez de uno con grupos dentro: con un solo pool, un token de
 * taller abriría `/cuenta/*` y la única defensa sería una comprobación de
 * grupo que alguien puede olvidar en una ruta nueva. Aquí olvidarla es
 * imposible: el guard elige el pool y un token del pool equivocado ni siquiera
 * pasa la firma.
 *
 * Lanza si el token no vale. Quien llama traduce eso a un 401.
 */
export async function verificar(pool: Pool, token: string): Promise<Identidad> {
	const { payload } = await jwtVerify(token, llavesDe(pool), {
		issuer: emisorDe(pool),
	});

	comprobarAudiencia(pool, payload);

	const sub = typeof payload.sub === "string" ? payload.sub : "";
	if (!sub) throw new Error("El token no trae `sub`");

	return {
		sub,
		correo: String(payload.email ?? "").toLowerCase(),
		correoVerificado: payload.email_verified === true,
		grupos: Array.isArray(payload["cognito:groups"])
			? (payload["cognito:groups"] as string[])
			: [],
	};
}

/**
 * La audiencia, que Cognito pone en dos sitios distintos.
 *
 * Un token de ID la trae en `aud`; uno de ACCESO la trae en `client_id` y deja
 * `aud` fuera. Comprobar sólo `aud` deja pasar cualquier token de acceso del
 * mismo pool —incluido el de otra app— y comprobar sólo `client_id` rechaza
 * todos los de ID. Hay que mirar los dos.
 */
function comprobarAudiencia(pool: Pool, payload: JWTPayload) {
	const aud = payload.aud;
	const enAud = Array.isArray(aud)
		? aud.includes(pool.clienteId)
		: aud === pool.clienteId;

	if (enAud || payload.client_id === pool.clienteId) return;

	throw new Error(`El token no es de este cliente (${pool.nombre})`);
}
