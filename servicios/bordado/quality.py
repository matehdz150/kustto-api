"""Métricas reproducibles de calidad para un plan de puntadas.

El DST ya no sabe de qué objeto ni de qué tipo de puntada vino cada bloque.
Por eso este módulo separa dos fuentes de verdad:

* ``analyze_design_geometry`` mide semántica y complejidad ANTES del motor.
* ``analyze_stitch_plan`` mide únicamente movimientos que existen en el DST.

La suite de calidad obtiene métricas por objeto digitizando cada objeto de
forma aislada. No se intenta reconstruir esa identidad desde Tajima.
"""
from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

import pyembroidery as pe
from PIL import Image, ImageChops, ImageDraw, ImageFilter


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile
    low = int(math.floor(position))
    high = int(math.ceil(position))
    if low == high:
        return ordered[low]
    fraction = position - low
    return ordered[low] * (1 - fraction) + ordered[high] * fraction


def _orientation_delta(first: float, second: float) -> float:
    """Cambio de orientación, no de sentido, dentro de [0, 90] grados."""
    delta = abs(first - second) % 180
    return min(delta, 180 - delta)


def _proper_intersection(
    a: tuple[float, float],
    b: tuple[float, float],
    c: tuple[float, float],
    d: tuple[float, float],
    epsilon: float = 1e-7,
) -> bool:
    """Cruce interior entre segmentos; tocar un endpoint no cuenta."""
    def cross(p: tuple[float, float], q: tuple[float, float], r: tuple[float, float]) -> float:
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    first = cross(a, b, c)
    second = cross(a, b, d)
    third = cross(c, d, a)
    fourth = cross(c, d, b)
    return (
        ((first > epsilon and second < -epsilon) or (first < -epsilon and second > epsilon))
        and ((third > epsilon and fourth < -epsilon) or (third < -epsilon and fourth > epsilon))
    )


def _overlap_length(
    a: tuple[float, float],
    b: tuple[float, float],
    c: tuple[float, float],
    d: tuple[float, float],
    epsilon: float = 0.06,
) -> float:
    """Longitud solapada de dos segmentos casi colineales, en milímetros."""
    ab = (b[0] - a[0], b[1] - a[1])
    cd = (d[0] - c[0], d[1] - c[1])
    length_ab = math.hypot(*ab)
    length_cd = math.hypot(*cd)
    if length_ab < epsilon or length_cd < epsilon:
        return 0.0
    cross_dirs = abs(ab[0] * cd[1] - ab[1] * cd[0]) / (length_ab * length_cd)
    if cross_dirs > math.sin(math.radians(4)):
        return 0.0
    distance_c = abs(ab[0] * (c[1] - a[1]) - ab[1] * (c[0] - a[0])) / length_ab
    distance_d = abs(ab[0] * (d[1] - a[1]) - ab[1] * (d[0] - a[0])) / length_ab
    if max(distance_c, distance_d) > epsilon:
        return 0.0
    ux, uy = ab[0] / length_ab, ab[1] / length_ab
    projection = sorted((0.0, length_ab, (c[0] - a[0]) * ux + (c[1] - a[1]) * uy, (d[0] - a[0]) * ux + (d[1] - a[1]) * uy))
    # Para dos intervalos hay solape si los dos valores centrales pertenecen a
    # intervalos distintos. La forma explícita evita falsos positivos separados.
    c0, c1 = sorted(((c[0] - a[0]) * ux + (c[1] - a[1]) * uy, (d[0] - a[0]) * ux + (d[1] - a[1]) * uy))
    return max(0.0, min(length_ab, c1) - max(0.0, c0))


def analyze_design_geometry(design: dict[str, Any], svg_bytes: int | None = None) -> dict[str, Any]:
    """Complejidad y semántica confiables antes de perderlas en DST."""
    objects = design.get("objects") or []
    widths: list[float] = []
    for obj in objects:
        if obj.get("stitch", {}).get("type") != "satin":
            continue
        stroke_width = obj.get("stitch", {}).get("strokeWidthMm")
        quality = obj.get("quality") or {}
        if stroke_width is not None:
            widths.append(float(stroke_width))
        elif quality.get("averageWidthMm") is not None:
            widths.append(float(quality["averageWidthMm"]))
    node_count = sum(int(obj.get("nodeCount", 0)) for obj in objects)
    path_count = sum((obj.get("geometry", {}).get("d", "").count("M") + obj.get("geometry", {}).get("d", "").count("m")) for obj in objects)
    by_type = Counter(obj.get("stitch", {}).get("type") for obj in objects)
    representation = Counter(
        (obj.get("quality") or {}).get("representationDecision")
        for obj in objects
        if (obj.get("quality") or {}).get("representationDecision")
    )
    quality_blocks = [obj.get("quality") or {} for obj in objects]
    average_width = sum(widths) / len(widths) if widths else 0.0
    variance = sum((width - average_width) ** 2 for width in widths) / len(widths) if widths else 0.0
    result: dict[str, Any] = {
        "objectCount": len(objects),
        "pathCount": path_count,
        "nodeCount": node_count,
        # En este contrato cada comando de path es un segmento como máximo; es
        # la cuenta estable disponible sin aproximar curvas a polígonos.
        "segmentCount": max(0, node_count - path_count),
        "satinColumnCount": by_type["satin"],
        "fillRegionCount": by_type["fill"],
        "runningPathCount": by_type["running"],
        "junctionCount": sum(int(obj.get("quality", {}).get("junctionCount", 0)) for obj in objects),
        "representationDecision": {
            "strokeV2": representation["stroke-v2"],
            "railsV3": representation["rails-v3"],
            "strokeV2Percent": round(100 * representation["stroke-v2"] / max(1, sum(representation.values())), 1),
            "railsV3Percent": round(100 * representation["rails-v3"] / max(1, sum(representation.values())), 1),
        },
        "sampling": {
            "rawCenterlineNodes": sum(int(item.get("rawCenterlineNodes", 0)) for item in quality_blocks),
            "rawRailNodes": sum(int(item.get("rawRailNodes", 0)) for item in quality_blocks),
            "finalRailNodes": sum(int(item.get("finalRailNodes", 0)) for item in quality_blocks),
            "rungsBefore": sum(int(item.get("rungsBefore", 0)) for item in quality_blocks),
            "rungsAfter": sum(int(item.get("rungsAfter", 0)) for item in quality_blocks),
        },
        "underlay": {
            "layers": sum(int(item.get("underlayLayers", 0)) for item in quality_blocks),
            "estimatedStitches": sum(int(item.get("estimatedUnderlayStitches", 0)) for item in quality_blocks),
        },
        "joins": [item["join"] for item in quality_blocks if item.get("join")],
        "satin": {
            "minWidthMm": round(min(widths), 3) if widths else None,
            "maxWidthMm": round(max(widths), 3) if widths else None,
            "averageWidthMm": round(average_width, 3) if widths else None,
            "widthVariance": round(variance, 5) if widths else None,
        },
    }
    if svg_bytes is not None:
        result["svgBytes"] = svg_bytes
    return result


