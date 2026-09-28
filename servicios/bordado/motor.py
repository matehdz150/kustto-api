"""El motor de bordado: un diseño entra, unos archivos salen.

YA NO HABLA CON NADIE. Antes este archivo leia de SQS, tomaba el trabajo en
DynamoDB con una escritura condicional, bajaba el diseno de S3, subia los
artefactos y escribia el resultado -- tres sistemas dentro de un script que
ademas tenia que saber que nombres son palabras reservadas de DynamoDB, y ya
fallo por eso: `metrics` lo es, y el trabajo moria en la ultima linea DESPUES
de que el motor hubiera corrido setenta y cinco segundos, con el DST ya hecho.

Ahora es una funcion. La cola, la base y S3 los lleva el proceso de TypeScript
que lo invoca (`src/bordado/digitalizador.service.ts`); aqui no hay ninguna
credencial ni ningun cliente de nube. Lo que queda es lo unico que este archivo
sabe hacer y no se puede escribir en otro lenguaje: armar el SVG, llamar a
Ink/Stitch y analizar el DST que sale.

    python3 motor.py <design.json> <carpeta-de-salida>

Escribe el resultado en JSON por la salida estandar. Si falla, el motivo va en
la ULTIMA LINEA del error, en mayusculas, para que quien lo llama lo distinga
de un fallo cualquiera.
"""

from __future__ import annotations

import hashlib
import html
import json
import math
import os
import re
import shutil
import sys
import traceback
import subprocess
import tempfile
import time
from collections import Counter
from pathlib import Path
from typing import Any, Callable

import pyembroidery as pe
from PIL import Image, ImageDraw
from quality import _subpaths, analyze_design_geometry, analyze_overlap_breakdown, analyze_stitch_plan, cobertura_de_estructura, render_embroidered_preview, topologia_en_dst
import cobertura
import puntadas
import identidad as idn
import reparacion
import tecnica

INKSTITCH = os.environ.get("INKSTITCH_PATH", "/opt/inkstitch/bin/inkstitch")
#: La versión de Ink/Stitch de la imagen (la misma que exige `validate_design`): parte de la clave de un cosido.
INKSTITCH_VERSION = "inkstitch-3.3.0"
ENGINE_TIMEOUT = int(os.environ.get("KUSTTO_ENGINE_TIMEOUT", "75"))
MAX_INPUT_BYTES = 750_000
#: El largo de puntada de un corrido (el de Ink/Stitch y, en V6.7.0, el tope de puntadas.py).
LARGO_DE_CORRIDO_MM = 2.2
#: V6.7.0: la tolerancia con que Ink/Stitch cose un path que ya trae un nodo por puntada:
#: saltarse un nodo lo separaría del path más que esto, así que entra en todos.
TOLERANCIA_DE_NODOS_MM = 0.01
PATH_RE = re.compile(r"^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$")
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
NUMBER_RE = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
# Los perfiles que este worker sabe leer, por version. TIENEN QUE SEGUIR A LOS
# DE `packages/bordado/src/profile.ts`: son el mismo contrato en dos lenguajes.
# Cuando se anadio v2 sin tocar esta tabla, el worker rechazo TODOS los disenos
# con UNSUPPORTED_VERSION y los jobs acabaron en FAILED sin llegar al motor. La
# validacion cruzada es deliberada —el navegador no es de fiar— pero tiene que
# conocer las mismas versiones.
#
# Los techos de v2 son mayores porque cuentan otra cosa: alli una letra son
# varias columnas (un objeto cada una) y un relleno lleva sus contraformas como
# subtrazados, asi que el mismo diseno suma mas objetos y mas subtrazados sin
# ser mas complejo de bordar.
PROFILES = {
    "experimental-v1-2026-09-05": {"maxObjects": 120, "maxComponents": 100, "maxNodes": 8000, "maxColors": 8, "maxGradient": .18, "maxTexture": .42, "maxEntropy": 6.8},
    "experimental-v2-2026-09-06": {"maxObjects": 300, "maxComponents": 320, "maxNodes": 40000, "maxColors": 8, "maxGradient": .18, "maxTexture": .42, "maxEntropy": 6.8},
    "experimental-v3-2026-09-06": {"maxObjects": 300, "maxComponents": 320, "maxNodes": 40000, "maxColors": 8, "maxGradient": .18, "maxTexture": .42, "maxEntropy": 6.8},
    "experimental-hybrid-v4-2026-09-06": {"maxObjects": 300, "maxComponents": 320, "maxNodes": 40000, "maxColors": 8, "maxGradient": .18, "maxTexture": .42, "maxEntropy": 6.8},
    # V6.9.0: v5 con sus propios topes, los de lo que cuesta coserlo (ver `profile.ts`): 600 objetos,
    # 800 componentes (un satin por rails es UNA columna) y 80 000 nodos. Los de v2 rechazaban el escudo
    # de Harley a 80 mm, que cosido sin tope sale en 51 s.
    "experimental-vector-v5-2026-09-25": {"maxObjects": 600, "maxComponents": 800, "maxNodes": 80000, "maxColors": 8, "maxGradient": .18, "maxTexture": .42, "maxEntropy": 6.8},
}

# Los perfiles que traen guardrails de trayectoria, satin a 6.5 mm y la vista
# de hilo. v5 cambia de donde sale la geometria —las curvas de la letra en vez
# de un esqueleto de pixeles—, no las puntadas: se mide con las mismas reglas
# que v4, que es lo que permite comparar las dos con el mismo diseno.
CON_GUARDRAILS = ("experimental-v3-2026-09-06", "experimental-hybrid-v4-2026-09-06", "experimental-vector-v5-2026-09-25")
# Los perfiles cuyas incidencias de revision de la preparacion cuentan aqui.
# Los anteriores las generaban sin que el motor las leyera; empezar a leerlas
# ahora cambiaria el estado de disenos que ya se aprobaron con ellos.
CON_REVISION_DE_PREPARACION = ("experimental-vector-v5-2026-09-25",)


def profile_for(design: dict[str, Any]) -> dict[str, Any]:
    """El perfil del diseno. Lanza si no lo conocemos: no se adivina."""
    perfil = PROFILES.get(design.get("profileVersion"))
    if perfil is None:
        raise ValueError("UNSUPPORTED_VERSION")
    return perfil


def log(event: str, **fields: Any) -> None:
    print(json.dumps({"event": event, **fields}, separators=(",", ":"), default=str))


