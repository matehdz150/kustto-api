// GENERADO de kustto-web/packages/bordado/src/types.ts por scripts/bordado/exportar-nucleo.mts — NO EDITAR.
// sha256 del contenido: c921c44fba01b46eaf7a86590268f2e42786b97d525ea3bb6767375f082b098d
export const EMBROIDERY_SCHEMA_VERSION = 1 as const;
export const INKSTITCH_ENGINE_VERSION = "inkstitch-3.3.0" as const;

export const EMBROIDERY_STATUSES = [
	"QUEUED",
	"PROCESSING",
	"READY",
	"REVIEW",
	"REJECTED",
	"FAILED",
] as const;
export type EmbroideryStatus = (typeof EMBROIDERY_STATUSES)[number];
export type EmbroideryDecision = "accept" | "review" | "reject";

export type EmbroideryMetrics = {
	alphaCoverage?: number;
	colorEntropy?: number;
	edgeDensity?: number;
	texture?: number;
	gradientRatio?: number;
	componentCount: number;
	nodeCount: number;
	stitchCount?: number;
	colorCount?: number;
	colorChanges?: number;
	jumps?: number;
	trims?: number;
	widthMm?: number;
	heightMm?: number;
};

export type EmbroideryObject = {
	id: string;
	sourceObjectId: string;
	sourceType: "text" | "vector" | "raster";
	classification: "text" | "logo" | "icon" | "illustration" | "photo";
	colorId: string;
	geometry: {
		kind: "path";
		/** SVG path commands whose coordinates are already millimetres. */
		d: string;
		fillRule?: "nonzero" | "evenodd";
	};
	stitch: {
		type: "running" | "satin" | "fill";
		/** v2 usa un stroke. v3 usa dos rails y rungs dentro del mismo path. */
		satinMode?: "stroke" | "rails";
		strokeWidthMm?: number;
		angleDeg?: number;
		spacingMm?: number;
		maxStitchLengthMm?: number;
		underlay?: boolean;
		pullCompensationMm?: number;
		trimAfter?: boolean;
		/**
		 * Corrido: veces que se repasa cada puntada (0, una pasada; 1, triple o
		 * "bean"). Sin él, el motor cose triple, como siempre.
		 */
		beanRepeats?: 0 | 1 | 2;
		/**
		 * V6.6.0 — corrido: lo más que una puntada se aparta de su trazado
		 * (`running_stitch_tolerance_mm` de Ink/Stitch; sin él, 0.2 mm). Sólo en
		 * el eje ya regularizado de una estructura fina: ahí seguirlo de cerca
		 * redondea las curvas en vez de copiar ruido.
		 */
		toleranceMm?: number;
		/**
		 * V6.7.0 — corrido: `curvatura`, el motor pone la aguja (repartida por la
		 * curvatura del eje y centrada en él, ver `puntadas.py`) en vez de dejar
		 * que Ink/Stitch avance puntada a puntada. Sólo en el eje regularizado.
		 */
		placement?: "curvatura";
	};
	/**
	 * `travel`: no es dibujo, es el camino de la aguja entre dos objetos,
	 * escondido bajo lo que se cose después. El motor no lo cuenta como
	 * objeto del diseño (umbral de saltos).
	 */
	role?: "travel";
	/**
	 * V6.3: la identidad persistente del objeto y su linaje hasta la verdad
	 * estructural. `id` es estable (sale de su contenido, no de su posición
	 * en el orden de cosido): sobrevive al enrutador. El motor la usa para
	 * saber exactamente qué puntadas del DST son de qué estructura.
	 */
	identity?: ObjectIdentity;
	/** Diagnóstico geométrico previo al motor; no es una validación física. */
	quality?: {
		minWidthMm?: number;
		maxWidthMm?: number;
		averageWidthMm?: number;
		widthVariance?: number;
		widthVariationRatio?: number;
		angleVariance?: number;
		maxAngleDeltaDeg?: number;
		maxDirectionDeltaDeg?: number;
		junctionCount?: number;
		segmentIndex?: number;
		segmentCount?: number;
		representationDecision?: "stroke-v2" | "rails-v3";
		representationReasons?: string[];
		lengthMm?: number;
		curvatureDegPerMm?: number;
		maxCurvatureDegPerMm?: number;
		accumulatedTurningAngleDeg?: number;
		branchCount?: number;
		endpointTaper?: number;
		selfIntersectionRisk?: number;
		fanRisk?: number;
		railDivergenceMmPerMm?: number;
		railConvergenceMmPerMm?: number;
		numberOfSharpTurns?: number;
		rawCenterlineNodes?: number;
		rawRailNodes?: number;
		finalRailNodes?: number;
		rungsBefore?: number;
		rungsAfter?: number;
		underlayLayers?: number;
		estimatedUnderlayStitches?: number;
		join?: {
			gapMm: number;
			overlapMm: number;
			directionDeltaDeg: number;
			jumpIntroduced: boolean;
		};
	};
	/** Dependencias de capa que el optimizador de travel nunca puede cruzar. */
	dependencies?: string[];
	bounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
	nodeCount: number;
};

