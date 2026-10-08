import { describe, expect, it } from "vitest";
import { exigirFotosReales } from "../taller/validacion";
import { vistaDeLinea } from "./vista-de-linea";

describe("vistaDeLinea", () => {
	it("prefiere la foto real del primer lado que la tenga", () => {
		const arte = [
			{ colocacion: "/a-colocacion.png", prenda: "/a-prenda.png" },
			{
				colocacion: "/b-colocacion.png",
				prenda: "/b-prenda.png",
				conPrenda: true,
			},
		];
		expect(vistaDeLinea(arte)).toBe("/b-prenda.png");
	});

	it("sin foto marcada usa la colocación y luego el respaldo", () => {
		expect(vistaDeLinea([{ colocacion: "/c.png", prenda: "/p.png" }])).toBe(
			"/c.png",
		);
		expect(vistaDeLinea(null, "/catalogo.png")).toBe("/catalogo.png");
	});
});

describe("exigirFotosReales", () => {
	const lados = [{ sideKey: "front" }, { sideKey: "back" }];
	const colores = [{ name: "Blanco" }, { name: "Negro" }];
	const foto = (lado: string, color: string) => ({
		lado,
		color,
		url: "/medios/x.png",
		esquinas: null,
		banda: null,
	});

	it("dice qué combinaciones faltan", () => {
		expect(() =>
			exigirFotosReales(lados, colores, [
				foto("front", "Blanco"),
				foto("back", "Blanco"),
			]),
		).toThrow(/front en Negro, back en Negro/);
	});

	it("pasa con todas, y no exige si el cuerpo no trae fotos", () => {
		const todas = ["front", "back"].flatMap((l) =>
			["Blanco", "Negro"].map((c) => foto(l, c)),
		);
		expect(() => exigirFotosReales(lados, colores, todas)).not.toThrow();
		expect(() => exigirFotosReales(lados, colores, undefined)).not.toThrow();
	});
});
