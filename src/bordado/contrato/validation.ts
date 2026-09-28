// GENERADO de kustto-web/packages/bordado/src/validation.ts por scripts/bordado/exportar-nucleo.mts — NO EDITAR.
// sha256 del contenido: 48cbbfabf3cb2742022d9b2afcf5049840dfbacf4fc66e263a634d0b427175ed
import { type EmbroideryProfile, profileByVersion } from "./profile";
import {
	EMBROIDERY_SCHEMA_VERSION,
	type EmbroideryDesign,
	type EmbroideryIssue,
	INKSTITCH_ENGINE_VERSION,
} from "./types";

const PATH_SAFE = /^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/;
const HEX = /^#[0-9a-f]{6}$/i;

function finiteBox(
	box: EmbroideryDesign["bounds"] | undefined,
	physical: EmbroideryDesign["physical"],
): boolean {
	return (
		box !== undefined &&
		[box.xMm, box.yMm, box.widthMm, box.heightMm].every(Number.isFinite) &&
		box.xMm >= -0.1 &&
		box.yMm >= -0.1 &&
		box.widthMm > 0 &&
		box.heightMm > 0 &&
		box.xMm + box.widthMm <= physical.widthMm + 0.1 &&
		box.yMm + box.heightMm <= physical.heightMm + 0.1
	);
}

export function validateDesign(
	value: unknown,
): asserts value is EmbroideryDesign {
	if (!value || typeof value !== "object") throw new Error("INVALID_DESIGN");
	const d = value as Partial<EmbroideryDesign>;
	if (d.schemaVersion !== EMBROIDERY_SCHEMA_VERSION)
		throw new Error("UNSUPPORTED_SCHEMA");
	if (d.engineVersion !== INKSTITCH_ENGINE_VERSION)
		throw new Error("UNSUPPORTED_ENGINE");
	const profile = profileByVersion(String(d.profileVersion ?? ""));
	if (!profile) throw new Error("UNSUPPORTED_PROFILE");
	if (!d.productId || !d.sideId || !/^[a-zA-Z0-9_-]{1,100}$/.test(d.sideId))
		throw new Error("INVALID_SCOPE");
	if (!d.sourceSnapshotHash || !/^[a-f0-9]{64}$/i.test(d.sourceSnapshotHash))
		throw new Error("INVALID_SOURCE_HASH");
	if (!d.physical || !(d.physical.widthMm > 0) || !(d.physical.heightMm > 0))
		throw new Error("INVALID_DIMENSIONS");
	if (
		d.physical.widthMm > profile.limits.maxWidthMm ||
		d.physical.heightMm > profile.limits.maxHeightMm
	)
		throw new Error("DIMENSIONS_EXCEEDED");
	if (!finiteBox(d.bounds, d.physical)) throw new Error("INVALID_BOUNDS");
	// La preparación describe con qué reglas se generó la geometría; si dijera
	// otra versión que el diseño, no se sabría cuál de las dos se aplicó.
	if (
		d.preparation !== undefined &&
		d.preparation.profileVersion !== d.profileVersion
	)
		throw new Error("PREPARATION_MISMATCH");
	if (
		!Array.isArray(d.colors) ||
		d.colors.length < 1 ||
		d.colors.length > profile.limits.maxColors
	)
		throw new Error("INVALID_COLORS");
	if (
		d.colors.some(
			(c) => !c.id || !HEX.test(c.sourceHex) || !HEX.test(c.displayHex),
		)
	)
		throw new Error("INVALID_COLORS");
	if (
		!Array.isArray(d.objects) ||
		d.objects.length < 1 ||
		d.objects.length > profile.limits.maxObjects
	)
		throw new Error("INVALID_OBJECTS");
	for (const object of d.objects) {
		if (
			!object.id ||
			!object.sourceObjectId ||
			!d.colors.some((color) => color.id === object.colorId)
		)
			throw new Error("INVALID_OBJECT");
		/* Un raster sigue prohibido A MENOS que el diseño traiga el bloque de
		   preparación: es lo que distingue una geometría que salió de segmentar y
		   medir la imagen en milímetros de un `<image>` colado tal cual. La regla
		   no se relaja, se le pone una prueba. */
		if (object.sourceType === "raster" && d.preparation?.raster === undefined)
			throw new Error("RASTER_NOT_PREPARED");
		if (
			object.geometry?.kind !== "path" ||
			!object.geometry.d ||
			object.geometry.d.length > 200_000 ||
			!PATH_SAFE.test(object.geometry.d)
		)
			throw new Error("UNSAFE_GEOMETRY");
		if (!finiteBox(object.bounds, d.physical))
			throw new Error("INVALID_OBJECT_BOUNDS");
		if (!(["running", "satin", "fill"] as const).includes(object.stitch?.type))
			throw new Error("INVALID_STITCH");
		if (
			object.stitch.spacingMm !== undefined &&
			(!Number.isFinite(object.stitch.spacingMm) ||
				object.stitch.spacingMm < 0.2 ||
				object.stitch.spacingMm > 2)
		)
			throw new Error("INVALID_STITCH_SPACING");
		if (
			object.stitch.maxStitchLengthMm !== undefined &&
			(!Number.isFinite(object.stitch.maxStitchLengthMm) ||
				object.stitch.maxStitchLengthMm < 1 ||
				object.stitch.maxStitchLengthMm > 12)
		)
			throw new Error("INVALID_STITCH_LENGTH");
		if (
			object.stitch.beanRepeats !== undefined &&
			(object.stitch.type !== "running" ||
				![0, 1, 2].includes(object.stitch.beanRepeats))
		)
			throw new Error("INVALID_STITCH_PARAMETER");
		if (
			object.stitch.toleranceMm !== undefined &&
			(object.stitch.type !== "running" ||
				!Number.isFinite(object.stitch.toleranceMm) ||
				object.stitch.toleranceMm < 0.02 ||
				object.stitch.toleranceMm > 1)
		)
			throw new Error("INVALID_STITCH_PARAMETER");
		if (
			object.stitch.placement !== undefined &&
			(object.stitch.type !== "running" || object.stitch.placement !== "curvatura")
		)
			throw new Error("INVALID_STITCH_PARAMETER");
		if (!Number.isInteger(object.nodeCount) || object.nodeCount < 1)
			throw new Error("INVALID_NODE_COUNT");
	}
}