def emit_metrics(event: str, job_id: str, design_hash: str, result: dict[str, Any], total_ms: float) -> None:
    values = {event: 1, "engineMs": result.get("engineMs", 0), "totalMs": total_ms, **{key: result.get("metrics", {}).get(key, 0) for key in ("stitchCount", "colorCount", "jumps", "trims")}}
    metrics = [{"Name": name, "Unit": "Milliseconds" if name.endswith("Ms") else "Count"} for name in values]
    print(json.dumps({"_aws":{"Timestamp":int(time.time()*1000),"CloudWatchMetrics":[{"Namespace":"Kustto/Embroidery","Dimensions":[[]],"Metrics":metrics}]},"jobId":job_id,"designHash":design_hash,**values}, separators=(",", ":")))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_design(design: dict[str, Any], design_hash: str, canonical_hash_verified: bool = False) -> None:
    if not canonical_hash_verified:
        canonical = json.dumps(design, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        if hashlib.sha256(canonical.encode("utf-8")).hexdigest() != design_hash:
            raise ValueError("DESIGN_HASH_MISMATCH")
    if design.get("schemaVersion") != 1 or design.get("engineVersion") != "inkstitch-3.3.0":
        raise ValueError("UNSUPPORTED_VERSION")
    profile = profile_for(design)
    physical = design.get("physical") or {}
    width, height = float(physical.get("widthMm", 0)), float(physical.get("heightMm", 0))
    if not (math.isfinite(width) and math.isfinite(height) and 0 < width <= 90 and 0 < height <= 60):
        raise ValueError("INVALID_DIMENSIONS")
    def valid_box(box: dict[str, Any] | None) -> bool:
        if not isinstance(box, dict): return False
        try: x, y, box_width, box_height = (float(box[key]) for key in ("xMm", "yMm", "widthMm", "heightMm"))
        except (KeyError, TypeError, ValueError): return False
        return all(math.isfinite(value) for value in (x, y, box_width, box_height)) and x >= -.1 and y >= -.1 and box_width > 0 and box_height > 0 and x + box_width <= width + .1 and y + box_height <= height + .1
    if not valid_box(design.get("bounds")):
        raise ValueError("INVALID_BOUNDS")
    colors, objects = design.get("colors"), design.get("objects")
    if not isinstance(colors, list) or not 1 <= len(colors) <= profile["maxColors"]:
        raise ValueError("INVALID_COLORS")
    if any(not item.get("id") or not HEX_RE.fullmatch(str(item.get("sourceHex", ""))) or not HEX_RE.fullmatch(str(item.get("displayHex", ""))) for item in colors):
        raise ValueError("INVALID_COLORS")
    if not isinstance(objects, list) or not 1 <= len(objects) <= profile["maxObjects"]:
        raise ValueError("INVALID_OBJECTS")
    total_nodes = 0
    color_ids = {item.get("id") for item in colors}
    preparacion = design.get("preparation") or {}
    preparado_desde_raster = isinstance(preparacion.get("raster"), dict)
    if preparacion and preparacion.get("profileVersion") != design.get("profileVersion"):
        # Si la preparacion dijera otra version que el diseno, no se sabria con
        # que reglas se genero la geometria.
        raise ValueError("PREPARATION_MISMATCH")
    for obj in objects:
        geometry = obj.get("geometry") or {}
        path = geometry.get("d", "")
        # Un raster sigue prohibido A MENOS que el diseno traiga el bloque de
        # preparacion, que es la prueba de que su geometria salio de segmentar y
        # medir la imagen en milimetros y no de colar un <image>. La regla no se
        # relaja, se le pone una prueba —igual que en `validation.ts`, que es el
        # mismo contrato en el otro lenguaje—. Sin esto el worker rechazaba TODO
        # diseno con imagen, que es la mitad del producto.
        if obj.get("sourceType") == "raster" and not preparado_desde_raster:
            raise ValueError("RASTER_NOT_PREPARED")
        if geometry.get("kind") != "path" or not path or len(path) > 200_000 or not PATH_RE.fullmatch(path):
            raise ValueError("UNSAFE_GEOMETRY")
        coordinates = [float(value) for value in NUMBER_RE.findall(path)]
        if not coordinates or any(not math.isfinite(value) or abs(value) > 1000 for value in coordinates):
            raise ValueError("UNSAFE_GEOMETRY")
        if geometry.get("fillRule", "evenodd") not in ("evenodd", "nonzero"):
            raise ValueError("UNSAFE_GEOMETRY")
        if obj.get("colorId") not in color_ids:
            raise ValueError("INVALID_COLOR_REFERENCE")
        if not valid_box(obj.get("bounds")):
            raise ValueError("INVALID_OBJECT_BOUNDS")
        stitch = obj.get("stitch") or {}
        if stitch.get("type") not in ("running", "satin", "fill"):
            raise ValueError("INVALID_STITCH")
        if stitch.get("satinMode") not in (None, "stroke", "rails"):
            raise ValueError("INVALID_SATIN_MODE")
        if stitch.get("satinMode") == "rails" and stitch.get("type") != "satin":
            raise ValueError("INVALID_SATIN_MODE")
        spacing = stitch.get("spacingMm")
        if spacing is not None and (not math.isfinite(float(spacing)) or not .2 <= float(spacing) <= 2):
            raise ValueError("INVALID_STITCH_SPACING")
        maximum = stitch.get("maxStitchLengthMm")
        if maximum is not None and (not math.isfinite(float(maximum)) or not 1 <= float(maximum) <= 12):
            raise ValueError("INVALID_STITCH_LENGTH")
        for name, minimum, maximum_allowed in (("strokeWidthMm", .1, 20), ("pullCompensationMm", 0, 5), ("angleDeg", -360, 360)):
            value = stitch.get(name)
            if value is not None and (not math.isfinite(float(value)) or not minimum <= float(value) <= maximum_allowed):
                raise ValueError("INVALID_STITCH_PARAMETER")
        # Repasos de un corrido (bean): sólo en corridos y sólo 0, 1 o 2. Sin
        # el campo se cose triple, como siempre.
        bean = stitch.get("beanRepeats")
        if bean is not None and (stitch.get("type") != "running" or isinstance(bean, bool) or bean not in (0, 1, 2)):
            raise ValueError("INVALID_STITCH_PARAMETER")
        # V6.6.0: la tolerancia de un corrido (su eje ya regularizado): sólo en corridos, 0.02–1 mm.
        tolerancia = stitch.get("toleranceMm")
        if tolerancia is not None and (stitch.get("type") != "running" or isinstance(tolerancia, bool) or not math.isfinite(float(tolerancia)) or not .02 <= float(tolerancia) <= 1):
            raise ValueError("INVALID_STITCH_PARAMETER")
        # V6.7.0: dónde entra la aguja en un corrido fino (ver puntadas.py): sólo "curvatura", sólo en corridos.
        reparto = stitch.get("placement")
        if reparto is not None and (stitch.get("type") != "running" or reparto != "curvatura"):
            raise ValueError("INVALID_STITCH_PARAMETER")
        actual_nodes = len(re.findall(r"[MmLlHhVvCcSsQqTtAa]", path))
        if actual_nodes < 1 or int(obj.get("nodeCount", 0)) != actual_nodes:
            raise ValueError("INVALID_NODE_COUNT")
        total_nodes += actual_nodes
    if total_nodes <= 0:
        raise ValueError("INVALID_NODE_COUNT")


def early_analysis(design: dict[str, Any]) -> tuple[str, float, list[dict[str, str]]]:
    profile = profile_for(design)
    metrics = design.get("metrics") or {}
    objects = design["objects"]
    reasons: list[dict[str, str]] = []
    es_foto = any(item.get("classification") == "photo" for item in objects)
    if es_foto: reasons.append({"code": "PHOTO", "message": "Las fotografías no son aptas para este bordado automático.", "severity": "reject"})
    if float(metrics.get("gradientRatio", 0)) > profile["maxGradient"]:
        # UN DEGRADADO NO RECHAZA UN GRAFICO, LO MANDA A REVISION.
        #
        # `maxGradient` viene del perfil v1, cuando el navegador nunca producia
        # esta metrica porque v1 rechazaba todo raster: es un limite calibrado
        # contra nada que se aplica por primera vez a una medida que solo existe
        # desde v2. El logo Discovery da 0.1906 contra un tope de 0.18 —un 6 %—
        # y acababa rechazado siendo un logo perfectamente bordable.
        #
        # En una fotografia el degradado SI es motivo de rechazo, pero eso ya lo
        # dice `PHOTO`; aqui, sobre un grafico, lo unico que significa es que
        # alguien deberia mirarlo antes de coserlo.
        reasons.append({
            "code": "COMPLEX_GRADIENT",
            "message": "Este diseño tiene degradados y el bordado los simplifica; lo revisamos antes de fabricarlo.",
            "severity": "reject" if es_foto else "review",
        })
    if float(metrics.get("texture", 0)) > profile["maxTexture"] or float(metrics.get("colorEntropy", 0)) > profile["maxEntropy"]: reasons.append({"code": "COMPLEX_TEXTURE", "message": "La textura es demasiado compleja para bordado automático.", "severity": "reject"})
    nodes = sum(int(item.get("nodeCount", 0)) for item in objects)
    # En v5 un rung no es un componente, y un satin por rails es UNA columna (una unidad de cosido,
    # V6.9.0: no sus dos rails). Igual que `validation.ts`.
    sin_rungs = design.get("profileVersion") in CON_REVISION_DE_PREPARACION
    components = sum(1 if sin_rungs and item["stitch"].get("satinMode") == "rails" else len(re.findall(r"[Mm]", item["geometry"]["d"])) for item in objects)
    if components > profile["maxComponents"] or nodes > profile["maxNodes"]: reasons.append({"code": "TOO_COMPLEX", "message": "El diseño tiene demasiados detalles pequeños; simplifícalo.", "severity": "reject"})
    # Un solo motivo de rechazo manda sobre todos los de revision.
    if any(motivo["severity"] == "reject" for motivo in reasons):
        return "REJECTED", .98, [m for m in reasons if m["severity"] == "reject"]
    if any(item.get("classification") == "illustration" for item in objects):
        reasons.append({"code": "ILLUSTRATION_REVIEW", "message": "Este diseño necesita revisión antes de fabricarse.", "severity": "review"})
    if design.get("profileVersion") in CON_REVISION_DE_PREPARACION:
        # LO QUE LA PREPARACION NO RESOLVIO CON CONFIANZA NO SE DA POR BUENO.
        # v5 marca a revision un degradado aproximado, un texto sin curvas o
        # una forma que no supo descomponer, en vez de esconderlo con un
        # relleno. Aqui solo se hace caso a las de revision.
        #
        # V6.2: SOLO LAS DEL SERVIDOR. La preparacion que llega aqui la hizo el
        # nucleo en el servidor desde el original (y marca sus incidencias
        # `SERVER_STRUCTURAL`); una incidencia sin esa procedencia la escribio un
        # navegador y no decide nada. El worker ya quita las del navegador; esto
        # es la segunda cerradura, por si alguien llama al motor con un diseno
        # que no preparo el servidor.
        vistos = {motivo["code"] for motivo in reasons}
        for incidencia in (design.get("preparation") or {}).get("issues") or []:
            if not isinstance(incidencia, dict) or incidencia.get("severity") != "review":
                continue
            if incidencia.get("source") != "SERVER_STRUCTURAL":
                continue
            codigo, mensaje = str(incidencia.get("code", "")), str(incidencia.get("message", ""))
            if re.fullmatch(r"[A-Z0-9_]{1,64}", codigo) and codigo not in vistos:
                vistos.add(codigo)
                reasons.append({"code": codigo, "message": mensaje[:300], "severity": "review", "source": "SERVER_STRUCTURAL"})
    if reasons: return "REVIEW", .82, reasons
    return "READY", .94, []


def _bounds_overlap(first: dict[str, Any], second: dict[str, Any]) -> bool:
    a, b = first["bounds"], second["bounds"]
    return not (
        float(a["xMm"]) + float(a["widthMm"]) <= float(b["xMm"])
        or float(b["xMm"]) + float(b["widthMm"]) <= float(a["xMm"])
        or float(a["yMm"]) + float(a["heightMm"]) <= float(b["yMm"])
        or float(b["yMm"]) + float(b["heightMm"]) <= float(a["yMm"])
    )


def _center(obj: dict[str, Any]) -> tuple[float, float]:
    box = obj["bounds"]
    return float(box["xMm"]) + float(box["widthMm"]) / 2, float(box["yMm"]) + float(box["heightMm"]) / 2


def ordered_objects(design: dict[str, Any]) -> list[dict[str, Any]]:
    """Nearest-neighbor sólo donde el stacking es demostrablemente irrelevante."""
    objects = list(design["objects"])
    if design.get("profileVersion") not in ("experimental-v3-2026-09-06", "experimental-hybrid-v4-2026-09-06"):
        return objects
    output: list[dict[str, Any]] = []
    previous = (0.0, 0.0)
    start = 0
    while start < len(objects):
        end = start + 1
        while end < len(objects) and objects[end].get("colorId") == objects[start].get("colorId"):
            end += 1
        group = objects[start:end]
        has_dependencies = any(item.get("dependencies") for item in group)
        overlaps = any(_bounds_overlap(group[i], group[j]) for i in range(len(group)) for j in range(i + 1, len(group)))
        if len(group) < 3 or has_dependencies or overlaps:
            output.extend(group)
        else:
            remaining = list(group)
            while remaining:
                selected = min(range(len(remaining)), key=lambda i: math.dist(previous, _center(remaining[i])))
                item = remaining.pop(selected)
                output.append(item)
                previous = _center(item)
        if output:
            previous = _center(output[-1])
        start = end
    return output


def relleno_pesado(design: dict[str, Any], plan: dict[str, Any], dst: dict[str, Any]) -> dict[str, Any] | None:
    """El `HEAVY_FILL` de la preparacion, con las puntadas y la densidad del DST.

    ES INFORMATIVO Y NO CAMBIA EL ESTADO: una placa solida con geometria y
    densidad validas puede estar lista. La preparacion estima las puntadas;
    aqui se cuentan las que de verdad salieron.
    """
    if design.get("profileVersion") not in CON_REVISION_DE_PREPARACION:
        return None
    previa = next((i for i in (design.get("preparation") or {}).get("issues") or [] if isinstance(i, dict) and i.get("code") == "HEAVY_FILL"), None)
    if previa is None:
        return None
    metricas = {k: v for k, v in (previa.get("metrics") or {}).items() if isinstance(v, (int, float))}
    metricas.update({"puntadas": int(dst.get("stitchCount", 0)), "densidadMaxima": int(plan.get("maxLocalDensity", 0))})
    return {
        "code": "HEAVY_FILL",
        "message": f"Relleno grande: {metricas.get('areaMayorMm2', '?')} mm² en una pieza; el diseño lleva {metricas['puntadas']} puntadas y una densidad máxima de {metricas['densidadMaxima']} por mm².",
        "severity": "info",
        "metrics": metricas,
    }


def paleta_por_bloque(design: dict[str, Any]) -> list[str]:
    """Un color por bloque de hilo del DST, en el orden en que se cosen.

    Ink/Stitch abre un bloque cada vez que cambia el color entre dos objetos
    seguidos. Un logo puede coser el mismo hilo dos veces —rojo, azul y otra
    vez rojo, cuando algo rojo va encima de lo azul—, y con la paleta de
    `colors`, que tiene un hilo por color, el tercer bloque salia pintado de
    azul en la vista previa.
    """
    colores = {item["id"]: item["displayHex"] for item in design["colors"]}
    paleta: list[str] = []
    previo = None
    for obj in ordered_objects(design):
        if obj["colorId"] != previo:
            paleta.append(colores[obj["colorId"]])
            previo = obj["colorId"]
    return paleta or [item["displayHex"] for item in design["colors"]]


def estimated_object_travel(objects: list[dict[str, Any]]) -> float:
    points = [(0.0, 0.0), *(_center(item) for item in objects)]
    return round(sum(math.dist(points[i - 1], points[i]) for i in range(1, len(points))), 2)


def build_svg(design: dict[str, Any], target: Path) -> None:
    width, height = design["physical"]["widthMm"], design["physical"]["heightMm"]
    colors = {item["id"]: item["displayHex"] for item in design["colors"]}
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkstitch="http://inkstitch.org/namespace" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">', '<metadata><inkstitch:min_stitch_len_mm>0.3</inkstitch:min_stitch_len_mm><inkstitch:collapse_len_mm>3</inkstitch:collapse_len_mm><inkstitch:min_satin_stroke_width_mm>1.5</inkstitch:min_satin_stroke_width_mm><inkstitch:inkstitch_svg_version>4</inkstitch:inkstitch_svg_version></metadata>']
    objects = ordered_objects(design)
    # V6.7.0: dónde está el hilo de cada pieza, para que el reparto de un corrido no se acerque a otra.
    otras = _segmentos_de_otras(objects) if any((o.get("stitch") or {}).get("placement") for o in objects) else []
    for index, obj in enumerate(objects):
        stitch = obj["stitch"]; kind = stitch["type"]; color = colors[obj["colorId"]]; d = html.escape(obj["geometry"]["d"], quote=True); ident = html.escape(obj["id"], quote=True)
        if kind == "satin":
            stroke_width = '' if stitch.get("satinMode") == "rails" else f' stroke-width="{float(stitch.get("strokeWidthMm", 2.2))}" stroke-linecap="round" stroke-linejoin="round"'
            # EL DST REDONDEA A 0.1 MM. Una puntada de 6.49 mm que Ink/Stitch
            # deja entera sale en el archivo con hasta 0.14 mm mas (los dos
            # extremos redondeados) y el guardrail de 6.5 mm la marca: en v5,
            # la division de puntadas va a 6.3 para que el plan real nunca lo
            # pase por redondeo. El guardrail sigue en 6.5.
            perfil = design.get("profileVersion")
            max_satin = 6.3 if perfil == "experimental-vector-v5-2026-09-25" else 6.5 if perfil in CON_GUARDRAILS else 8
            underlay = str(bool(stitch.get("underlay", True))).lower()
            attrs = f'fill="none" stroke="{color}"{stroke_width} inkstitch:satin_column="true" inkstitch:zigzag_spacing_mm="{float(stitch.get("spacingMm", .42))}" inkstitch:pull_compensation_mm="{float(stitch.get("pullCompensationMm", .2))}" inkstitch:center_walk_underlay="{underlay}" inkstitch:max_stitch_length_mm="{max_satin}"'
        elif kind == "running":
            # UN FILETE NO SE COSE TRIPLE. El bean (cada puntada tres veces)
            # le da cuerpo a una linea de trazo; en un filete de 0.2 mm lo
            # triplica y, con los remates encima, apila el hilo en el mismo
            # sitio. v5 dice cuantos repasos quiere; sin el campo, triple.
            bean = int(stitch.get("beanRepeats", 1))
            attrs = f'fill="none" stroke="{color}" stroke-width="{float(stitch.get("strokeWidthMm", .3))}" inkstitch:stroke_method="running_stitch" inkstitch:running_stitch_length_mm="{LARGO_DE_CORRIDO_MM}" inkstitch:bean_stitch_repeats="{bean}"'
            # V6.6.0: un eje regularizado se sigue de cerca (sin el campo, la de Ink/Stitch: 0.2 mm).
            if stitch.get("toleranceMm") is not None:
                attrs += f' inkstitch:running_stitch_tolerance_mm="{float(stitch["toleranceMm"])}"'
            # V6.7.0: con `placement`, la aguja la pone puntadas.py (repartida por la
            # curvatura y centrada en el eje): el path lleva un nodo por puntada y,
            # con la tolerancia casi a cero, Ink/Stitch no puede saltarse ninguno.
            # No es el modo manual de Ink/Stitch (`stroke_method="manual_stitch"`):
            # ése cose los nodos pero sin remates, y el hilo se suelta. Así sigue
            # poniendo sus remates y su bean como en cualquier corrido.
            propias = puntadas_de(obj, otras) if stitch.get("placement") == "curvatura" else None
            if propias:
                d = html.escape(propias, quote=True)
                attrs = f'fill="none" stroke="{color}" stroke-width="{float(stitch.get("strokeWidthMm", .3))}" inkstitch:stroke_method="running_stitch" inkstitch:running_stitch_length_mm="{LARGO_DE_CORRIDO_MM}" inkstitch:running_stitch_tolerance_mm="{TOLERANCIA_DE_NODOS_MM}" inkstitch:bean_stitch_repeats="{bean}"'
        else:
            attrs = f'fill="{color}" fill-rule="{obj["geometry"].get("fillRule", "evenodd")}" stroke="none" inkstitch:fill_method="tatami_fill" inkstitch:angle="{float(stitch.get("angleDeg", (index % 4) * 45))}" inkstitch:row_spacing_mm="{float(stitch.get("spacingMm", .45))}" inkstitch:max_stitch_length_mm="{float(stitch.get("maxStitchLengthMm", 4))}" inkstitch:fill_underlay="{str(bool(stitch.get("underlay", True))).lower()}" inkstitch:pull_compensation_mm="{float(stitch.get("pullCompensationMm", .15))}" inkstitch:trim_after="{str(bool(stitch.get("trimAfter", index < len(objects) - 1))).lower()}"'
        # El corte de hilo de un satin o un corrido, SOLO si el diseño lo pide:
        # v5 lo pone al acabar cada letra —un salto corto Ink/Stitch lo cose
        # como puntada, una raya de hilo sobre la tela—, y los disenos de
        # perfiles anteriores, que no lo mandan, se cosen igual que siempre.
        if kind != "fill" and "trimAfter" in stitch:
            attrs += f' inkstitch:trim_after="{str(bool(stitch["trimAfter"])).lower()}"'
        parts.append(f'<path id="{ident}" d="{d}" {attrs} />')
    parts.append("</svg>")
    target.write_text("\n".join(parts), encoding="utf-8")


#: V6.7.0: de otra pieza, sólo cuenta lo que está a menos de esto de la caja del corrido.
CERCA_DE_OTRA_PIEZA_MM = 1.5


def _segmentos_de_otras(objects: list[dict[str, Any]]) -> list[tuple[str, frozenset[str], tuple[float, float, float, float], list[tuple[tuple[float, float], tuple[float, float]]]]]:
    """Por objeto: su id, sus piezas de tinta, su caja y los segmentos de su geometría (el eje de un
    corrido, los rails de un satin, el borde de un relleno): dónde está el hilo de cada pieza."""
    salida = []
    for o in objects:
        lineas = _subpaths(o["geometry"]["d"]) or []
        segs = [(a, b) for l in lineas for a, b in zip(l, l[1:])]
        if not segs:
            continue
        xs = [c for a, b in segs for c in (a[0], b[0])]
        ys = [c for a, b in segs for c in (a[1], b[1])]
        salida.append((o["id"], frozenset((o.get("identity") or {}).get("pieces") or []), (min(xs), min(ys), max(xs), max(ys)), segs))
    return salida


def _holgura_contra(obj: dict[str, Any], otras) -> Callable[[tuple[float, float]], float]:
    """La distancia de un punto a lo más cercano de OTRA pieza de tinta (las de la misma se tocan a propósito)."""
    propias = frozenset((obj.get("identity") or {}).get("pieces") or [])
    lineas = _subpaths(obj["geometry"]["d"]) or []
    xs = [p[0] for l in lineas for p in l] or [0.0]
    ys = [p[1] for l in lineas for p in l] or [0.0]
    m = CERCA_DE_OTRA_PIEZA_MM
    segs = [
        seg
        for id_, piezas, (x0, y0, x1, y1), lista in otras
        if id_ != obj["id"] and not (propias & piezas) and x0 <= max(xs) + m and x1 >= min(xs) - m and y0 <= max(ys) + m and y1 >= min(ys) - m
        for seg in lista
    ]

    def holgura(p: tuple[float, float]) -> float:
        mejor = math.inf
        for (ax, ay), (bx, by) in segs:
            vx, vy = bx - ax, by - ay
            l = vx * vx + vy * vy
            t = 0.0 if l < 1e-18 else max(0.0, min(1.0, ((p[0] - ax) * vx + (p[1] - ay) * vy) / l))
            mejor = min(mejor, math.hypot(p[0] - ax - vx * t, p[1] - ay - vy * t))
        return mejor

    return holgura


def puntadas_de(obj: dict[str, Any], otras=()) -> str | None:
    """V6.7.0: el path de un corrido con un nodo por puntada (ver puntadas.py). None si su path tiene curvas.

    Sin separarse del eje más que su tolerancia, y sin centrar un vértice hacia otra pieza (`otras`,
    de `_segmentos_de_otras`)."""
    subtrazos = _subpaths(obj["geometry"]["d"])
    if not subtrazos:
        return None
    tolerancia = obj["stitch"].get("toleranceMm")
    holgura = _holgura_contra(obj, otras) if otras else None
    partes = []
    for eje in subtrazos:
        if len(eje) < 2:
            continue
        nodos = puntadas.penetraciones(eje, LARGO_DE_CORRIDO_MM, tolerancia=float(tolerancia) if tolerancia is not None else None, holgura=holgura)
        # Un eje de un solo punto (sin largo) no tiene puntadas que repartir: se cose como venía.
        if len(nodos) < 2:
            return None
        partes.append("M" + "L".join(f"{x:.4f} {y:.4f}" for x, y in nodos))
    return "".join(partes) or None


def command_counts(pattern: pe.EmbPattern) -> Counter[int]:
    return Counter(int(stitch[2]) & pe.COMMAND_MASK for stitch in pattern.stitches)


def analyze_dst(path: Path) -> tuple[pe.EmbPattern, dict[str, Any]]:
    pattern = pe.read(str(path))
    if pattern is None: raise ValueError("DST_UNREADABLE")
    return pattern, metricas_de_dst(pattern)


def metricas_de_dst(pattern: pe.EmbPattern) -> dict[str, Any]:
    counts = command_counts(pattern); min_x, min_y, max_x, max_y = pattern.bounds()
    return {"widthMm": round((max_x-min_x)/10, 1), "heightMm": round((max_y-min_y)/10, 1), "stitchCount": counts[pe.STITCH], "colorCount": counts[pe.COLOR_CHANGE] + counts[pe.NEEDLE_SET] + 1, "colorChanges": counts[pe.COLOR_CHANGE] + counts[pe.NEEDLE_SET], "jumps": counts[pe.JUMP], "trims": counts[pe.TRIM]}


def validate_tajima(path: Path, parsed: dict[str, Any]) -> dict[str, Any]:
    data = path.read_bytes()
    header = data[:512].decode("ascii", errors="replace"); payload = data[512:]
    records = [payload[i:i+3] for i in range(0, len(payload)-2, 3)]
    x = y = min_x = max_x = min_y = max_y = colors = decoded = max_delta = 0; ended = False; movements = []; posiciones = []
    def delta(a: int, b: int, c: int, axis: str) -> int:
        if axis == "x": return ((a&1)and 1 or 0)-((a&2)and 1 or 0)+((b&1)and 3 or 0)-((b&2)and 3 or 0)+((a&4)and 9 or 0)-((a&8)and 9 or 0)+((b&4)and 27 or 0)-((b&8)and 27 or 0)+((c&4)and 81 or 0)-((c&8)and 81 or 0)
        return ((a&128)and 1 or 0)-((a&64)and 1 or 0)+((b&128)and 3 or 0)-((b&64)and 3 or 0)+((a&32)and 9 or 0)-((a&16)and 9 or 0)+((b&32)and 27 or 0)-((b&16)and 27 or 0)+((c&32)and 81 or 0)-((c&16)and 81 or 0)
    for a,b,c in records:
        if c == 0xF3: ended = True; break
        dx,dy=delta(a,b,c,"x"),delta(a,b,c,"y"); max_delta=max(max_delta,abs(dx),abs(dy)); x+=dx;y+=dy; posiciones.append((x,y))
        if c&0xC3 == 0xC3: colors+=1; kind="color"
        elif c&0x83 == 0x83: kind="jump"
        else: kind="stitch"
        movements.append((kind,dx,dy)); decoded+=1
    trims=0; index=0; excursion=set()
    while index <= len(movements)-3:
        first,second,third=movements[index:index+3]
        if first[0]==second[0]==third[0]=="jump" and first[1:]==third[1:] and second[1]==-2*first[1] and second[2]==-2*first[2] and first[1:]!=(0,0): trims+=1; excursion.update((index, index+1)); index+=3
        else: index+=1
    # LA CAJA SIN LAS EXCURSIONES DE LOS CORTES. El DST no tiene orden de
    # corte: se escribe como tres saltos (+d, -2d, +d) que vuelven al mismo
    # punto, y pyembroidery los lee como un corte sin moverse. Contar los dos
    # puntos de en medio agrandaba la caja un par de decimas cada vez que un
    # corte caia en el borde del diseno —al acabar la ultima letra, por
    # ejemplo— y un DST valido salia TAJIMA_INVALID.
    for i,(px,py) in enumerate(posiciones):
        if i in excursion: continue
        min_x=min(min_x,px);max_x=max(max_x,px);min_y=min(min_y,py);max_y=max(max_y,py)
    def header_number(prefix: str) -> int | None:
        for line in header.split("\r"):
            if line.startswith(prefix):
                try: return int(line[len(prefix):].strip())
                except ValueError: return None
        return None
    checks={"headerIs512Bytes":len(data)>=512 and header.startswith("LA:"),"payloadAlignedTo3Bytes":len(payload)%3==0,"hasEndRecord":ended,"headerRecordCountMatches":header_number("ST:")==decoded-2*trims+1,"headerColorChangesMatch":header_number("CO:")==colors,"boundsMatchPyembroidery":abs(round((max_x-min_x)/10,1)-parsed["widthMm"])<=.1 and abs(round((max_y-min_y)/10,1)-parsed["heightMm"])<=.1,"maxAxisMovementRepresentable":max_delta<=121}
    result={"passed":all(checks.values()),"checks":checks,"maxAxisDeltaTenthsMm":max_delta}
    if not result["passed"]:
        # QUE FALLO, no solo QUE fallo. Con el codigo a secas, un DST rechazado
        # es indistinguible de otro y no hay forma de saber si el problema es la
        # cabecera, el recuento o un movimiento que el formato no representa.
        # Los nombres van al registro; al comprador nunca se le ensena esto.
        fallaron = [nombre for nombre, ok in checks.items() if not ok]
        log("tajimaInvalido", checks=fallaron, maxAxisDeltaTenthsMm=max_delta, stitches=decoded)
        raise ValueError("TAJIMA_INVALID")
    return result


def render_preview(pattern: pe.EmbPattern, palette: list[str], target: Path) -> None:
    min_x, min_y, max_x, max_y = pattern.bounds(); width_mm = max(1, (max_x-min_x)/10); height_mm = max(1, (max_y-min_y)/10); scale = min(900/width_mm, 600/height_mm); margin = 40
    image = Image.new("RGB", (round(width_mm*scale+80), round(height_mm*scale+80)), "#f4f0e8"); draw = ImageDraw.Draw(image, "RGBA"); previous = None; block = 0
    for x, y, command in pattern.stitches:
        kind = int(command) & pe.COMMAND_MASK
        if kind in (pe.COLOR_CHANGE, pe.NEEDLE_SET): block += 1
        point = (margin+(x-min_x)/10*scale, margin+(y-min_y)/10*scale)
        if previous is not None and kind == pe.STITCH: draw.line((previous, point), fill=palette[min(block, len(palette)-1)]+"d9", width=max(1, round(scale*.07)))
        previous = point
    image.save(target, optimize=True)


def issues_de_tecnica(tecnica_: dict[str, Any]) -> list[dict[str, Any]]:
    """V6.4: las incidencias de técnica, una por objeto y código, con su medida.

    ERROR -> `review`; WARNING e INFO -> `info` (no cambian el estado). Los
    TECHNIQUE_UNCERTAIN se juntan en una: son falta de evidencia, no defectos."""
    salida: list[dict[str, Any]] = []
    inciertos: list[str] = []
    for o in tecnica_.get("objects") or []:
        for x in o.get("issues") or []:
            if x["code"] == "TECHNIQUE_UNCERTAIN":
                inciertos.append(str(o.get("objectId")))
                continue
            salida.append({
                "code": x["code"], "category": "technique", "message": x["message"],
                "severity": "review" if x["severity"] == "error" else "info", "techniqueSeverity": x["severity"],
                "objectId": x.get("objectId"), "irObject": x.get("irObject"), "technique": x.get("technique"),
                "measurement": x.get("measurement"), "expected": x.get("expected"), "confidence": x.get("confidence"),
            })
    if inciertos:
        unicos = sorted(set(inciertos))
        salida.append({"code": "TECHNIQUE_UNCERTAIN", "category": "technique", "severity": "info", "techniqueSeverity": "info", "objectIds": unicos, "message": f"La técnica de {len(unicos)} objeto(s) no se puede juzgar con sus puntadas (muy pocas, o sin su identidad entera): {', '.join(unicos[:8])}."})
    return salida


#: V6.4: qué parte del juicio pide cada REVIEW. Lo que no es estructura ni técnica es del plan.
_ESTRUCTURA = {"THIN_STRUCTURE_INCOMPLETE", "STRUCTURE_UNCERTAIN", "STRUCTURAL_STROKE_LOST"}
def categoria(issue: dict[str, Any]) -> str:
    if issue.get("category"):
        return str(issue["category"])
    codigo = str(issue.get("code", ""))
    # V6.4.1 (visto en el FULL): las de la preparación estructural del servidor (COUNTER_LOST,
    # LOOP_BROKEN, STRUCTURE_FRAGMENTED…) también son estructura, no plan.
    if issue.get("source") == "SERVER_STRUCTURAL":
        return "structure"
    return "structure" if codigo.startswith("TOPOLOGY_") or codigo in _ESTRUCTURA else "plan"


def razones_de_revision(issues: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Los códigos que piden revisión, por parte: todas las incidencias `review`, las del DST y
    las que ya traía la preparación (un TOPOLOGY_* del servidor es estructura)."""
    return {c: sorted({str(i["code"]) for i in issues if i.get("severity") == "review" and categoria(i) == c}) for c in ("structure", "technique", "plan")}


def quality_issues(design: dict[str, Any], geometry: dict[str, Any], plan: dict[str, Any]) -> list[dict[str, str]]:
    """Guardrails de trayectoria, independientes de PHOTO/GRAPHIC."""
    if design.get("profileVersion") not in CON_GUARDRAILS:
        return []
    issues: list[dict[str, str]] = []
    satin = geometry.get("satin") or {}
    if satin.get("maxWidthMm") is not None and float(satin["maxWidthMm"]) > 6:
        issues.append({"code": "SATIN_TOO_WIDE", "message": "Una columna satin supera 6 mm y requiere subdivisión o fill.", "severity": "review"})
    if float(plan.get("maxStitchLengthMm", 0)) > 6.5:
        issues.append({"code": "STITCH_TOO_LONG", "message": "El plan contiene puntadas por encima del guardrail de 6.5 mm.", "severity": "review"})
    # v5 SÓLO CUENTA EL SOLAPE REAL: sin los remates de Ink/Stitch, el repaso
    # de un mismo corrido ni el center-walk que vuelve por su columna (ver
    # `analyze_overlap_breakdown`). El umbral es el mismo. v3 y v4 siguen con
    # la medida con la que se calibraron.
    desglose = plan.get("overlapBreakdown") if design.get("profileVersion") in CON_REVISION_DE_PREPARACION else None
    solape = float(desglose["realOverlapDensity"]) if desglose else float(plan.get("overlapDensity", 0))
    if solape > .25:
        issues.append({"code": "EXCESSIVE_OVERLAP", "message": "La trayectoria acumula demasiado solape local.", "severity": "review"})
    # v5: una estructura fina que el DST no cose es REVIEW aunque la cobertura
    # de area sea buena (ver `cobertura_de_estructura`).
    trazo = plan.get("strokeCoverage") if design.get("profileVersion") in CON_REVISION_DE_PREPARACION else None
    if trazo and trazo.get("incomplete"):
        # V6.5.0: cuáles, con su recall de eje y su hueco mayor (StrokeCoverage por estructura).
        por_id = {g.get("id"): g for g in trazo.get("perGroup") or []}
        peores = sorted((por_id[i] for i in trazo["incomplete"] if i in por_id), key=lambda g: g["coverageRatio"])
        detalle = "; ".join(f"{g['id']} {round(100 * g['coverageRatio'])} % de eje, hueco {g['longestMissingSegmentMm']} mm" for g in peores[:4])
        issues.append({"code": "THIN_STRUCTURE_INCOMPLETE", "message": f"{len(trazo['incomplete'])} estructura(s) fina(s) no quedan cosidas en el DST: falta más del 10 % de su eje ({detalle}).", "severity": "review",
                       "metrics": {"estructuras": len(trazo["incomplete"]), "peorRecall": peores[0]["coverageRatio"] if peores else 0.0, "ejePerdidoMm": round(sum(g.get("missingLengthMm", 0) for g in peores), 2), "huecoMaxMm": max((g["longestMissingSegmentMm"] for g in peores), default=0.0)}})
    # V6.1: la verdad original contra el DST. Una pieza o un counter que
    # llegaron enteros al IR y no estan en el DST es REVIEW; si la heuristica
    # de alineacion no permite afirmarlo, es STRUCTURE_UNCERTAIN (tambien
    # REVIEW: no se puede decir que este bien).
    verdad = plan.get("structuralTruth") if design.get("profileVersion") in CON_REVISION_DE_PREPARACION else None
    if verdad and verdad.get("evaluated"):
        if verdad.get("componentsLost"):
            grupos = [x for x in verdad["componentsLost"] if x.get("kind") == "group"]
            piezas = len(verdad["componentsLost"]) - len(grupos)
            detalle = f"{piezas} pieza(s) del diseño original no tienen hilo en el DST" if piezas else ""
            if grupos:
                detalle += ("; " if detalle else "") + f"{len(grupos)} grupo(s) de un hilo no dejan ni una puntada propia ({', '.join(str(g['id']) for g in grupos[:6])})"
            issues.append({"code": "TOPOLOGY_COMPONENT_LOST", "message": f"{detalle} (frontera: DST).", "severity": "review"})
        if verdad.get("countersLost"):
            issues.append({"code": "TOPOLOGY_HOLE_LOST", "message": f"{len(verdad['countersLost'])} counter(s) del diseño original quedan tapados por hilo en el DST (frontera: DST).", "severity": "review"})
        # V6.3: con identidad, lo que se detecta por objeto y grupo.
        if verdad.get("componentsSplit"):
            issues.append({"code": "TOPOLOGY_COMPONENT_SPLIT", "message": f"{len(verdad['componentsSplit'])} pieza(s) del diseño original quedan partidas en el DST: su propio hilo no las une (frontera: DST).", "severity": "review"})
        if verdad.get("componentsMerged"):
            issues.append({"code": "TOPOLOGY_COMPONENT_MERGED", "message": f"{len(verdad['componentsMerged'])} par(es) de piezas separadas en el original quedan unidas por su hilo en el DST (frontera: DST).", "severity": "review"})
        if verdad.get("countersCreated"):
            conexion = sum(1 for h in verdad["countersCreated"] if h.get("closedByConnection"))
            issues.append({"code": "TOPOLOGY_HOLE_CREATED", "message": f"{len(verdad['countersCreated'])} hueco(s) cerrado(s) por el hilo que no tenían ni el original ni el IR" + (f", {conexion} por un tramo de conexión entre objetos" if conexion else "") + " (frontera: DST).", "severity": "review"})
        if verdad.get("inconclusive"):
            causas = sorted({str(x.get("cause", "heuristic-alignment")) for x in verdad["inconclusive"]})
            por_que = "la alineación DST-diseño es heurística" if verdad.get("attribution") != "identity" else "la verdad misma lo marca incierto"
            issues.append({"code": "STRUCTURE_UNCERTAIN", "message": f"{len(verdad['inconclusive'])} pieza(s) o counter(s) no se pueden confirmar en el DST: {por_que} (±{verdad['alignmentUncertaintyMm']} mm; {', '.join(causas)}).", "severity": "review"})
    if trazo and trazo.get("inconclusive"):
        issues.append({"code": "STRUCTURE_UNCERTAIN", "message": f"{len(trazo['inconclusive'])} estructura(s) fina(s) sin su eje cosido en el DST, pero con un objeto cuya identidad no se demostró entera (identity-incomplete).", "severity": "review"})
    if trazo and trazo.get("junctionsDisconnected"):
        issues.append({"code": "TOPOLOGY_JUNCTION_DISCONNECTED", "message": f"{len(trazo['junctionsDisconnected'])} unión(es) de trazos (T, Y, X) quedan cosidas en trozos separados: sus ramas no se tocan en el DST (frontera: DST).", "severity": "review"})
    if trazo and trazo.get("branchesLost"):
        issues.append({"code": "STRUCTURAL_STROKE_LOST", "message": f"{len(trazo['branchesLost'])} estructura(s) pierden una rama en el DST: sus propias puntadas no cubren la mitad de su eje (frontera: DST).", "severity": "review"})
    # V6.4: un ERROR de técnica de un objeto es REVIEW por técnica, con su
    # medida (los WARNING e INFO no cambian el estado: ver `issues_de_tecnica`).
    tecnica_ = plan.get("technique") if design.get("profileVersion") in CON_REVISION_DE_PREPARACION else None
    if tecnica_:
        issues += [x for x in issues_de_tecnica(tecnica_) if x["severity"] == "review"]
    if int(plan.get("maxLocalDensity", 0)) > 24:
        issues.append({"code": "HIGH_LOCAL_DENSITY", "message": "Hay una zona con demasiadas puntadas por milímetro cuadrado.", "severity": "review"})
    stitches = max(1, int(plan.get("stitchCount", 0)))
    # v5 mide solo los giros entre puntadas de mas de 1 mm (ver `quality.py`):
    # sin eso, cualquier relleno grande iba a revision por los giros de fila.
    # v3 y v4 conservan la medida con la que se calibro su umbral.
    giros = "numberOfRelevantSharpDirectionChanges" if design.get("profileVersion") in CON_REVISION_DE_PREPARACION else "numberOfSharpDirectionChanges"
    if int(plan.get(giros, 0)) / stitches > .08:
        issues.append({"code": "SHARP_DIRECTION_CHANGE", "message": "El plan concentra demasiados cambios bruscos de dirección.", "severity": "review"})
    # Un traslado oculto de v5 es un objeto del contrato pero no del diseño:
    # no sube el umbral de saltos.
    objetos = [item for item in design.get("objects", []) if item.get("role") != "travel"]
    if int(plan.get("jumps", 0)) > max(20, round(len(objetos) * .75)):
        issues.append({"code": "TOO_MANY_JUMPS", "message": "El orden de cosido produce demasiados saltos.", "severity": "review"})
    return issues


Engine = Callable[[Path, Path], float]
_xvfb: subprocess.Popen[bytes] | None = None
def ensure_display() -> None:
    """Levanta Xvfb y ESPERA A QUE ESTE, no un segundo fijo.

    El arranque en frio de este contenedor tarda casi siete segundos y Xvfb
    compite con el por CPU; con el segundo de espera que habia antes, el primer
    trabajo de cada contenedor moria con XVFB_FAILED mientras el resto pasaba.
    Un fallo que sale una vez de cada tantas y siempre en el primero es de los
    que se atribuyen al diseno y no a la maquina.

    Tambien se mira si el proceso se murio: si Xvfb no arranca de verdad, es
    mejor decirlo ya que agotar la espera entera.
    """
    global _xvfb
    socket = Path("/tmp/.X11-unix/X99")
    if socket.exists(): return
    if _xvfb is None or _xvfb.poll() is not None:
        _xvfb = subprocess.Popen(["Xvfb", os.environ.get("DISPLAY", ":99"), "-screen", "0", "1280x1024x24", "-nolisten", "tcp", "-noreset"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    limite = time.monotonic() + 15
    while time.monotonic() < limite:
        if socket.exists(): return
        if _xvfb.poll() is not None:
            raise RuntimeError("XVFB_FAILED")
        time.sleep(.05)
    raise RuntimeError("XVFB_FAILED")

def run_inkstitch(svg: Path, dst: Path) -> float:
    ensure_display()
    started = time.perf_counter()
    with dst.open("wb") as output:
        result = subprocess.run([INKSTITCH, "--extension=output", "--format=dst", str(svg)], stdout=output, stderr=subprocess.PIPE, timeout=ENGINE_TIMEOUT, check=False, env=os.environ.copy())
    if result.returncode != 0 or not dst.exists() or dst.stat().st_size < 515: raise RuntimeError("ENGINE_FAILED")
    return round((time.perf_counter()-started)*1000, 1)


def artefacto_de_identidad(design: dict[str, Any], objetos: list[dict[str, Any]], mapa: dict[str, Any] | None, motivo: str, plan: dict[str, Any]) -> dict[str, Any]:
    """`identity.json`: original -> verdad -> IR -> Ink/Stitch -> rangos del DST -> verificacion, para investigar un REVIEW."""
    prep = design.get("preparation") or {}
    elementos = []
    for k, o in enumerate(objetos):
        m = mapa["elementos"][k] if mapa else None
        elementos.append({
            "inkstitchElement": {"index": k, "svgId": o.get("id")},
            "irObject": o.get("id"),
            "identity": o.get("identity"),
            "stitchType": (o.get("stitch") or {}).get("type"),
            "colorId": o.get("colorId"),
            "ownStitches": m["puntadas"] if m else None,
            # completo / recortado (núcleo exacto sin 1–2 puntadas de contexto) / sin-verificar
            "verification": m.get("verificacion") if m else None,
            "tieStitches": m.get("remates") if m else None,
            "stitchRanges": [{"start": a, "end": b} for a, b in m["rangos"]] if m else None,
        })
    # La misma informacion por grupo de la verdad: que objetos lo cosen, en que
    # elementos de Ink/Stitch y en que rangos del DST (solo STITCH propios).
    por_grupo: dict[str, list[int]] = {}
    for k, o in enumerate(objetos):
        ident = o.get("identity") or {}
        if ident.get("role") != "travel":
            for g in ident.get("groups") or []:
                por_grupo.setdefault(str(g), []).append(k)
    grupos = [{
        "sourceGroupId": g,
        "irObjectIds": [(objetos[k].get("identity") or {}).get("id") for k in ks],
        "inkstitchElementIds": ks,
        "stitchRanges": sorted(({"start": a, "end": b} for k in ks for a, b in mapa["elementos"][k]["rangos"]), key=lambda r: r["start"]) if mapa else None,
    } for g, ks in sorted(por_grupo.items())]
    # V6.3.1: la cadena entera, de la verdad al DST. Por grupo y pieza de la
    # verdad: su destino (linaje de la preparación), sus objetos del IR, sus
    # elementos de Ink/Stitch y sus rangos del DST.
    indice_de = {(o.get("identity") or {}).get("id"): k for k, o in enumerate(objetos)}
    def traza(clase: str, h: dict[str, Any]) -> dict[str, Any]:
        ks = sorted(indice_de[i] for i in h.get("objetos") or [] if i in indice_de)
        return {
            "id": h.get("id"), "kind": clase, "destino": h.get("destino"), "etapa": h.get("etapa"),
            "sucesos": h.get("sucesos"), "irObjects": h.get("objetos"), "inkstitchElementIds": ks,
            "stitchRanges": sorted(({"start": a, "end": b} for k in ks for a, b in mapa["elementos"][k]["rangos"]), key=lambda r: r["start"]) if mapa else None,
        }
    linaje = []
    for fuente in prep.get("linaje") or []:
        linaje.append({
            "source": fuente.get("id"),
            "nodes": fuente.get("nodos"),
            "truthTrace": [traza("group", h) for h in fuente.get("grupos") or []] + [traza("piece", h) for h in fuente.get("piezas") or []],
            "overlapDivergences": fuente.get("divergencias"),
        })
    return {
        "schemaVersion": 1,
        "algorithm": "v6.3.1-exact-lineage",
        "authority": prep.get("autoridad"),
        "verified": mapa is not None,
        "reason": None if mapa else motivo,
        "mechanism": "document-order + stop_after identity run + float-exact embedding (see identidad.py)",
        "frame": mapa["marco"] if mapa else None,
        "elements": elementos,
        "groups": grupos,
        "lineage": linaje,
        "unstitchedElements": [objetos[e].get("id") for e in mapa["sinPuntadas"]] if mapa else None,
        "incompleteElements": [objetos[e].get("id") for e in mapa.get("incompletos") or []] if mapa else None,
        "connectionStitches": mapa["enlaces"] if mapa else None,
        "commands": mapa["comandos"] if mapa else None,
        "truth": {"groups": [{"id": g.get("id"), "lengthMm": g.get("largoMm")} for g in prep.get("estructura") or []], "sources": [{"id": v.get("id"), "origin": v.get("origen"), "components": [c.get("id") for c in v.get("componentes") or []], "counters": [h.get("id") for h in v.get("counters") or []]} for v in prep.get("verdad") or []]},
        "verification": {"strokeCoverage": plan.get("strokeCoverage"), "structuralTruth": plan.get("structuralTruth")},
    }


def clave_de_cosido(svg: Path) -> str:
    """V6.4.1: la clave de un cosido. El SVG lleva TODO lo que Ink/Stitch lee (geometría, parámetros,
    orden); con la versión del motor y la del mecanismo de identidad, la misma clave da el mismo DST."""
    h = hashlib.sha256()
    for parte in (INKSTITCH_VERSION, idn.MECANISMO, svg.read_bytes()):
        h.update(parte if isinstance(parte, bytes) else parte.encode("utf-8"))
    return h.hexdigest()


def guardar_cosido(carpeta: Path, dst: Path, mapa: dict[str, Any] | None, motivo: str) -> None:
    carpeta.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(dst, carpeta / "design.dst")
    (carpeta / "mapa.json").write_text(json.dumps({"mapa": mapa, "motivo": None if mapa else motivo}, sort_keys=True), encoding="utf-8")


def coser(design: dict[str, Any], directory: Path, engine: Engine = run_inkstitch, identity_engine: "idn.Motor | None" = None, cache: Path | None = None, al_coser: "Callable[[pe.EmbPattern], None] | None" = None) -> dict[str, Any]:
    """SVG → Ink/Stitch → DST → identidad → comprobaciones exactas y técnica, en `directory`.

    V6.4.1: es lo que se hace con el diseño de partida y con CADA candidato de
    reparación. Con `cache`, un SVG ya cosido reutiliza su DST y su mapa de
    identidad sin volver a Ink/Stitch (el baseline de un banco, o un candidato
    repetido)."""
    directory.mkdir(parents=True, exist_ok=True)
    svg, dst = directory/"geometry.svg", directory/"design.dst"
    timings: dict[str, float | None] = {}
    started = time.perf_counter(); build_svg(design, svg); timings["svgGenerationMs"] = round((time.perf_counter()-started)*1000, 1)
    clave = clave_de_cosido(svg) if cache is not None else None
    guardado = cache / clave if cache is not None and clave else None
    en_cache = bool(guardado and (guardado / "design.dst").exists() and (guardado / "mapa.json").exists())
    if en_cache:
        shutil.copyfile(guardado / "design.dst", dst); engine_ms = 0.0
    else:
        engine_ms = engine(svg, dst)
    timings["inkstitchProcessAndDigitizationMs"] = engine_ms
    # Ink/Stitch 3.3.0 no expone un corte confiable entre bootstrap del proceso
    # y digitización. Ambos se dejan null en lugar de repartir el total a ojo.
    timings["inkstitchInitializationMs"] = None; timings["inkstitchDigitizationMs"] = None
    started = time.perf_counter(); pattern, dst_metrics = analyze_dst(dst); timings["dstParsingMs"] = round((time.perf_counter()-started)*1000, 1)
    # V6.9.2: el DST ya existe; lo que sigue (identidad, técnica, cobertura) sólo lo mide.
    if al_coser is not None:
        al_coser(pattern)
    # V6.3: QUE PUNTADAS SON DE QUIEN, exacto (ver `identidad.py`). Sin el mapa
    # (no se pudo demostrar, o no hay motor para las corridas privadas), las
    # comprobaciones de siempre, marcadas como atribucion heuristica.
    mapa = None
    motivo_sin_identidad = "sin corridas de identidad"
    prep = design.get("preparation") or {}
    if en_cache:
        guardada = json.loads((guardado / "mapa.json").read_text())
        mapa, motivo_sin_identidad = guardada["mapa"], guardada["motivo"] or motivo_sin_identidad
    elif design.get("profileVersion") in CON_REVISION_DE_PREPARACION and identity_engine is not None and (prep.get("estructura") or prep.get("verdad")):
        started = time.perf_counter()
        try:
            mapa = idn.identidad_del_dst(svg, pattern, directory, len(ordered_objects(design)), identity_engine)
        except idn.SinIdentidad as error:
            motivo_sin_identidad = str(error)
        timings["identityMs"] = round((time.perf_counter() - started) * 1000, 1)
    if guardado is not None and not en_cache:
        guardar_cosido(guardado, dst, mapa, motivo_sin_identidad)
    cosido = juzgar_cosido(design, directory, svg, pattern, dst_metrics, mapa, motivo_sin_identidad, timings)
    return {**cosido, "dst": dst, "engine_ms": engine_ms, "cacheHit": en_cache, "cacheKey": clave}


def juzgar_cosido(design: dict[str, Any], directory: Path, svg: Path | None, pattern: pe.EmbPattern, dst_metrics: dict[str, Any], mapa: dict[str, Any] | None, motivo_sin_identidad: str, timings: dict[str, Any]) -> dict[str, Any]:
    """Todo lo que se mide de un DST ya cosido (y su mapa de identidad): plan, estructura, técnica.
    Escribe `identity.json` en `directory`. No cose nada."""
    if dst_metrics["widthMm"] > float(design["physical"]["widthMm"]) + 1 or dst_metrics["heightMm"] > float(design["physical"]["heightMm"]) + 1:
        raise ValueError("DST_OUTSIDE_AREA")
    geometry_metrics = analyze_design_geometry(design, svg.stat().st_size if svg is not None else None)
    original_order = list(design["objects"]); optimized_order = ordered_objects(design)
    geometry_metrics["travelOrdering"] = {
        "beforeMm": estimated_object_travel(original_order),
        "afterMm": estimated_object_travel(optimized_order),
        "reordered": [item["id"] for item in original_order] != [item["id"] for item in optimized_order],
    }
    detalle: dict[str, Any] = {}
    rachas_de_cobertura: dict[str, Any] = {}
    plan_metrics = analyze_stitch_plan(pattern, detalle=detalle)
    if design.get("profileVersion") in CON_REVISION_DE_PREPARACION:
        plan_metrics["overlapBreakdown"] = analyze_overlap_breakdown(pattern, optimized_order, detalle)
        # V6.3: sigue por cajas y cortes, NO por identidad. Distingue remates
        # (tie-in/off) y la corrida de identidad se hace sin remates, así que
        # sus puntadas no tienen dueño exacto. Es una densidad, no una
        # estructura: queda marcada como no autoritativa.
        plan_metrics["overlapBreakdown"]["attribution"]["authoritative"] = False
        estructura = (design.get("preparation") or {}).get("estructura") or []
        verdad = (design.get("preparation") or {}).get("verdad") or []
        # Con el mapa, cada estructura se juzga SOLO con las puntadas de sus objetos.
        if mapa is not None:
            started = time.perf_counter()
            if estructura:
                plan_metrics["strokeCoverage"] = idn.cobertura_exacta(pattern, mapa, optimized_order, estructura)
            if verdad:
                plan_metrics["structuralTruth"] = idn.topologia_exacta(pattern, mapa, optimized_order, verdad)
            timings["identityChecksMs"] = round((time.perf_counter() - started) * 1000, 1)
            # V6.4: la TÉCNICA de cada objeto, con sus propias puntadas (ver
            # `tecnica.py`). Sólo analiza: no toca el diseño ni el DST.
            started = time.perf_counter()
            plan_metrics["technique"] = tecnica.validar(pattern, mapa, optimized_order)
            timings["techniqueMs"] = round((time.perf_counter() - started) * 1000, 1)
            # V6.4.3: la COBERTURA contra la verdad original (si la preparación trae su malla).
            started = time.perf_counter()
            medida = cobertura.medir(pattern, mapa, optimized_order, design.get("preparation") or {}, design.get("colors"))
            rachas_de_cobertura = medida.pop("_rachas", {})
            plan_metrics["coverage"] = medida
            timings["coverageMs"] = round((time.perf_counter() - started) * 1000, 1)
        else:
            if estructura:
                plan_metrics["strokeCoverage"] = {**cobertura_de_estructura(pattern, optimized_order, estructura), "attribution": "heuristic"}
            if verdad:
                plan_metrics["structuralTruth"] = {**topologia_en_dst(pattern, optimized_order, verdad), "attribution": "heuristic"}
            # Sin saber qué puntadas son de quién, la técnica de un objeto no se puede medir.
            plan_metrics["technique"] = {"algorithm": tecnica.ALGORITMO, "evaluated": False, "reason": motivo_sin_identidad, "objects": [], "failed": []}
        sin_puntadas = [optimized_order[e].get("id") for e in mapa["sinPuntadas"]] if mapa else []
        plan_metrics["identity"] = {"verified": mapa is not None, "reason": None if mapa else motivo_sin_identidad, "unstitchedObjects": sin_puntadas}
        identity_path = directory/"identity.json"
        identity_path.write_text(json.dumps(artefacto_de_identidad(design, optimized_order, mapa, motivo_sin_identidad, plan_metrics), sort_keys=True, separators=(",", ":")), encoding="utf-8")
    return {"svg": svg, "pattern": pattern, "dst_metrics": dst_metrics, "geometry_metrics": geometry_metrics, "plan_metrics": plan_metrics, "optimized_order": optimized_order, "mapa": mapa, "timings": timings, "coverage_rachas": rachas_de_cobertura}


#: V6.9.2: la imagen de las puntadas del PRIMER cosido, para el previsualizador del editor.
ETAPA_PUNTADAS = "etapa-puntadas.png"


def anunciar_etapa(etapa: str, archivo: str) -> None:
    """Una etapa lista, por la salida de errores: el envoltorio la lee línea a línea mientras el motor
    sigue (la salida normal es sólo el JSON final). El archivo ya está escrito entero cuando se anuncia."""
    print("ETAPA " + json.dumps({"etapa": etapa, "archivo": archivo}), file=sys.stderr, flush=True)


def process_design(design: dict[str, Any], design_hash: str, directory: Path, engine: Engine = run_inkstitch, canonical_hash_verified: bool = False, identity_engine: "idn.Motor | None" = None, repair: bool | None = None, repair_cache: Path | None = None, etapas: bool = False) -> dict[str, Any]:
    validate_design(design, design_hash, canonical_hash_verified)
    status, confidence, issues = early_analysis(design)
    if status == "REJECTED": return {"status": status, "decision": "reject", "confidence": confidence, "issues": issues, "metrics": design.get("metrics", {}), "artifacts": {}}
    preview, metadata_path = directory/"preview.png", directory/"metadata.json"
    # V6.9.2: LAS PUNTADAS REALES DEL PRIMER COSIDO, en cuanto Ink/Stitch da el DST y antes de medirlo,
    # validarlo y repararlo (identidad, técnica, cobertura y reparación son casi todo el tiempo del motor y
    # sólo cambian el DST en una minoría de diseños): el editor las enseña como provisionales. Sólo mira; el
    # DST sale igual con o sin etapas.
    etapa_puntadas = directory / ETAPA_PUNTADAS if etapas else None

    def al_coser(patron: pe.EmbPattern) -> None:
        render_embroidered_preview(patron, paleta_por_bloque(design), etapa_puntadas)
        anunciar_etapa("puntadas", ETAPA_PUNTADAS)

    cosido = coser(design, directory, engine, identity_engine, cache=repair_cache, al_coser=al_coser if etapas else None)
    base_en_cache = cosido["cacheHit"]
    diseno_base = design
    # V6.4.1: un ERROR de técnica reparable abre una reparación POR OBJETO (ver
    # `reparacion.py`): candidatos cosidos con Ink/Stitch de verdad, validados
    # contra el diseño de partida y elegidos por menor distorsión. Si ninguno
    # es válido, el diseño sale como estaba.
    reparacion_ = None
    if repair is not False and design.get("profileVersion") in CON_REVISION_DE_PREPARACION and cosido["mapa"] is not None and os.environ.get("KUSTTO_REPAIR", "1") != "0":
        started = time.perf_counter()
        cache_ = repair_cache if repair_cache is not None else directory / "reparacion" / "cache"
        reparacion_ = reparacion.reparar(design, cosido, directory / "reparacion", lambda d, c: coser(d, c, engine, identity_engine, cache=cache_))
        if reparacion_["selected"]:
            design = reparacion_["design"]
            # El diseño reparado, cosido e integrado: ya lo coció la validación (caché) y se verifica igual.
            cosido = coser(design, directory, engine, identity_engine, cache=cache_)
        reparacion_["ms"] = round((time.perf_counter() - started) * 1000, 1)
    svg, dst, pattern, dst_metrics = cosido["svg"], cosido["dst"], cosido["pattern"], cosido["dst_metrics"]
    geometry_metrics, plan_metrics, timings, engine_ms = cosido["geometry_metrics"], cosido["plan_metrics"], cosido["timings"], cosido["engine_ms"]
    if reparacion_ is not None:
        timings["repairMs"] = reparacion_["ms"]
    quality_reasons = [{**i, "category": categoria(i)} for i in quality_issues(design, geometry_metrics, plan_metrics)]
    # La procedencia de cada incidencia (V6.2): el analisis previo del motor,
    # las de la preparacion del servidor (ya marcadas) y las del DST.
    issues = [{**i, "source": i.get("source") or "SERVER_ENGINE"} for i in issues]
    issues = [*issues, *({**i, "source": "SERVER_DST"} for i in quality_reasons)]
    if quality_reasons and status == "READY": status, confidence = "REVIEW", min(confidence, .78)
    # V6.4: los WARNING e INFO de técnica, informativos.
    if design.get("profileVersion") in CON_REVISION_DE_PREPARACION and plan_metrics.get("technique"):
        issues += [{**x, "source": "SERVER_DST"} for x in issues_de_tecnica(plan_metrics["technique"]) if x["severity"] != "review"]
    # V6.4.3: lo que la cobertura contra la verdad dice del DST, informativo.
    if plan_metrics.get("coverage"):
        issues += [{**x, "source": "SERVER_DST"} for x in cobertura.incidencias(plan_metrics["coverage"])]
    # V6.4: por qué es REVIEW, por partes: la estructura (verdad, trazos), la
    # técnica (cómo se cose cada objeto) y el plan (densidad, saltos...).
    review_por = razones_de_revision(issues)
    # Informativa (no cambia el estado): un objeto sin puntadas propias no es
    # por si solo un defecto; si se lleva una pieza o un trazo, ya lo dicen
    # las comprobaciones exactas de arriba.
    sin_puntadas = (plan_metrics.get("identity") or {}).get("unstitchedObjects") or []
    if sin_puntadas:
        issues.append({"code": "OBJECT_NOT_STITCHED", "message": f"{len(sin_puntadas)} objeto(s) del plan no producen puntadas propias en el DST: {', '.join(map(str, sin_puntadas[:8]))}.", "severity": "info", "source": "SERVER_DST"})
    pesado = relleno_pesado(design, plan_metrics, dst_metrics)
    if pesado: issues.append({**pesado, "source": pesado.get("source") or "SERVER_DST"})
    metrics = {**design.get("metrics", {}), **dst_metrics, "quality": {"geometry": geometry_metrics, "stitchPlan": plan_metrics}}
    started = time.perf_counter(); tajima = validate_tajima(dst, metrics); timings["tajimaValidationMs"] = round((time.perf_counter()-started)*1000, 1)
    paleta = paleta_por_bloque(design)
    started = time.perf_counter(); render_preview(pattern, paleta, preview); timings["previewMs"] = round((time.perf_counter()-started)*1000, 1)
    embroidered = directory/"embroideredPreview.png"
    if design.get("profileVersion") in CON_GUARDRAILS:
        # Sin reparación elegida es el mismo cosido y la misma paleta que la etapa: la misma imagen.
        if etapa_puntadas is not None and design is diseno_base:
            shutil.copyfile(etapa_puntadas, embroidered)
        else:
            render_embroidered_preview(pattern, paleta, embroidered)
    decision = "review" if status == "REVIEW" else "accept"
    # V6.2: con que se preparo (algoritmo, nucleo, perfil y hashes del original,
    # del diseno y de la verdad). Solo existe si lo preparo el servidor.
    autoridad = (design.get("preparation") or {}).get("autoridad")
    metadata = {"schemaVersion": 1, "designHash": design_hash, "authority": autoridad if isinstance(autoridad, dict) else None, "profileVersion": design["profileVersion"], "engineVersion": design["engineVersion"], "decision": decision, "confidence": confidence, "reviewReasons": review_por, "issues": issues, "metrics": metrics, "timings": timings, "physicallyValidated": False, "validation": {"tajima": tajima}, "checksums": {"design.dst": sha256(dst), "preview.png": sha256(preview)}}
    if embroidered.exists():
        metadata["checksums"]["embroideredPreview.png"] = sha256(embroidered)
    if reparacion_ is not None:
        # V6.4.1: qué falló, qué se intentó y qué se eligió (el detalle entero, en `reparacion/repair.json`).
        metadata["repair"] = reparacion.resumen(reparacion_)
    metadata_path.write_text(json.dumps(metadata, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    artefactos = {"dst": dst, "preview": preview, "metadata": metadata_path}
    hashes = {"dst": sha256(dst), "preview": sha256(preview), "metadata": sha256(metadata_path)}
    identidad_json = directory/"identity.json"
    if identidad_json.exists():
        artefactos["identity"] = identidad_json
        hashes["identity"] = sha256(identidad_json)
    # V6.9.2: la vista del bordado definitivo, con etapas, para el previsualizador (la de hilo que ve el cliente).
    if etapas and embroidered.exists():
        artefactos["embroidered"] = embroidered
        hashes["embroidered"] = sha256(embroidered)
    return {"status": status, "decision": decision, "confidence": confidence, "reviewReasons": review_por, "repair": metadata.get("repair"), "cacheHit": base_en_cache, "issues": issues, "metrics": metrics, "timings": timings, "engineMs": engine_ms, "artifacts": artefactos, "diagnostics": {"embroideredPreview": embroidered} if embroidered.exists() else {}, "hashes": hashes}


def main() -> int:
    """La entrada de linea de ordenes. Ver la docstring de arriba."""
    if len(sys.argv) != 3:
        print("USAGE: motor.py <design.json> <carpeta>", file=sys.stderr)
        return 2

    entrada, carpeta = Path(sys.argv[1]), Path(sys.argv[2])

    try:
        design = json.loads(entrada.read_text())
        # El hash ya lo comprobo quien llama: leyo el objeto de S3 y lo
        # verifico antes de escribirlo aqui. Volver a calcularlo seria
        # comprobar el mismo archivo contra si mismo.
        design_hash = hashlib.sha256(entrada.read_bytes()).hexdigest()
        # V6.9.2: con `KUSTTO_ETAPAS=1` (el envoltorio del API) se anuncian las etapas para el editor.
        result = process_design(design, design_hash, carpeta, canonical_hash_verified=True, identity_engine=idn.correr_inkstitch, etapas=os.environ.get("KUSTTO_ETAPAS") == "1")
    except subprocess.TimeoutExpired:
        print("ENGINE_TIMEOUT", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        # El codigo en la ULTIMA linea y en mayusculas: es lo que el envoltorio
        # lee para saber si hay que subirle el presupuesto al motor o si hay un
        # fallo de verdad.
        codigo = error.args[0] if error.args and isinstance(error.args[0], str) and re.fullmatch(r"[A-Z_]+", error.args[0]) else "WORKER_FAILED"
        traceback.print_exc(file=sys.stderr)
        print(codigo, file=sys.stderr)
        return 1

    # Las rutas salen RELATIVAS a la carpeta: quien llama no tiene por que
    # saber donde la creo, y una ruta absoluta dentro de un contenedor no
    # significa nada fuera de el.
    result["artifacts"] = {
        tipo: Path(ruta).name for tipo, ruta in result.get("artifacts", {}).items()
    }
    result.pop("diagnostics", None)

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
