/**
 * El esquema entero, en un solo sitio.
 *
 * Es el equivalente de lo que en DynamoDB era el reparto del espacio de
 * llaves: la decisión más cara de deshacer, y por eso vive junta y no
 * desperdigada por los módulos.
 */
export * from "./catalogo";
export * from "./compradores";
export * from "./comun";
export * from "./paquetes";
export * from "./pedidos";
export * from "./talleres";
