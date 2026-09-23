/** Identidad verificada que los guards dejan en cada petición protegida. */
export type Identidad = {
	sub: string;
	correo: string;
	correoVerificado: boolean;
	grupos: string[];
};
