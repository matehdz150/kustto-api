import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NUCLEO_VERSION } from "./contrato";

/**
 * V6.2 — el contrato y el núcleo del API SON GENERADOS desde kustto-web
 * (`scripts/bordado/exportar-nucleo.mts`). Si alguien edita uno a mano, este
 * test falla: para cambiarlos se cambia el paquete y se vuelve a generar.
 * Así web, API y motor no vuelven a representar formatos distintos.
 */

const GENERADOS = [
	"canonical.ts",
	"profile.ts",
	"types.ts",
	"validation.ts",
	"original.ts",
];

describe("contrato generado", () => {
	it.each(GENERADOS)("%s no se editó a mano", (archivo) => {
		const texto = readFileSync(join(__dirname, "contrato", archivo), "utf8");
		const [primera, segunda, ...resto] = texto.split("\n");
		expect(primera).toContain(
			`GENERADO de kustto-web/packages/bordado/src/${archivo}`,
		);
		const esperado = segunda.match(/sha256 del contenido: ([0-9a-f]{64})/)?.[1];
		expect(createHash("sha256").update(resto.join("\n")).digest("hex")).toBe(
			esperado,
		);
	});

	it("el núcleo empaquetado es el de la versión que usa el API", () => {
		const version = JSON.parse(
			readFileSync(
				join(__dirname, "../../servicios/bordado/nucleo.version.json"),
				"utf8",
			),
		).nucleo;
		expect(version).toBe(NUCLEO_VERSION);
		const bundle = readFileSync(
			join(__dirname, "../../servicios/bordado/nucleo.cjs"),
			"utf8",
		);
		expect(bundle.slice(0, 400)).toContain(NUCLEO_VERSION);
	});
});