/**
 * Qué se le hizo al original para poder bordarlo.
 *
 * NO ES TELEMETRÍA. Es la prueba de que un raster pasó por preparación: sin
 * este bloque, `validateDesign` sigue rechazando cualquier objeto `raster`.
 * También es lo único que permite responder "por qué salió así" cuando un
 * taller devuelva una prenda dentro de seis meses, porque el PNG original no se
 * guarda junto al diseño.
 */
/** V6.3.1: qué le pasó a un grupo o pieza de la verdad hasta el IR. */
export type HistoriaDeLinajeContrato = {
	id: string;
	atomos: string[];
	destino: "preserved" | "split" | "merged" | "adapted" | "removed";
	etapa?: string;
	sucesos: Array<{ etapa: string; tipo: string; nodos: string[]; motivo?: string }>;
	regiones: string[];
	objetos: string[];
};

export type EmbroideryPreparation = {
	profileVersion: string;
	raster?: {
		/** Colores distintos del original, antes de tocar nada. */
		sourceColorCount: number;
		reducedColorCount: number;
		/** Cuánto se desvió la paleta reducida del original, en ΔE medio. */
		quantizationDeltaE: number;
		classification: "logo" | "illustration" | "photo";
		/** Regiones eliminadas por caer bajo el área mínima. */
		removedRegions: number;
		removedAreaMm2: number;
		hadAlpha: boolean;
		mmPorPx: number;
	};
	texto?: {
		satinColumns: number;
		runningPaths: number;
		fillAreas: number;
	};
	issues: EmbroideryIssue[];
	/**
	 * v5: el eje de cada estructura de la geometría fiel (una letra, un
	 * anillo, la rama de un icono), para que el motor compruebe en el DST que
	 * sigue cosida. `ejes` son paths de sólo rectas en mm del diseño.
	 * `uniones` (V6.3): donde se juntan tres o más ramas, en mm.
	 */
	/**
	 * V6.6.0: la regularización óptica de las columnas finas (ver
	 * `vector/regularizar.ts`): en cuántas regiones se aplicó, cuáles se
	 * descartaron y por qué, y lo más que se movió un eje (mm).
	 */
	regularizacion?: { regiones: number; descartadas: string[]; desvioMaxMm: number };
	/** V6.5.0: la política física por ancho con la que se decidieron las estructuras finas (sin calibrar en tela). */
	thinStructurePolicy?: {
		runningMaxWidthMm: number;
		narrowSatinMinWidthMm: number;
		narrowSatinMaxWidthMm: number;
		satinMinWidthMm: number;
		fillMinWidthMm: number;
		maxExpansionMm: number;
		maxExpansionRatio: number;
	};
	estructura?: Array<{
		id: string;
		ejes: string[];
		largoMm: number;
		uniones?: Array<[number, number]>;
		/**
		 * V6.5.0 — la estructura fina (ThinStructure): clase, perfil de ancho,
		 * extremos, lazos y counters del grafo de trazos; las piezas de la
		 * verdad de las que sale, su importancia y cómo llegó al IR (recall de
		 * eje, lo perdido, el ensanche que impone el hilo, sus veredictos).
		 */
		clase?: "AREA" | "LINEAR" | "MIXED";
		anchoMm?: { minimo: number; mediana: number; maximo: number };
		extremos?: Array<[number, number]>;
		lazos?: number;
		counters?: number;
		importancia?: "essential" | "supporting" | "decorative";
		piezas?: string[];
		ir?: {
			recall: number;
			perdidoMm: number;
			huecoMaxMm: number;
			anchoAntesMm?: number;
			anchoDespuesMm?: number;
			expansionMm?: number;
			expansionRatio?: number;
			incidencias: string[];
		};
	}>;
	/**
	 * V6.1: la verdad estructural del ORIGINAL de cada fuente (el SVG antes
	 * de normalizar; la imagen antes de vectorizar), para que el motor
	 * compruebe en el DST que sus piezas y counters siguen ahí. Sólo lo
	 * estructural; `enIR` dice cómo llegó al IR (el motor sólo juzga lo que
	 * llegó entero: lo demás ya es una incidencia de la preparación).
	 */
	verdad?: Array<{
		id: string;
		origen: "svg" | "raster";
		resolucionMm: number;
		componentes: Array<{
			id: string;
			/** Puntos interiores en mm del diseño. */
			sondas: Array<[number, number]>;
			anchoMm: number;
			incierto: boolean;
			enIR: "conservada" | "divergente";
		}>;
		counters: Array<{
			id: string;
			polo: [number, number];
			anchoMm: number;
			incierto: boolean;
			enIR: "conservada" | "divergente";
		}>;
		/** Si se recortó la lista por tamaño. */
		truncado?: boolean;
		/** Suma de control de la imagen de la verdad (V6.2: para comparar cliente y servidor). */
		huella?: string;
		/** V6.3: los counters que tiene el IR (nivel tinta): polo y ancho. */
		countersIR?: Array<{ polo: [number, number]; anchoMm: number }>;
		/** β0/β1 (piezas y counters, nivel tinta) del original y de cada frontera. */
		betti?: Array<{ frontera: string; componentes: number; counters: number }>;
		/**
		 * V6.4.3: la verdad como malla, para medir COBERTURA en el DST: por celda (mm del
		 * documento), la pieza de tinta y el color que se ve (`verdad/malla.ts`). Viajan todas
		 * las piezas, también los detalles no estructurales.
		 */
		malla?: {
			x0: number;
			y0: number;
			paso: number;
			ancho: number;
			alto: number;
			/** Rachas (valor, largo) en varints y base64; valor k → `piezas[k − 1]`, 0 = tela. */
			capaPiezas: string;
			/** Igual; valor k → `colores[k − 1]`, 0 = tela. */
			capaColores: string;
			piezas: Array<{
				id: string;
				estructural: boolean;
				incierto: boolean;
				motivos?: string[];
				anchoMm: number;
				areaMm2: number;
			}>;
			/** Con un SVG, los colores de la verdad; con una imagen (V6.5.0), el hilo de cada tinta o "mezcla". */
			colores: string[];
			/** V6.5.0 (imagen): confianza de la evidencia de color, 0–100 por celda, mismas rachas. */
			capaConfianzaColor?: string;
		};
	}>;
	/**
	 * V6.3.1: el linaje exacto verdad → IR de cada fuente. Los nodos son los
	 * átomos de la verdad (raíces) y cada región del pipeline, con sus
	 * padres; los objetos del IR son nodos con su `identity.id`. Por grupo y
	 * por pieza de la verdad, su historia: qué le pasó hasta el IR.
	 */
	linaje?: Array<{
		id: string;
		nodos: Array<{
			id: string;
			etapa: string;
			padres: string[];
			accion?: string;
			baja?: { etapa: string; motivo: string };
			atomo?: { capa: number; color: string; clase: "visible" | "oculto" };
			/** V6.3.2 (raster): componente de la imagen, raíz del linaje. */
			componente?: { tinta: string; pixeles: number; tipo: string | null };
		}>;
		grupos: HistoriaDeLinajeContrato[];
		piezas: HistoriaDeLinajeContrato[];
		/** Objetos donde el solape de la V6.3 decía otros grupos o piezas (diagnóstico). */
		divergencias: number;
		/** V6.3.2 (raster): objetos donde el mapeo por celdas de V6.3.1 daba otras piezas (diagnóstico). */
		divergenciasVectorizacion?: number;
	}>;
	/**
	 * V6.2: con qué se hizo ESTA preparación, cuando la hace el servidor. Sin
	 * esto (o si la trae un navegador) la preparación no es autoritativa.
	 */
	autoridad?: AutoridadDelServidor;
};