def _stitch_segments(pattern: pe.EmbPattern) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    previous: tuple[float, float] | None = None
    counts: Counter[int] = Counter()
    jump_lengths: list[float] = []
    stitch_lengths: list[float] = []
    for order, stitch in enumerate(pattern.stitches):
        x, y, command = float(stitch[0]) / 10, float(stitch[1]) / 10, int(stitch[2]) & pe.COMMAND_MASK
        counts[command] += 1
        point = (x, y)
        if previous is not None and command in (pe.STITCH, pe.JUMP):
            length = math.dist(previous, point)
            if command == pe.STITCH:
                stitch_lengths.append(length)
                if length > 1e-6:
                    segments.append({
                        "order": order,
                        "start": previous,
                        "end": point,
                        "length": length,
                        "angle": math.degrees(math.atan2(point[1] - previous[1], point[0] - previous[0])) % 180,
                    })
            else:
                jump_lengths.append(length)
        previous = point
    return segments, {
        "counts": counts,
        "stitchLengths": stitch_lengths,
        "jumpLengths": jump_lengths,
    }


def _spatial_pairs(segments: list[dict[str, Any]], cell_mm: float = 2.0) -> Iterable[tuple[int, int]]:
    cells: dict[tuple[int, int], list[int]] = defaultdict(list)
    for index, segment in enumerate(segments):
        xs = (segment["start"][0], segment["end"][0])
        ys = (segment["start"][1], segment["end"][1])
        left, right = math.floor(min(xs) / cell_mm), math.floor(max(xs) / cell_mm)
        top, bottom = math.floor(min(ys) / cell_mm), math.floor(max(ys) / cell_mm)
        for cell_x in range(left, right + 1):
            for cell_y in range(top, bottom + 1):
                cells[(cell_x, cell_y)].append(index)
    emitted: set[tuple[int, int]] = set()
    for indices in cells.values():
        for offset, first in enumerate(indices):
            for second in indices[offset + 1:]:
                pair = (min(first, second), max(first, second))
                if pair in emitted:
                    continue
                emitted.add(pair)
                yield pair