export function earlyAnalysis(
	design: EmbroideryDesign,
	profile: EmbroideryProfile,
): {
	decision: "continue" | "review" | "reject";
	confidence: number;
	issues: EmbroideryIssue[];
} {
	const issues: EmbroideryIssue[] = [];
	const m = design.metrics;
	const nodes = design.objects.reduce((sum, item) => sum + item.nodeCount, 0);
	/* EN V5 UN RUNG NO ES UN COMPONENTE. Un satin por rails lleva sus dos
	   rails y un subtrazado por rung, y contarlos todos rechazaba por
	   "demasiados detalles" un escudo de 18 objetos: 396 subtrazados, 367 de
	   ellos rungs. Los perfiles anteriores cuentan como siempre. */
	/* V6.9.0: y un satin por rails es UNA columna, una unidad de cosido (no
	   sus dos rails): contarlo doble rechazaba el escudo de Harley. */
	const components = design.objects.reduce((sum, item) => {
		if (profile.vector && item.stitch.satinMode === "rails") return sum + 1;
		return sum + (item.geometry.d.match(/[Mm]/g)?.length ?? 0);
	}, 0);
	if (design.objects.some((object) => object.classification === "photo"))
		issues.push({
			code: "PHOTO",
			message: "Las fotografías no son aptas para este bordado automático.",
			severity: "reject",
		});
	if ((m.gradientRatio ?? 0) > profile.limits.maxGradientRatio)
		issues.push({
			code: "COMPLEX_GRADIENT",
			message:
				"El diseño contiene demasiados degradados para bordarlo fielmente.",
			severity: "reject",
		});
	if (
		(m.texture ?? 0) > profile.limits.maxTexture ||
		(m.colorEntropy ?? 0) > profile.limits.maxEntropy
	)
		issues.push({
			code: "COMPLEX_TEXTURE",
			message:
				"La textura del diseño es demasiado compleja para bordado automático.",
			severity: "reject",
		});
	if (
		components > profile.limits.maxComponents ||
		nodes > profile.limits.maxNodes
	)
		issues.push({
			code: "TOO_COMPLEX",
			message:
				"El diseño tiene demasiados detalles pequeños; simplifícalo e inténtalo de nuevo.",
			severity: "reject",
		});
	if (issues.some((issue) => issue.severity === "reject"))
		return { decision: "reject", confidence: 0.98, issues };
	if (design.objects.some((object) => object.classification === "illustration"))
		return {
			decision: "review",
			confidence: 0.82,
			issues: [
				{
					code: "ILLUSTRATION_REVIEW",
					message: "Este diseño necesita revisión antes de fabricarse.",
					severity: "review",
				},
			],
		};
	return { decision: "continue", confidence: 0.94, issues: [] };
}
