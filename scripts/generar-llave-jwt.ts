/**
 * Genera una llave Ed25519 para firmar los JWT de sesión.
 *
 *   pnpm auth:llave
 *
 * Imprime DOS líneas: la privada, que va en `JWT_LLAVE_PRIVADA` (un secreto,
 * al gestor de secretos del servidor), y la pública, que es lo que irá en
 * `JWT_LLAVE_ANTERIOR` el día que se rote.
 *
 * EL `kid` ES LA FECHA para que al rotar se sepa de un vistazo cuál es cuál.
 */
import { exportJWK, generateKeyPair } from "jose";

async function principal() {
	const { privateKey, publicKey } = await generateKeyPair("EdDSA", {
		crv: "Ed25519",
		extractable: true,
	});

	const kid = new Date().toISOString().slice(0, 10);
	const privada = { ...(await exportJWK(privateKey)), kid, alg: "EdDSA" };
	const publica = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA" };

	console.log(`JWT_LLAVE_PRIVADA=${JSON.stringify(privada)}`);
	console.log(`# pública, para JWT_LLAVE_ANTERIOR al rotar:`);
	console.log(`# ${JSON.stringify(publica)}`);
}

principal();