def analyze_stitch_plan(
    pattern: pe.EmbPattern,
    *,
    stitch_type: str | None = None,
    long_stitch_threshold_mm: float = 6.0,
    sharp_direction_threshold_deg: float = 55.0,
    fan_angle_threshold_deg: float = 40.0,
    local_cell_mm: float = 1.0,
    detalle: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Mide sólo hechos observables del plan de puntadas final.

    `detalle`, si se pasa, recibe los segmentos y los pares solapados que
    cuentan en `overlapDensity`: el desglose por tipo de puntada de v5
    (`analyze_overlap_breakdown`) los clasifica sin volver a buscarlos.
    """
    segments, raw = _stitch_segments(pattern)
    counts: Counter[int] = raw["counts"]
    lengths: list[float] = raw["stitchLengths"]
    jump_lengths: list[float] = raw["jumpLengths"]

    direction_changes: list[float] = []
    # Los giros "relevantes": los que no son el vaiven normal de un tatami.
    # EL TATAMI GIRA POR CONSTRUCCION: al final de cada fila da una puntada
    # por el borde y vuelve paralelo a la fila anterior, dos giros de ~90
    # grados por fila. Contarlos hacia que la medida dijera "cuanto relleno
    # hay" y no "hay un problema": 2.8 % en un logo todo satin, 15.5 % en uno
    # casi todo relleno. Se descartan (1) los giros con una puntada de 1 mm o
    # menos y (2) el giro de fila: una puntada entre dos paralelas y mas corta
    # que ellas, que en una forma estrecha rellena en diagonal pasa de 1 mm
    # (el swoosh de Nike seguia en 11 %). En un satin o un corrido nada de eso
    # ocurre, y ahi se siguen contando todos.
    def giro_de_fila(k: int) -> bool:
        if k < 1 or k + 1 >= len(segments):
            return False
        antes, borde, despues = segments[k - 1], segments[k], segments[k + 1]
        return (
            borde["order"] == antes["order"] + 1
            and despues["order"] == borde["order"] + 1
            and _orientation_delta(antes["angle"], despues["angle"]) < 15
            and borde["length"] < min(antes["length"], despues["length"])
        )

    relevant_sharp_changes = 0
    for k in range(1, len(segments)):
        previous, current = segments[k - 1], segments[k]
        # Un salto o cambio de bloque rompe la continuidad. Sólo comparar
        # puntadas realmente adyacentes en el archivo.
        if current["order"] != previous["order"] + 1:
            continue
        delta = _orientation_delta(previous["angle"], current["angle"])
        direction_changes.append(delta)
        if (
            delta > sharp_direction_threshold_deg
            and previous["length"] > 1
            and current["length"] > 1
            and not giro_de_fila(k)
            and not giro_de_fila(k - 1)
        ):
            relevant_sharp_changes += 1

    local_counts: Counter[tuple[int, int]] = Counter()
    for segment in segments:
        midpoint = ((segment["start"][0] + segment["end"][0]) / 2, (segment["start"][1] + segment["end"][1]) / 2)
        local_counts[(math.floor(midpoint[0] / local_cell_mm), math.floor(midpoint[1] / local_cell_mm))] += 1

    crossing_pairs = 0
    crossing_stitches: set[int] = set()
    overlaps = 0
    overlap_length = 0.0
    comparisons = 0
    comparison_limit = 2_000_000
    truncated = False
    for first_index, second_index in _spatial_pairs(segments):
        if comparisons >= comparison_limit:
            truncated = True
            break
        if abs(first_index - second_index) <= 2:
            continue
        comparisons += 1
        first, second = segments[first_index], segments[second_index]
        # El center-walk cruza perpendicularmente la cubierta satin y eso es
        # intencional. Sólo contamos cruces entre puntadas de orientación
        # comparable; son los que delatan rails invertidos o abanicos que se
        # repliegan sobre sí mismos.
        comparable = _orientation_delta(first["angle"], second["angle"]) <= 50
        if comparable and min(first["length"], second["length"]) >= .6 and _proper_intersection(first["start"], first["end"], second["start"], second["end"]):
            crossing_pairs += 1
            crossing_stitches.update((first_index, second_index))
        overlap = _overlap_length(first["start"], first["end"], second["start"], second["end"])
        if overlap >= 0.2:
            overlaps += 1
            overlap_length += overlap
            if detalle is not None:
                detalle.setdefault("pairs", []).append((first_index, second_index, overlap))

    stitch_count = counts[pe.STITCH]
    color_changes = counts[pe.COLOR_CHANGE] + counts[pe.NEEDLE_SET]
    max_direction = max(direction_changes, default=0.0)
    fan_stitches = sum(
        1
        for segment, delta in zip(segments[1:], direction_changes)
        if segment["length"] > long_stitch_threshold_mm and delta > fan_angle_threshold_deg
    )
    result: dict[str, Any] = {
        "stitchCount": stitch_count,
        # Sólo se completa por tipo cuando la corrida es de un objeto aislado y
        # el caller conoce su semántica. En un DST mixto quedan explícitamente null.
        "runningStitches": stitch_count if stitch_type == "running" else (0 if stitch_type else None),
        "satinStitches": stitch_count if stitch_type == "satin" else (0 if stitch_type else None),
        "fillStitches": stitch_count if stitch_type == "fill" else (0 if stitch_type else None),
        "jumps": counts[pe.JUMP],
        "trims": counts[pe.TRIM],
        "colorChanges": color_changes,
        "maxStitchLengthMm": round(max(lengths, default=0.0), 3),
        "p95StitchLengthMm": round(_percentile(lengths, .95), 3),
        "averageStitchLengthMm": round(sum(lengths) / len(lengths), 3) if lengths else 0.0,
        "stitchesAboveThreshold": sum(length > long_stitch_threshold_mm for length in lengths),
        "maxJumpLengthMm": round(max(jump_lengths, default=0.0), 3),
        "estimatedThreadLengthMm": round(sum(lengths) + sum(jump_lengths), 1),
        "directionChangeDegrees": {
            "average": round(sum(direction_changes) / len(direction_changes), 3) if direction_changes else 0.0,
            "p95": round(_percentile(direction_changes, .95), 3),
        },
        "maxDirectionChange": round(max_direction, 3),
        "numberOfSharpDirectionChanges": sum(delta > sharp_direction_threshold_deg for delta in direction_changes),
        "numberOfRelevantSharpDirectionChanges": relevant_sharp_changes,
        "maxAngleDeltaBetweenAdjacentStitches": round(max_direction, 3),
        "numberOfFanStitches": fan_stitches,
        "numberOfCrossingStitches": len(crossing_stitches),
        "overlappingSegments": overlaps,
        "overlapDensity": round(overlap_length / max(sum(lengths), 1e-6), 5),
        # Cuánto se mueve la aguja sin coser, para juzgar los saltos por algo
        # más que su número: 40 saltos de 2 mm no son 40 de 20 mm, ni pesan
        # lo mismo en 500 puntadas que en 5000. Sólo informan.
        "jumpDistance": _jump_distance(pattern, jump_lengths, stitch_count=counts[pe.STITCH]),
        "localStitchDensity": {
            "cellMm": local_cell_mm,
            "occupiedCells": len(local_counts),
            "averagePerOccupiedCell": round(sum(local_counts.values()) / max(len(local_counts), 1), 3),
        },
        "maxLocalDensity": max(local_counts.values(), default=0),
        "analysis": {
            "crossingComparisons": comparisons,
            "crossingPairs": crossing_pairs,
            "crossingAnalysisTruncated": truncated,
        },
    }
    if detalle is not None:
        detalle["segments"] = segments
        detalle.setdefault("pairs", [])
        detalle["totalLength"] = sum(lengths)
    return result


def _jump_distance(pattern: pe.EmbPattern, jump_lengths: list[float], *, stitch_count: int) -> dict[str, Any]:
    """Los traslados: cada tramo sin coser entre dos puntadas, con o sin corte.

    Un traslado es la secuencia de saltos, cortes y cambios de color que hay
    entre dos puntadas. El DST parte un traslado largo en varios saltos de
    12.1 mm como mucho, y después de cada corte hay al menos un salto: el
    número de saltos del archivo mezcla las tres cosas. Aquí se separan.
    """
    moves: list[tuple[float, bool]] = []
    last_stitch: tuple[float, float] | None = None
    pending = False
    trimmed = False
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        point = (float(x) / 10, float(y) / 10)
        if kind in (pe.JUMP, pe.TRIM, pe.COLOR_CHANGE, pe.NEEDLE_SET):
            pending = pending or last_stitch is not None
            trimmed = trimmed or kind in (pe.TRIM, pe.COLOR_CHANGE, pe.NEEDLE_SET)
        elif kind == pe.STITCH:
            if pending and last_stitch is not None:
                moves.append((math.dist(last_stitch, point), trimmed))
            pending = trimmed = False
            last_stitch = point
    distances = [d for d, _ in moves]
    return {
        "totalJumpDistanceMm": round(sum(jump_lengths), 2),
        "averageJumpLengthMm": round(sum(jump_lengths) / len(jump_lengths), 3) if jump_lengths else 0.0,
        "jumpsPer1000Stitches": round(1000 * len(jump_lengths) / max(1, stitch_count), 2),
        "moves": len(moves),
        "trimmedMoves": sum(1 for _, t in moves if t),
        "untrimmedMoves": sum(1 for _, t in moves if not t),
        "moveDistanceMm": round(sum(distances), 2),
        "longestMoveMm": round(max(distances, default=0.0), 2),
        "shortTrimmedMoves": sum(1 for d, t in moves if t and d < 3),
    }


def render_stitch_plot(pattern: pe.EmbPattern, palette: list[str], target: Path) -> None:
    """Vista técnica: hilo sólido, saltos discontinuos y puntos de aguja."""
    min_x, min_y, max_x, max_y = pattern.bounds()
    width_mm, height_mm = max(1.0, (max_x - min_x) / 10), max(1.0, (max_y - min_y) / 10)
    scale = min(1100 / width_mm, 720 / height_mm)
    margin = 48
    image = Image.new("RGB", (round(width_mm * scale + margin * 2), round(height_mm * scale + margin * 2)), "#ffffff")
    draw = ImageDraw.Draw(image, "RGBA")
    previous: tuple[float, float] | None = None
    block = 0
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        if kind in (pe.COLOR_CHANGE, pe.NEEDLE_SET):
            block += 1
        point = (margin + (x - min_x) / 10 * scale, margin + (y - min_y) / 10 * scale)
        if previous is not None and kind == pe.STITCH:
            color = palette[min(block, len(palette) - 1)] if palette else "#151515"
            draw.line((previous, point), fill=color + "d8", width=max(1, round(scale * .045)))
            draw.ellipse((point[0] - 1.2, point[1] - 1.2, point[0] + 1.2, point[1] + 1.2), fill="#00000070")
        elif previous is not None and kind == pe.JUMP:
            steps = max(1, int(math.dist(previous, point) / 10))
            for step in range(0, steps, 2):
                start = step / steps
                end = min(1.0, (step + 1) / steps)
                draw.line((previous[0] + (point[0] - previous[0]) * start, previous[1] + (point[1] - previous[1]) * start, previous[0] + (point[0] - previous[0]) * end, previous[1] + (point[1] - previous[1]) * end), fill="#db277780", width=1)
        previous = point
    image.save(target, optimize=True)


def render_embroidered_preview(pattern: pe.EmbPattern, palette: list[str], target: Path) -> None:
    """Simulación aproximada de hilo; nunca se presenta como test sew."""
    min_x, min_y, max_x, max_y = pattern.bounds()
    width_mm, height_mm = max(1.0, (max_x - min_x) / 10), max(1.0, (max_y - min_y) / 10)
    scale = min(1100 / width_mm, 720 / height_mm)
    margin = 56
    image = Image.new("RGB", (round(width_mm * scale + margin * 2), round(height_mm * scale + margin * 2)), "#ece7dc")
    draw = ImageDraw.Draw(image, "RGBA")
    previous: tuple[float, float] | None = None
    block = 0
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        if kind in (pe.COLOR_CHANGE, pe.NEEDLE_SET):
            block += 1
        point = (margin + (x - min_x) / 10 * scale, margin + (y - min_y) / 10 * scale)
        if previous is not None and kind == pe.STITCH:
            color = palette[min(block, len(palette) - 1)] if palette else "#151515"
            width = max(2, round(scale * .11))
            draw.line((previous[0] + 1, previous[1] + 1, point[0] + 1, point[1] + 1), fill="#00000028", width=width + 2)
            draw.line((previous, point), fill=color + "e8", width=width)
            draw.line((previous[0] - .45, previous[1] - .45, point[0] - .45, point[1] - .45), fill="#ffffff42", width=max(1, width // 3))
        previous = point
    image.save(target, optimize=True)


# ---------------------------------------------------------------------------
# SOLAPE CONSCIENTE DEL TIPO DE PUNTADA (v5)
#
# `overlapDensity` cuenta toda puntada que cae sobre otra, venga de donde
# venga. Un corrido triple (bean) pasa tres veces por el mismo sitio A
# PROPÓSITO, y los remates de entrada y salida vuelven sobre las últimas
# puntadas para anudar: en la serif fina a 30 mm eso era 53 de los 69 mm de
# solape y el diseño iba a revisión sin tener dos objetos pisándose. Para
# separarlo hace falta saber de qué objeto es cada puntada, y el DST no lo
# dice: se reconstruye con el diseño, que el motor tiene, y los cortes de
# hilo, que v5 pone objeto a objeto (`trimAfter`) y el DST conserva.
# ---------------------------------------------------------------------------

HILO_MM = 0.4
"""Grueso nominal del hilo: pasa longitudes de puntada solapada a mm²."""

TOLERANCIA_DE_OBJETO_MM = 0.35
"""Cuánto puede quedar una puntada fuera de la geometría de su objeto: la
compensación del satin (0.15), el redondeo del DST a 0.1 mm y el centrado
del archivo, que se deduce de las cajas y no es exacto."""

ZONA_DE_REMATE = 4
"""Puntadas del principio y del final de cada tramo cosido de un tirón donde
Ink/Stitch pone los remates (tie-in / tie-off)."""

def _subpaths(d: str) -> list[list[tuple[float, float]]] | None:
    """Los subtrazos de un path de sólo rectas. Con curvas, None: no se aproxima."""
    if re.search(r"[CcSsQqTtAa]", d):
        return None
    tokens = re.findall(r"[MmLlHhVvZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?", d)
    paths: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []
    x = y = 0.0
    command = "M"
    k = 0

    def number() -> float:
        nonlocal k
        value = float(tokens[k])
        k += 1
        return value

    while k < len(tokens):
        token = tokens[k]
        if token.isalpha():
            command = token
            k += 1
            if command in "Zz":
                if current:
                    paths.append(current)
                    x, y = current[0]
                current = []
                continue
            continue
        if command in "Mm":
            if current:
                paths.append(current)
            dx, dy = number(), number()
            x, y = (x + dx, y + dy) if command == "m" else (dx, dy)
            current = [(x, y)]
            # Tras un moveto, los pares siguientes son lineto.
            command = "l" if command == "m" else "L"
        elif command in "Ll":
            dx, dy = number(), number()
            x, y = (x + dx, y + dy) if command == "l" else (dx, dy)
            current.append((x, y))
        elif command in "Hh":
            value = number()
            x = x + value if command == "h" else value
            current.append((x, y))
        elif command in "Vv":
            value = number()
            y = y + value if command == "v" else value
            current.append((x, y))
        else:
            k += 1
    if current:
        paths.append(current)
    return [p for p in paths if p]


def _area(ring: list[tuple[float, float]]) -> float:
    return sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring))) / 2


def _dist_to_segment(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    ax, ay = b[0] - a[0], b[1] - a[1]
    length2 = ax * ax + ay * ay
    if length2 <= 1e-12:
        return math.dist(p, a)
    t = max(0.0, min(1.0, ((p[0] - a[0]) * ax + (p[1] - a[1]) * ay) / length2))
    return math.dist(p, (a[0] + ax * t, a[1] + ay * t))


def _inside(rings: list[list[tuple[float, float]]], p: tuple[float, float]) -> bool:
    """Par-impar: el mismo criterio que `fill-rule: evenodd`."""
    inside = False
    for ring in rings:
        n = len(ring)
        for i in range(n):
            (x1, y1), (x2, y2) = ring[i], ring[(i + 1) % n]
            if (y1 > p[1]) != (y2 > p[1]) and p[0] < (x2 - x1) * (p[1] - y1) / (y2 - y1) + x1:
                inside = not inside
    return inside


class _Forma:
    """Lo que cose un objeto, para saber si una puntada es suya."""

    def __init__(self, obj: dict[str, Any]):
        self.id = obj.get("id")
        self.tipo = (obj.get("stitch") or {}).get("type")
        self.color = obj.get("colorId")
        self.corta = bool((obj.get("stitch") or {}).get("trimAfter"))
        self.traslado = obj.get("role") == "travel"
        paths = _subpaths((obj.get("geometry") or {}).get("d", "")) or []
        self.lineas: list[list[tuple[float, float]]] = []
        self.anillos: list[list[tuple[float, float]]] = []
        if self.tipo == "running":
            self.lineas = [p for p in paths if len(p) >= 2]
        elif self.tipo == "satin":
            # Rails: los dos subtrazos más largos; el resto son travesaños.
            rails = sorted((p for p in paths if len(p) >= 2), key=len, reverse=True)[:2]
            if len(rails) == 2:
                a, b = rails
                # Si los dos rails van en el mismo sentido, el contorno es uno
                # más el otro al revés; si no, los dos tal cual. Se queda el
                # que encierra más área: el otro se cruza consigo mismo.
                uno, otro = a + b[::-1], a + b
                self.anillos = [uno if abs(_area(uno)) >= abs(_area(otro)) else otro]
            self.lineas = rails
        else:
            self.anillos = [p for p in paths if len(p) >= 3]
        puntos = [q for p in paths for q in p]
        margen = TOLERANCIA_DE_OBJETO_MM + 0.05
        self.caja = (
            (min(q[0] for q in puntos) - margen, min(q[1] for q in puntos) - margen, max(q[0] for q in puntos) + margen, max(q[1] for q in puntos) + margen)
            if puntos
            else None
        )
        self.largo = sum(math.dist(l[i - 1], l[i]) for l in self.lineas for i in range(1, len(l))) if self.tipo == "running" else 0.0

    def distancia(self, p: tuple[float, float]) -> float:
        if self.caja is None:
            return math.inf
        x0, y0, x1, y1 = self.caja
        if not (x0 <= p[0] <= x1 and y0 <= p[1] <= y1):
            return math.inf
        if self.anillos and _inside(self.anillos, p):
            return 0.0
        bordes = self.anillos + self.lineas
        return min(
            (_dist_to_segment(p, r[i - 1], r[i]) for r in bordes for i in range(1, len(r))),
            default=math.inf,
        )

    def a_lo_largo(self, a: tuple[float, float], b: tuple[float, float]) -> bool:
        """Satin: si la puntada `a→b` va a lo largo de la columna y no la cruza.

        Las puntadas de cubierta van de un rail al otro; el underlay
        center-walk va por el eje, en la dirección de los rails. Se compara
        con el tramo de rail más cercano a la mitad de la puntada.
        """
        medio = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        mejor, direccion = math.inf, None
        for rail in self.lineas:
            for i in range(1, len(rail)):
                d = _dist_to_segment(medio, rail[i - 1], rail[i])
                if d < mejor and math.dist(rail[i - 1], rail[i]) > 1e-9:
                    mejor, direccion = d, (rail[i][0] - rail[i - 1][0], rail[i][1] - rail[i - 1][1])
        if direccion is None:
            return False
        angulo_rail = math.degrees(math.atan2(direccion[1], direccion[0])) % 180
        angulo = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180
        return _orientation_delta(angulo, angulo_rail) <= 30

    def avance(self, p: tuple[float, float]) -> float:
        """Corrido: hasta dónde de su trazo llega la proyección de `p`, en mm."""
        mejor, donde, recorrido = math.inf, 0.0, 0.0
        for linea in self.lineas:
            for i in range(1, len(linea)):
                a, b = linea[i - 1], linea[i]
                largo = math.dist(a, b)
                d = _dist_to_segment(p, a, b)
                if d < mejor:
                    t = 0.0 if largo <= 1e-9 else max(0.0, min(1.0, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (largo * largo)))
                    mejor, donde = d, recorrido + t * largo
                recorrido += largo
        return donde


def _puntadas(pattern: pe.EmbPattern) -> list[tuple[int, tuple[float, float], bool]]:
    """(índice en el patrón, punto en mm, empieza tramo nuevo) de cada puntada."""
    salida = []
    nuevo = True
    for order, (x, y, command) in enumerate(pattern.stitches):
        kind = int(command) & pe.COMMAND_MASK
        if kind in (pe.TRIM, pe.COLOR_CHANGE, pe.NEEDLE_SET):
            nuevo = True
        elif kind == pe.STITCH:
            salida.append((order, (float(x) / 10, float(y) / 10), nuevo))
            nuevo = False
    return salida


def atribuir_puntadas(pattern: pe.EmbPattern, objects: list[dict[str, Any]]) -> dict[str, Any]:
    """A qué objeto pertenece cada puntada del DST, en el orden de cosido.

    ANCLAS: los cortes. v5 dice objeto a objeto dónde corta (`trimAfter`) y
    el hilo también se corta al cambiar de color; si el DST tiene tantos
    tramos entre cortes como el diseño, cada tramo se reparte sólo entre sus
    objetos. Dentro de un tramo, la puntada es del objeto en curso mientras
    caiga en su geometría, y pasa al siguiente cuando cae en el siguiente y
    no en el actual. Un corrido que ya llegó a su final no se queda las
    puntadas que vuelven atrás más de lo que vuelve un remate: son del
    siguiente objeto aunque pisen el mismo trazo (dos corridos duplicados
    siguen siendo dos objetos).
    """
    formas = [_Forma(o) for o in objects]
    puntadas = _puntadas(pattern)
    if not formas or not puntadas:
        return {"owner": {}, "method": "none", "unattributed": len(puntadas), "offset": (0.0, 0.0)}

    # El DST está centrado en su caja; el diseño, en la de sus objetos.
    cajas = [f.caja for f in formas if f.caja]
    cx = (min(c[0] for c in cajas) + max(c[2] for c in cajas)) / 2
    cy = (min(c[1] for c in cajas) + max(c[3] for c in cajas)) / 2
    xs = [p[0] for _, p, _ in puntadas]
    ys = [p[1] for _, p, _ in puntadas]
    dx = cx - (min(xs) + max(xs)) / 2
    dy = cy - (min(ys) + max(ys)) / 2

    grupos_obj: list[list[int]] = [[]]
    for k, f in enumerate(formas):
        if grupos_obj[-1] and formas[grupos_obj[-1][-1]].color != f.color:
            grupos_obj.append([])
        grupos_obj[-1].append(k)
        if f.corta:
            grupos_obj.append([])
    grupos_obj = [g for g in grupos_obj if g]
    grupos_dst: list[list[int]] = []
    for i, (_, _, nuevo) in enumerate(puntadas):
        if nuevo or not grupos_dst:
            grupos_dst.append([])
        grupos_dst[-1].append(i)

    anclado = len(grupos_obj) == len(grupos_dst)
    if not anclado:
        grupos_obj = [list(range(len(formas)))]
        grupos_dst = [list(range(len(puntadas)))]

    owner: dict[int, int] = {}
    fuera = 0
    for objetos, indices in zip(grupos_obj, grupos_dst):
        cur = 0
        maximo = 0.0
        for i in indices:
            order, (x, y), _ = puntadas[i]
            p = (x + dx, y + dy)
            actual = formas[objetos[cur]]
            d_actual = actual.distancia(p)
            siguiente = None
            for j in range(cur + 1, min(len(objetos), cur + 12)):
                if formas[objetos[j]].distancia(p) <= TOLERANCIA_DE_OBJETO_MM:
                    siguiente = j
                    break
            acabado = False
            if actual.tipo == "running" and actual.largo > 0 and d_actual <= TOLERANCIA_DE_OBJETO_MM:
                t = actual.avance(p)
                acabado = maximo >= actual.largo - 0.4 and t < maximo - 1.5
            if siguiente is not None and (d_actual > TOLERANCIA_DE_OBJETO_MM or acabado):
                cur = siguiente
                maximo = 0.0
                actual = formas[objetos[cur]]
                d_actual = 0.0
            elif d_actual > TOLERANCIA_DE_OBJETO_MM:
                fuera += 1
            if actual.tipo == "running" and actual.largo > 0:
                maximo = max(maximo, actual.avance(p))
            owner[order] = objetos[cur]
    return {"owner": owner, "method": "cortes" if anclado else "geometria", "unattributed": fuera, "offset": (dx, dy)}


def _en_diseno(segment: dict[str, Any], atribucion: dict[str, Any]) -> tuple[tuple[float, float], tuple[float, float]]:
    """Un segmento del DST en las coordenadas del diseño."""
    dx, dy = atribucion["offset"]
    return (segment["start"][0] + dx, segment["start"][1] + dy), (segment["end"][0] + dx, segment["end"][1] + dy)


def _mascara(forma: _Forma, origen: tuple[float, float], tamano: tuple[int, int], px: float) -> Image.Image:
    """Lo que cubre un objeto, pintado a `px` píxeles por mm."""
    imagen = Image.new("1", tamano, 0)
    dibujo = ImageDraw.Draw(imagen)
    a_px = lambda q: ((q[0] - origen[0]) * px, (q[1] - origen[1]) * px)  # noqa: E731
    if forma.tipo == "running" or not forma.anillos:
        for linea in forma.lineas:
            dibujo.line([a_px(q) for q in linea], fill=1, width=max(1, round(HILO_MM * px)))
        return imagen
    for anillo in forma.anillos:
        capa = Image.new("1", tamano, 0)
        ImageDraw.Draw(capa).polygon([a_px(q) for q in anillo], fill=1)
        imagen = ImageChops.logical_xor(imagen, capa)
    return imagen


def solape_geometrico(objects: list[dict[str, Any]], *, px: float = 10.0) -> dict[str, float]:
    """El solape entre objetos según su geometría, antes de las puntadas.

    `geometricObjectOverlapMm2`: donde se tocan dos objetos cualesquiera,
    incluida la compensación (el satin que se mete 0.3 mm bajo su vecino, el
    color que monta sobre otro). `duplicateObjectOverlapMm2`: sólo lo que dos
    objetos del MISMO hilo cosen a la vez con más grueso que esa
    compensación (0.6 mm): eso es coser dos veces lo mismo.
    """
    formas = [f for f in (_Forma(o) for o in objects) if f.caja and not f.traslado]
    if not formas:
        return {"geometricObjectOverlapMm2": 0.0, "duplicateObjectOverlapMm2": 0.0}
    x0 = min(f.caja[0] for f in formas)
    y0 = min(f.caja[1] for f in formas)
    x1 = max(f.caja[2] for f in formas)
    y1 = max(f.caja[3] for f in formas)
    tamano = (max(1, math.ceil((x1 - x0) * px)), max(1, math.ceil((y1 - y0) * px)))
    uno = lambda v: 1 if v else 0  # noqa: E731
    total = Image.new("L", tamano, 0)
    por_color: dict[str, Image.Image] = {}
    for f in formas:
        capa = _mascara(f, (x0, y0), tamano, px).point(uno, "L")
        total = ImageChops.add(total, capa)
        por_color[f.color] = ImageChops.add(por_color.get(f.color, Image.new("L", tamano, 0)), capa)
    pixel = 1 / (px * px)
    geometrico = total.point(lambda v: 255 if v >= 2 else 0).histogram()[255] * pixel
    # Grueso de más de 0.6 mm: lo que sobrevive a abrir con un radio de 0.3 mm.
    lado = 2 * round(0.3 * px) + 1
    duplicado = 0.0
    for capa in por_color.values():
        doble = capa.point(lambda v: 255 if v >= 2 else 0)
        abierto = doble.filter(ImageFilter.MinFilter(lado)).filter(ImageFilter.MaxFilter(lado))
        duplicado += abierto.histogram()[255] * pixel
    return {"geometricObjectOverlapMm2": round(geometrico, 2), "duplicateObjectOverlapMm2": round(duplicado, 2)}


def analyze_overlap_breakdown(pattern: pe.EmbPattern, objects: list[dict[str, Any]], detalle: dict[str, Any]) -> dict[str, Any]:
    """El solape del plan separado por su causa.

    Cada par de puntadas colineales que `analyze_stitch_plan` contó se
    clasifica:

    * remate (tie-in / tie-off): dentro de las primeras o últimas
      `ZONA_DE_REMATE` puntadas de un tramo cosido de un tirón, del mismo
      objeto. Ink/Stitch anuda así.
    * repaso intencional de un corrido: las dos puntadas son del MISMO
      corrido (el bean, un punto de detalle que va y vuelve). Es su técnica.
    * real: todo lo demás, incluido un satin o un relleno que se pisa a sí
      mismo y, sobre todo, dos objetos distintos en el mismo sitio.

    `realOverlapDensity` es sólo lo real sobre el largo cosido: la misma
    medida que `overlapDensity`, sin lo que la técnica pone a propósito.
    """
    segments = detalle.get("segments") or []
    pairs = detalle.get("pairs") or []
    total = float(detalle.get("totalLength") or 0.0)
    atribucion = atribuir_puntadas(pattern, objects)
    owner = atribucion["owner"]
    tipos = [(o.get("stitch") or {}).get("type") for o in objects]

    # Tramos cosidos de un tirón: segmentos seguidos en el patrón.
    tramo: list[int] = []
    for k, s in enumerate(segments):
        if k and s["order"] == segments[k - 1]["order"] + 1:
            tramo.append(tramo[-1])
        else:
            tramo.append(tramo[-1] + 1 if tramo else 0)
    inicio: dict[int, int] = {}
    fin: dict[int, int] = {}
    for k, t in enumerate(tramo):
        inicio.setdefault(t, k)
        fin[t] = k

    def en_remate(k: int) -> bool:
        t = tramo[k]
        return k - inicio[t] < ZONA_DE_REMATE or fin[t] - k < ZONA_DE_REMATE

    formas = [_Forma(o) for o in objects]
    remate = repaso = underlay = real_mismo = real_distintos = sin_dueno = 0.0
    for i, j, largo in pairs:
        a = owner.get(segments[i]["order"])
        b = owner.get(segments[j]["order"])
        if a is None or b is None:
            sin_dueno += largo
        elif a == b and tramo[i] == tramo[j] and (en_remate(i) or en_remate(j)):
            remate += largo
        elif a == b and tipos[a] == "running":
            repaso += largo
        elif (
            a == b
            and tipos[a] == "satin"
            and (objects[a].get("stitch") or {}).get("underlay", True)
            and all(formas[a].a_lo_largo(*_en_diseno(segments[k], atribucion)) for k in (i, j))
        ):
            # El center-walk va hasta el final de la columna y vuelve por el
            # mismo eje: dos pasadas del mismo objeto, a propósito. Una
            # puntada de cubierta que se pisa a sí misma cruza la columna y
            # sigue contando.
            underlay += largo
        elif a == b:
            real_mismo += largo
        else:
            real_distintos += largo
    real = real_mismo + real_distintos + sin_dueno
    todo = remate + repaso + underlay + real
    return {
        "attribution": {"method": atribucion["method"], "unattributedStitches": atribucion["unattributed"]},
        "totalOverlapMm": round(todo, 2),
        "tieInTieOffMm": round(remate, 2),
        "intentionalRunningRetraceMm": round(repaso, 2),
        "underlayRetraceMm": round(underlay, 2),
        "realSameObjectMm": round(real_mismo, 2),
        "realCrossObjectMm": round(real_distintos, 2),
        "unattributedMm": round(sin_dueno, 2),
        "tieInTieOffMm2": round(remate * HILO_MM, 2),
        "intentionalRunningRetraceMm2": round(repaso * HILO_MM, 2),
        "underlayRetraceMm2": round(underlay * HILO_MM, 2),
        "realOverlapMm2": round(real * HILO_MM, 2),
        **solape_geometrico(objects),
        "realOverlapDensity": round(real / max(total, 1e-6), 5),
    }


# ---------------------------------------------------------------------------
# COBERTURA DE TRAZO EN EL DST (v5)
#
# La cobertura de área no ve una estructura fina perdida: un logo al 98 % puede
# haber perdido una palabra pequeña entera. V5 manda el eje de cada estructura
# de la geometría fiel (`preparation.estructura`) y aquí se mide cuánto de ese
# eje tiene una puntada cerca en el DST real. Un satin cruza su eje, un corrido
# va por él y un relleno tiene filas cada 0.45 mm: con cualquiera de los tres,
# un eje cosido queda a menos de `TOLERANCIA_DE_EJE_MM` del hilo.
# ---------------------------------------------------------------------------

TOLERANCIA_DE_EJE_MM = 0.3
"""Del eje al hilo más cercano: medio paso de relleno, el redondeo del DST y el
centrado del archivo, que se deduce de las cajas."""

COBERTURA_MINIMA_DE_ESTRUCTURA = 0.9
"""Por debajo, la estructura está incompleta en el DST."""


def cobertura_de_estructura(pattern: pe.EmbPattern, objects: list[dict[str, Any]], estructura: list[dict[str, Any]]) -> dict[str, Any]:
    """Por estructura: largo del eje, cuánto tiene hilo cerca y el tramo sin hilo más largo."""
    if not estructura:
        return {"groups": 0, "incomplete": [], "coverageRatio": 1.0}
    atribucion = atribuir_puntadas(pattern, objects)
    dx, dy = atribucion["offset"]
    # Segmentos cosidos (puntada a puntada, sin saltos), en mm del diseño, por celda de 1 mm.
    celdas: dict[tuple[int, int], list[tuple[tuple[float, float], tuple[float, float]]]] = defaultdict(list)
    previo = None
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        punto = (float(x) / 10 + dx, float(y) / 10 + dy)
        if kind == pe.STITCH and previo is not None:
            a, b = previo, punto
            m = TOLERANCIA_DE_EJE_MM
            for cx in range(math.floor(min(a[0], b[0]) - m), math.floor(max(a[0], b[0]) + m) + 1):
                for cy in range(math.floor(min(a[1], b[1]) - m), math.floor(max(a[1], b[1]) + m) + 1):
                    celdas[(cx, cy)].append((a, b))
        # Un salto o un corte no dejan hilo: el siguiente tramo empieza de cero.
        previo = punto if kind == pe.STITCH else None

    def cubierto(p: tuple[float, float]) -> bool:
        return any(_dist_to_segment(p, a, b) <= TOLERANCIA_DE_EJE_MM for a, b in celdas.get((math.floor(p[0]), math.floor(p[1])), ()))

    grupos = []
    total = cubierta = 0.0
    for g in estructura:
        largo = hilo = hueco = maximo = 0.0
        for d in g.get("ejes") or []:
            for linea in _subpaths(d) or []:
                for i in range(1, len(linea)):
                    a, b = linea[i - 1], linea[i]
                    l = math.dist(a, b)
                    n = max(1, math.ceil(l / 0.1))
                    for k in range(n):
                        t = (k + 0.5) / n
                        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                        paso = l / n
                        largo += paso
                        if cubierto(p):
                            hilo += paso
                            hueco = 0.0
                        else:
                            hueco += paso
                            maximo = max(maximo, hueco)
                hueco = 0.0
        ratio = hilo / largo if largo > 0 else 1.0
        grupos.append({"id": g.get("id"), "sourceLengthMm": round(largo, 2), "coveredLengthMm": round(hilo, 2), "coverageRatio": round(ratio, 4), "longestMissingSegmentMm": round(maximo, 2)})
        total += largo
        cubierta += hilo
    incompletos = [g for g in grupos if g["sourceLengthMm"] >= 1 and g["coverageRatio"] < COBERTURA_MINIMA_DE_ESTRUCTURA]
    return {
        "groups": len(grupos),
        "sourceLengthMm": round(total, 2),
        "coveredLengthMm": round(cubierta, 2),
        "coverageRatio": round(cubierta / total, 4) if total > 0 else 1.0,
        "worstGroups": sorted(grupos, key=lambda g: g["coverageRatio"])[:5],
        "incomplete": [g["id"] for g in incompletos],
    }


INCERTIDUMBRE_DE_REDONDEO_MM = 0.05
"""El DST guarda décimas de mm: media décima de error al redondear."""

HILO_MEDIO_MM = 0.2
"""Medio hilo asentado (0.4 mm): hasta ahí de su eje, una puntada tapa la tela."""

COUNTER_MINIMO_MM = 0.2
"""Un hueco más estrecho que esto (medio hilo) es un poro, no un counter: el
mismo `COUNTER_MINIMO_MM` de `estructura.ts` (la preparación)."""


def _segmentos_cosidos(pattern: pe.EmbPattern, dx: float, dy: float, margen: float) -> dict[tuple[int, int], list[tuple[tuple[float, float], tuple[float, float]]]]:
    """Cada tramo de hilo (puntada a puntada, sin saltos), en mm del diseño, por celda de 1 mm."""
    celdas: dict[tuple[int, int], list[tuple[tuple[float, float], tuple[float, float]]]] = defaultdict(list)
    previo = None
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        punto = (float(x) / 10 + dx, float(y) / 10 + dy)
        if kind == pe.STITCH and previo is not None:
            a, b = previo, punto
            for cx in range(math.floor(min(a[0], b[0]) - margen), math.floor(max(a[0], b[0]) + margen) + 1):
                for cy in range(math.floor(min(a[1], b[1]) - margen), math.floor(max(a[1], b[1]) + margen) + 1):
                    celdas[(cx, cy)].append((a, b))
        previo = punto if kind == pe.STITCH else None
    return celdas


def topologia_en_dst(pattern: pe.EmbPattern, objects: list[dict[str, Any]], verdad: list[dict[str, Any]]) -> dict[str, Any]:
    """V6.1: las piezas y los counters de la VERDAD ORIGINAL, buscados en el DST.

    Sólo se juzga lo que llegó entero al IR (`enIR`): lo que ya divergió
    antes es una incidencia de la preparación, con su frontera. Una pieza
    se pierde en el DST si la mayoría de sus sondas no tiene hilo cerca; un
    counter, si hay hilo sobre su polo.

    INCERTIDUMBRE, NO CERTEZA INVENTADA: el DST no dice qué puntada es de
    qué objeto y su posición se deduce centrando cajas (`atribuir_puntadas`,
    heurístico hasta V6.3). El error de ese centrado se acota por lo que
    difieren las dos cajas: si la respuesta cambia dentro de ese margen, el
    resultado es `inconclusive` y no una pérdida.

    NO EVALÚA piezas unidas o partidas ni counters nuevos en el DST: sin la
    identidad de cada puntada no se puede afirmar (V6.3).
    """
    if not verdad:
        return {"evaluated": False}
    atribucion = atribuir_puntadas(pattern, objects)
    dx, dy = atribucion["offset"]
    puntadas = _puntadas(pattern)
    formas = [_Forma(o) for o in objects]
    cajas = [f.caja for f in formas if f.caja]
    if not puntadas or not cajas:
        return {"evaluated": False}
    # Las cajas de `_Forma` llevan un margen por lado; el diseño mide sin él.
    margen_de_forma = 2 * (TOLERANCIA_DE_OBJETO_MM + 0.05)
    ancho_diseno = max(c[2] for c in cajas) - min(c[0] for c in cajas) - margen_de_forma
    alto_diseno = max(c[3] for c in cajas) - min(c[1] for c in cajas) - margen_de_forma
    xs = [p[0] for _, p, _ in puntadas]
    ys = [p[1] for _, p, _ in puntadas]
    # Centrar dos cajas que no miden lo mismo se equivoca, como mucho, en media diferencia.
    u = max(abs((max(xs) - min(xs)) - ancho_diseno), abs((max(ys) - min(ys)) - alto_diseno)) / 2 + INCERTIDUMBRE_DE_REDONDEO_MM
    margen = TOLERANCIA_DE_EJE_MM + u
    celdas = _segmentos_cosidos(pattern, dx, dy, margen)

    def mas_cercano(p: tuple[float, float]) -> float:
        return min((_dist_to_segment(p, a, b) for a, b in celdas.get((math.floor(p[0]), math.floor(p[1])), ())), default=math.inf)

    perdidas: list[dict[str, Any]] = []
    tapados: list[dict[str, Any]] = []
    inconclusas: list[dict[str, Any]] = []
    evaluadas = {"components": 0, "counters": 0}
    for fuente in verdad:
        for c in fuente.get("componentes") or []:
            if c.get("enIR") != "conservada" or not c.get("sondas"):
                continue
            evaluadas["components"] += 1
            d = [mas_cercano((float(x), float(y))) for x, y in c["sondas"]]
            cerca = sum(1 for v in d if v <= TOLERANCIA_DE_EJE_MM)
            if cerca * 2 >= len(d):
                continue
            # Con el error de centrado a favor, ¿aparece el hilo? Entonces no se puede afirmar.
            cerca_con_margen = sum(1 for v in d if v <= TOLERANCIA_DE_EJE_MM + u)
            registro = {"id": c.get("id"), "probesWithThread": cerca, "probes": len(d), "widthMm": c.get("anchoMm")}
            if cerca_con_margen * 2 >= len(d) or c.get("incierto"):
                inconclusas.append({**registro, "kind": "component"})
            else:
                perdidas.append(registro)
        for h in fuente.get("counters") or []:
            if h.get("enIR") != "conservada" or not h.get("polo"):
                continue
            evaluadas["counters"] += 1
            v = mas_cercano((float(h["polo"][0]), float(h["polo"][1])))
            # Lo que queda libre alrededor del polo: hasta el borde del hilo más cercano.
            # Sigue siendo counter si ese radio es de medio COUNTER_MINIMO_MM; con el
            # error de centrado, abierto seguro o tapado seguro, y si no, inconcluso.
            libre = v - HILO_MEDIO_MM
            if libre - u >= COUNTER_MINIMO_MM / 2:
                continue
            registro = {"id": h.get("id"), "threadDistanceMm": round(v, 3), "freeRadiusMm": round(libre, 3), "widthMm": h.get("anchoMm")}
            if libre + u < COUNTER_MINIMO_MM / 2 and not h.get("incierto"):
                tapados.append(registro)
            else:
                inconclusas.append({**registro, "kind": "counter"})
    return {
        "evaluated": True,
        "alignmentUncertaintyMm": round(u, 3),
        "evaluatedFeatures": evaluadas,
        "componentsLost": perdidas,
        "countersLost": tapados,
        "inconclusive": inconclusas,
        "notEvaluated": ["COMPONENT_SPLIT", "COMPONENT_MERGED", "HOLE_CREATED"],
    }