/** Lo que identifica una preparación hecha por el servidor: algoritmo, perfil y hashes. */
export type AutoridadDelServidor = {
	algoritmo: string;
	/** sha256 del código del núcleo que preparó (el bundle generado de este paquete + `preparar`). */
	nucleo: string;
	profileVersion: string;
	engineVersion: string;
	/** sha256 del original canónico, ya validado. */
	originalHash: string;
	/** sha256 del diseño canónico preparado, sin este bloque. */
	designHash: string;
	/** sha256 de la verdad estructural que viaja al motor (canónica). */
	verdadHash: string;
};

/** El linaje de un objeto del IR (V6.3). */
export type ObjectIdentity = {
	/** Estable y único en el diseño: `ir-…` (o `tr-…` para un traslado). */
	id: string;
	/**
	 * Los grupos estructurales de la verdad que cose (los `id` de
	 * `preparation.estructura`, más los grupos que son área). Varios si
	 * nació de una fusión deliberada; ninguno sólo en un traslado.
	 */
	groups: string[];
	/** Las piezas de la verdad (nivel tinta, `preparation.verdad[].componentes`) que cose. */
	pieces: string[];
	/**
	 * De qué nació: la región normalizada (`rg-…`) que se partió en este y
	 * sus hermanos, o, en un traslado, los dos objetos que une.
	 */
	parents: string[];
	role?: "travel";
};

