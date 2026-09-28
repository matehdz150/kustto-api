/**
 * EL CONTRATO DE BORDADO, GENERADO desde `@kustto/bordado` (kustto-web).
 *
 * Es el mismo trato a los dos lados de la frontera: el navegador prepara una
 * vista previa con estas reglas y esta API valida con las mismas.
 *
 * V6.2: YA NO ES UNA COPIA A MANO. `canonical`, `profile`, `types`,
 * `validation` y `original` los escribe
 * `kustto-web/scripts/bordado/exportar-nucleo.mts` byte a byte, con una
 * cabecera que lleva su sha256; `contrato.spec.ts` falla si alguien los edita
 * aquí. Para cambiarlos se cambia el paquete y se vuelve a generar. La copia
 * manual se había desfasado (le faltaban `estructura`, `beanRepeats` y
 * `verdad`) sin que nada lo dijera.
 *
 * `nucleo` es la versión del núcleo empaquetado en
 * `servicios/bordado/nucleo.cjs`: la única implementación de la preparación
 * (la misma que corre en el navegador), y la que decide aquí.
 */
export * from "./canonical";
export * from "./nucleo";
export * from "./original";
export * from "./profile";
export * from "./types";
export * from "./validation";
