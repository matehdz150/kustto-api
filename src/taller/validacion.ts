import { BadRequestException } from "@nestjs/common";

type Cuerpo = Record<string, any>;

/**
 * Las técnicas que sabemos producir.
 *
 * SE COMPRUEBA AUNQUE EL EDITOR YA FALLE SEGURO. Una técnica que no reconoce
 * se lee como ráster y el taller recibe el PNG de siempre, así que nada se
 * rompe — pero este campo decide QUÉ ARCHIVO se produce, y el cuerpo de la
 * petición se puede escribir a mano. Vale más rechazarlo que guardar una
 * palabra que nadie va a poder interpretar dentro de un año.
 *
 * LA LISTA ESTÁ DUPLICADA, a propósito y con desgana: la de verdad vive en
 * `lib/impresion/tecnicas.ts` del front, que además dice qué implica cada una,
 * pero web y api son dos repos. Si entra una técnica nueva, hay que tocar los
 * dos sitios.
 */
const TECNICAS = new Set([
	"dtf",
	"serigrafia",
	"sublimacion",
	"uv",
	"laser",
	"bordado",
]);

/**
 * SIN TÉCNICA SE PASA. Todo lo dado de alta antes de que este campo existiera
 * viene sin ella, y exigirla dejaría a esos productos sin poder editarse hasta
 * que alguien los repase uno por uno.
 */
export function validarTecnicas(lados: Cuerpo[]) {
	for (const lado of lados) {
		const tecnica = lado?.tecnica;
		if (tecnica === undefined || tecnica === null || tecnica === "") continue;

		if (typeof tecnica !== "string" || !TECNICAS.has(tecnica)) {
			throw new BadRequestException(`No conocemos la técnica "${String(tecnica)}"`);
		}
	}
}

/**
 * El recargo de un lado.
 *
 * ES UN CAMPO DE PRECIO, y por eso se comprueba aquí aunque el cálculo ya
 * ignore lo que no sea un número positivo. Un negativo guardado no descontaría
 * nada —el cálculo lo trata como cero— pero dejaría al taller creyendo que
 * puso un descuento, y lo descubriría cobrando de menos.
 *
 * Ausente es legítimo: significa "cobra el recargo general".
 */
export function validarRecargos(lados: Cuerpo[]) {
	for (const lado of lados) {
		const r = lado?.recargo;
		if (r === undefined || r === null || r === "") continue;

		const n = Number(r);
		if (!Number.isFinite(n) || n < 0) {
			throw new BadRequestException(
				`El recargo del lado "${String(lado?.sideKey ?? "?")}" tiene que ser un número de 0 en adelante.`,
			);
		}
	}
}

export type FotoReal = {
	lado: string;
	color: string;
	url: string;
	esquinas: { x: number; y: number }[] | null;
	banda: Record<string, number> | null;
};

/**
 * Las fotos de la prenda de verdad, con el cuadro donde cae lo impreso.
 *
 * PARA QUÉ. El diseño se veía sobre el mockup —un dibujo plano de la prenda— y
 * eso no contesta la pregunta con la que alguien paga: cómo va a quedar. Con
 * una foto real y el cuadro marcado, el arte se proyecta encima.
 *
 * UNA FOTO POR LADO **Y POR COLOR**, y no una sola tintable. Al mockup se le
 * puede cambiar el color porque es una prenda clara sobre fondo blanco que se
 * recorta y se multiplica; una foto con modelo o de una prenda ya oscura no
 * admite ese tratamiento —teñiría también la cara—.
 *
 * LAS ESQUINAS VAN EN FRACCIONES DE 0 A 1, nunca en píxeles. La misma foto se
 * pinta a 700 px en el editor, a 120 en una miniatura y a lo que mida el
 * teléfono; guardar píxeles ataría el cuadro a la resolución con la que se
 * marcó y bastaría recomprimir la foto para descuadrarlo.
 *
 * SON CUATRO Y EN ORDEN —arriba-izquierda, arriba-derecha, abajo-derecha,
 * abajo-izquierda—, no un rectángulo: sobre una prenda de verdad la tela cae y
 * el torso va en ángulo, y un rectángulo recto se lee como calcomanía pegada.
 *
 * O `banda` EN VEZ DE `esquinas`, para lo cilíndrico: ahí el cuadro no es un
 * cuadrilátero sino una franja que envuelve, con su bombeo.
 *
 * LA RUTA TIENE QUE SER NUESTRA (`/medios/…`). Es la misma regla que los
 * mockups: la composición se hace en un lienzo del navegador y una imagen de
 * otro origen lo contamina. Además evita que un cuerpo manipulado cuelgue una
 * imagen ajena dentro de la ficha pública.
 */
export function validarFotosReales(crudas: unknown): FotoReal[] {
	if (!Array.isArray(crudas)) {
		throw new BadRequestException(
			"Las fotos de la prenda tienen que venir en una lista",
		);
	}

	/* El tope existe para que un cuerpo enorme no se guarde entero, no para
	   racionar: ocho colores en dos lados con cuatro fotos cada uno son 64, y
	   eso ya es un producto fotografiado con mucho cariño. */
	if (crudas.length > 120) {
		throw new BadRequestException(
			"Demasiadas fotos de prenda en un solo producto",
		);
	}

	return crudas.map((cruda) => {
		const f = (cruda ?? {}) as Cuerpo;
		const lado = String(f.lado ?? "").trim();
		const color = String(f.color ?? "").trim();
		const url = String(f.url ?? "").trim();

		if (!lado) {
			throw new BadRequestException("Una foto de prenda no dice de qué lado es");
		}
		if (!color) {
			throw new BadRequestException(
				`La foto del lado "${lado}" no dice de qué color es`,
			);
		}
		if (!url.startsWith("/medios/")) {
			throw new BadRequestException(
				`La foto del lado "${lado}" tiene que estar subida aquí, no enlazada de fuera`,
			);
		}

		const esquinas = leerEsquinas(f.esquinas, lado);
		const banda = f.banda ? (f.banda as Record<string, number>) : null;

		if (!esquinas && !banda) {
			throw new BadRequestException(
				`La foto del lado "${lado}" no dice dónde cae lo impreso`,
			);
		}

		return { lado, color, url, esquinas, banda };
	});
}

function leerEsquinas(valor: unknown, lado: string) {
	if (!Array.isArray(valor) || valor.length === 0) return null;

	if (valor.length !== 4) {
		throw new BadRequestException(
			`El cuadro del lado "${lado}" tiene que llevar cuatro esquinas`,
		);
	}

	return valor.map((p) => {
		const x = Number((p as Cuerpo)?.x);
		const y = Number((p as Cuerpo)?.y);

		/* Fuera de 0..1 significa píxeles, y eso ata el cuadro a la resolución
		   con la que se marcó. Ver el comentario de arriba. */
		if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) {
			throw new BadRequestException(
				`Las esquinas del lado "${lado}" van en fracciones de 0 a 1`,
			);
		}

		return { x, y };
	});
}
