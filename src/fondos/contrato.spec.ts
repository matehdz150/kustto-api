import { describe, expect, it } from "vitest";
import {
	claveDeEntrada,
	claveDeSalida,
	leerPedido,
	MAX_BYTES,
} from "./contrato";

describe("contrato de quitar fondo", () => {
	it("acepta JPG y PNG dentro del tope", () => {
		expect(leerPedido({ tipo: "image/jpeg", bytes: 1000 })).toEqual({
			ok: true,
			pedido: { tipo: "image/jpeg", bytes: 1000 },
		});
		expect(leerPedido({ tipo: "image/png", bytes: MAX_BYTES }).ok).toBe(true);
	});

	it("rechaza otros tipos y tamaños fuera del tope", () => {
		expect(leerPedido({ tipo: "image/webp", bytes: 10 }).ok).toBe(false);
		expect(leerPedido({ tipo: "image/png", bytes: MAX_BYTES + 1 }).ok).toBe(
			false,
		);
		expect(leerPedido({ tipo: "image/png", bytes: 0 }).ok).toBe(false);
		expect(leerPedido({ tipo: "image/png", bytes: "10" }).ok).toBe(false);
		expect(leerPedido(null).ok).toBe(false);
	});

	/* La Lambda cambia `input/` por `output/` y la extensión por `.png`: si las
	   dos claves no coinciden así, el resultado nunca se encontraría. */
	it("las claves siguen la ruta que escribe la Lambda", () => {
		const id = "0b7c3f2e-8a51-4d3b-9f0e-1c2d3e4f5a6b";
		expect(claveDeEntrada(id, "jpg")).toBe(`input/web/${id}.jpg`);
		expect(claveDeSalida(id)).toBe(`output/web/${id}.png`);
	});
});
