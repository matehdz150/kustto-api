import { describe, expect, it } from "vitest";
import { centavosDelPaquete, repartirCentavos } from "./precio";

describe("precio de paquetes", () => {
	it("aplica el descuento propio y redondea una sola vez por conjunto", () => {
		expect(centavosDelPaquete(100.01, 10)).toBe(9001);
		expect(centavosDelPaquete(100.01, 10, 3)).toBe(27003);
		expect(centavosDelPaquete(0.01, 90)).toBe(1);
	});
	it("reparte cada centavo aunque las partidas no dividan exacto", () => {
		const partes = repartirCentavos(10001, [1, 1, 1]);
		expect(partes.reduce((a, b) => a + b, 0)).toBe(10001);
		expect(partes).toEqual([3334, 3333, 3334]);
	});
	it("funciona aun si los productos no tenían precio individual", () => {
		expect(repartirCentavos(999, [0, 0])).toEqual([500, 499]);
		expect(repartirCentavos(2, [1, 1, 1, 1])).toEqual([1, 0, 1, 0]);
	});
});