export type EmbroideryDesign = {
	schemaVersion: typeof EMBROIDERY_SCHEMA_VERSION;
	sourceSnapshotHash: string;
	productId: string;
	sideId: string;
	physical: { widthMm: number; heightMm: number };
	bounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
	colors: Array<{
		id: string;
		sourceHex: string;
		displayHex: string;
		order: number;
	}>;
	objects: EmbroideryObject[];
	metrics: EmbroideryMetrics;
	preparation?: EmbroideryPreparation;
	profileVersion: string;
	engineVersion: string;
};

export type EmbroideryIssue = {
	code: string;
	message: string;
	/**
	 * `info` no cambia el estado: es un dato para el taller —un relleno
	 * grande, por ejemplo— que no hace el diseño menos fabricable.
	 */
	severity: "review" | "reject" | "info";
	/** Las cifras que respaldan el mensaje, si las hay. */
	metrics?: Record<string, number>;
	/**
	 * V6.2: quién la afirma. Sólo las `SERVER_*` deciden el estado; las del
	 * navegador (`CLIENT_PREVIEW`) se guardan como diagnóstico. Sin campo, la
	 * dejó una preparación anterior a V6.2 (o el navegador).
	 */
	source?: IssueSource;
};

/**
 * De dónde sale una incidencia.
 *
 * - `SERVER_STRUCTURAL`: la preparación que hace el servidor desde el original
 *   (verdad estructural, topología, ejes, avisos del lector y del raster).
 * - `SERVER_DST`: las comprobaciones del motor sobre el DST.
 * - `SERVER_ENGINE`: el análisis del motor antes de coser (foto, textura…).
 * - `SERVER_VALIDATION`: la frontera del servidor (p. ej. sin original).
 * - `SERVER_DIAGNOSTIC`: datos para el taller que no cambian el estado.
 * - `CLIENT_PREVIEW`: lo que calculó el navegador; nunca decide.
 */
export type IssueSource =
	| "SERVER_STRUCTURAL"
	| "SERVER_DST"
	| "SERVER_ENGINE"
	| "SERVER_VALIDATION"
	| "SERVER_DIAGNOSTIC"
	| "CLIENT_PREVIEW";

export type EmbroideryJobPublic = {
	jobId: string;
	designHash: string;
	status: EmbroideryStatus;
	decision?: EmbroideryDecision;
	confidence?: number;
	previewUrl?: string;
	issues: EmbroideryIssue[];
	metrics?: EmbroideryMetrics;
	/** V6.2: el sha256 del original canónico que se preparó (el editor lo compara con el suyo). */
	originalHash?: string;
	/** V6.9.2: lo que ya se puede enseñar mientras el trabajo sigue. */
	stages?: EmbroideryStages;
};

/**
 * V6.9.2 — LO QUE EL PREVISUALIZADOR DEL EDITOR ENSEÑA MIENTRAS SE PREPARA, en
 * el orden en que existe. Cada etapa es del MISMO trabajo que da el DST del
 * taller: la forma en colores de hilo, las puntadas reales del primer cosido
 * (provisionales: validar y reparar puede cambiarlas, casi nunca lo hace) y el
 * bordado definitivo. URLs firmadas y efímeras; `ms`, desde que empezó el trabajo.
 */
export type EmbroideryStages = {
	/** La forma de cada imagen vectorizada, en colores de hilo (SVG). */
	shape?: { urls: string[]; ms: number };
	/** Los colores de hilo del diseño preparado. */
	colors?: string[];
	/** Las puntadas del primer cosido (PNG). */
	stitches?: { url: string; ms: number; provisional: boolean };
	/** El bordado definitivo (PNG). */
	final?: { url: string; ms: number };
};
