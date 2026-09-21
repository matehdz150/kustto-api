/**
 * EL CONTRATO DE BORDADO, copiado de `@kustto/bordado` (que vive en
 * kustto-web).
 *
 * Es el mismo trato a los dos lados de la frontera: el navegador PREPARA el
 * diseño con estas reglas y esta API lo VALIDA con las mismas. Si divergen, el
 * editor manda algo que aquí se rechaza —o peor, algo que se acepta y el motor
 * no sabe coser.
 *
 * SE COPIA SÓLO LO QUE LA API NECESITA: el contrato (tipos, perfil, hash
 * canónico y validación). El resto del paquete —la geometría, el satín, la
 * planificación de puntada— son 3.200 líneas que sólo corren en el navegador
 * al preparar, y traerlas aquí sería arrastrar un motor que esta API no usa.
 *
 * ES UNA COPIA Y NO UN IMPORT porque web y api son dos repos. Igual que
 * `src/precios`: aceptado a propósito y con fecha de caducidad. SI TOCAS UNA,
 * TOCA LA OTRA — y aquí importa más que en precios, porque el `designHash` se
 * calcula en los dos lados y tiene que dar lo mismo.
 */
export * from "./canonical";
export * from "./profile";
export * from "./types";
export * from "./validation";
