/** Cálculo monetario único para ficha y checkout: centavos enteros. */
export function centavosDelPaquete(
	precioBase: number,
	descuentoPorcentaje: number,
	cantidad = 1,
) {
	return (
		Math.max(1, Math.round(precioBase * (100 - descuentoPorcentaje))) * cantidad
	);
}

/** Reparte el precio entre partidas sin perder ni crear centavos por redondeo. */
export function repartirCentavos(total: number, pesos: number[]) {
	const suma = pesos.reduce((a, b) => a + b, 0);
	let acumulado = 0;
	let repartido = 0;
	return pesos.map((peso, i) => {
		acumulado += suma ? peso : 1;
		const objetivo =
			i === pesos.length - 1
				? total
				: Math.round((total * acumulado) / (suma || pesos.length));
		const parte = objetivo - repartido;
		repartido = objetivo;
		return parte;
	});
}
