/**
 * Las colas del sistema, nombradas en un solo sitio.
 *
 * Una cadena mal escrita en un `new Queue("corrreo")` no falla: crea otra cola
 * y los trabajos se quedan ahí sin que nadie los mire. Ya pasó con una cola de
 * SQS.
 */
export const COLAS = {
	/** Los avisos al comprador y al taller. */
	correo: "correo",
	/**
	 * Cotizar con la paquetería.
	 *
	 * VA EN COLA Y NO EN LA PETICIÓN aunque ahora haya servidor: tarda ~5 s y
	 * Skydropx admite 2 por segundo. Siete clics en "+1" tumbaron el checkout
	 * una vez; el limitador de la cola es lo que impide que vuelva a pasar.
	 */
	envios: "envios",
	/** El archivo de producción que descarga el taller. */
	impresion: "impresion",
	/**
	 * La digitalización de bordado.
	 *
	 * La consume un proceso TS que vive en la imagen de Ink/Stitch y llama al
	 * binario de Python. Apagada hasta que haya test-sew (`BORDADO_ACTIVO`).
	 */
	bordado: "bordado",
} as const;

export type NombreDeCola = (typeof COLAS)[keyof typeof COLAS];
