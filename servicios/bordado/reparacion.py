"""V6.4.1 — REPARACIÓN DE TÉCNICA, dirigida por el diagnóstico, objeto por objeto.

    detectar → proponer → coser (Ink/Stitch de verdad) → validar → elegir

- DETECTAR: sólo un ERROR de técnica (V6.4) con estrategia registrada abre una
  reparación, y sólo para el objeto que lo tiene. Un WARNING, un INFO o un
  TECHNIQUE_UNCERTAIN nunca modifican nada.
- PROPONER: pocas estrategias generales por código (`ESTRATEGIAS`), cada una
  derivada de la geometría del objeto (rails, rungs, ancho, eje de la verdad),
  nunca del nombre de un logo. Como mucho `MAX_CANDIDATOS` por objeto,
  contando el original.
- COSER: cada candidato es el diseño ENTERO con ese objeto sustituido, cosido
  por el mismo `coser` del motor (SVG → Ink/Stitch → identidad → estructura →
  técnica). Con caché por la clave del SVG.
- VALIDAR: un candidato se acepta sólo si no empeora nada frente al diseño de
  partida (estructura, topología, plan, técnica de los demás), sus objetos
  nuevos son trazables y cosen, conservan todas las piezas y grupos del
  original, y el ERROR que lo disparó desaparece sin ningún ERROR nuevo.
  Quitar el objeto nunca es una reparación.
- ELEGIR: entre los aceptados, el de menor distorsión con una comparación
  lexicográfica documentada (`puntuacion`). Una mejora de técnica nunca
  compensa una pérdida de estructura: una pérdida ni siquiera se acepta.

Una sola generación por objeto: un candidato que trae otro ERROR se rechaza,
no abre otra búsqueda.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Callable

from PIL import Image, ImageDraw

import cobertura as cob
import identidad as idn

#: V6.4.3: la misma puntuación para técnica y cobertura (con la cobertura antes que la distorsión).
ALGORITMO = "v6.4.3-repair"

#: Qué ERROR se repara y con qué estrategias, en este orden (el orden es el de los candidatos).
ESTRATEGIAS: dict[str, tuple[str, ...]] = {
    # V6.4.2: el remapeo va antes que su split (D se dimensiona con lo que midió C).
    "SATIN_PASS_TOO_WIDE": ("split-satin", "satin-remapped", "split-satin-remapped", "fill"),
    "SATIN_COLLAPSED": ("running-axis",),
}
#: Candidatos por objeto, CONTANDO el original (que siempre es el candidato A).
MAX_CANDIDATOS = 5
#: Objetos que se intentan reparar por diseño (en su orden). El motor tiene 180 s en total
#: (BORDADO_TIMEOUT_MS) y cada candidato cuesta un cosido entero (~3–5 s): 6 objetos × 2 candidatos
#: + la combinación caben con holgura. Un tope por número, no por reloj: el resultado no depende de
#: lo rápida que esté la máquina (determinismo). Los que pasan del tope quedan registrados.
MAX_OBJETOS = 6
#: Generaciones de reparación por objeto: una. Un candidato con otro ERROR se rechaza.
PROFUNDIDAD = 1
#: La columna satin más ancha que el motor admite (`SATIN_TOO_WIDE` en `quality_issues`, 6 mm).
ANCHO_SATIN_MAXIMO_MM = 6.0
#: V6.4.2: la pasada que se busca al dimensionar un split (mm). El límite duro es el del validador,
#: 6.4 mm (`SATIN_PASADA_MAXIMA_MM`: 6 + 2 × 0.15 de compensación + 0.1 de redondeo), y no se toca. Entre
#: la pasada que predice la geometría y la que cose Ink/Stitch, V6.4.1 midió hasta 1.37 mm de más (la
#: columna r1 de la estrella: 4.46 predicha, 5.82 cosida). Objetivo = 6.4 − 1.4 = 5.0 mm: un split
#: dimensionado así no queda a unas décimas del límite.
OBJETIVO_PASADA_MM = 5.0
#: Columnas como mucho en un split (más ya no es un satin: es un relleno).
MAX_COLUMNAS = 4
#: V6.4.2: un remapeo que mueve la pareja en el otro rail menos que un hilo (0.4 mm) no es otro
#: emparejamiento: el remapeado y su split serían copias del original y del split legado.
REMAPEO_MINIMO_MM = 0.4
#: V6.4.2: la oblicuidad de las pasadas cosidas se compara en pasos de 5°.
PASO_DE_GEOMETRIA_GRADOS = 5.0
#: Lo que satin.ts alarga un rung por fuera de cada rail (para que Ink/Stitch lo vea cruzar).
EXTENSION_RUNG_MM = 0.12
#: Tolerancia de simplificación de los rails nuevos: la de la curva de la fuente en v5 (profile.ts).
TOLERANCIA_CUERDA_MM = 0.01
#: El relleno del perfil v5 (profile.ts: fillSpacingMm, anguloRellenoGrados, minAreaUnderlayMm2,
#: pullCompensationMm; maxStitchLengthMm de `stitches`): el que pondría la preparación.
RELLENO_V5 = {"spacingMm": 0.45, "angleDeg": 45, "maxStitchLengthMm": 4, "pullCompensationMm": 0.15}
AREA_UNDERLAY_MM2 = 18.0
#: Un corrido más estrecho que esto se cose sencillo (objetos.ts: CORRIDO_TRIPLE_MM).
CORRIDO_TRIPLE_MM = 0.5
#: El eje de la verdad es fiable para un satin si cubre esta parte de su columna…
EJE_COBERTURA_MINIMA = 0.8
#: …a no más de esto de la línea media de la columna (mm), además de medio ancho.
EJE_TOLERANCIA_MM = 0.2
#: Distorsión de área: diferencias por debajo de este paso (5 % del objeto) son un empate visual,
#: y en el empate gana la técnica original (ver `puntuacion`).
PASO_DE_DISTORSION = 0.05
#: El hilo con el que se pintan el área pretendida y la cosida (mm).
HILO_MM = 0.4
PX = 10
#: El cierre morfológico de la distorsión (px a PX px/mm): 5 px = 0.5 mm, algo más que una fila de relleno.
CIERRE_PX = 5

Punto = tuple[float, float]


# ─── Geometría ───────────────────────────────────────────────────────────

def _largos(poli: list[Punto]) -> list[float]:
    acumulado = [0.0]
    for a, b in zip(poli, poli[1:]):
        acumulado.append(acumulado[-1] + math.dist(a, b))
    return acumulado


def _en(poli: list[Punto], acumulado: list[float], s: float) -> Punto:
    """El punto a arco `s` de una polilínea."""
    if s <= 0:
        return poli[0]
    for i in range(1, len(poli)):
        if acumulado[i] >= s:
            tramo = acumulado[i] - acumulado[i - 1]
            t = (s - acumulado[i - 1]) / tramo if tramo > 0 else 0.0
            a, b = poli[i - 1], poli[i]
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    return poli[-1]


def _proyectar(poli: list[Punto], acumulado: list[float], p: Punto) -> tuple[float, float]:
    """(arco del punto más cercano de la polilínea a `p`, distancia)."""
    mejor = (0.0, math.inf)
    for i in range(1, len(poli)):
        a, b = poli[i - 1], poli[i]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l2 = dx * dx + dy * dy
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
        q = (a[0] + dx * t, a[1] + dy * t)
        d = math.dist(p, q)
        if d < mejor[1]:
            mejor = (acumulado[i - 1] + t * math.sqrt(l2), d)
    return mejor


def rails_y_rungs(o: dict[str, Any]) -> tuple[list[Punto], list[Punto], list[list[Punto]]] | None:
    """El contrato del IR (satin.ts, `satinMode: rails`): dos rails y después los rungs."""
    subs = idn._subpaths((o.get("geometry") or {}).get("d") or "")
    if len(subs) < 2 or len(subs[0]) < 2 or len(subs[1]) < 2:
        return None
    return subs[0], subs[1], [s for s in subs[2:] if len(s) == 2]


def pares(r1: list[Punto], r2: list[Punto], rungs: list[list[Punto]], paso: float = 0.2) -> tuple[list[tuple[Punto, Punto]], list[int]]:
    """Cómo empareja Ink/Stitch los dos rails: los rungs parten la columna en tramos y dentro de
    cada tramo los dos rails se recorren en proporción a su largo. Devuelve los pares (rail 1,
    rail 2) cada `paso` mm y el índice de par de cada rung usado."""
    l1, l2 = _largos(r1), _largos(r2)
    cortes = []
    for rung in rungs:
        p, q = rung
        s1p, d1p = _proyectar(r1, l1, p)
        s2q, d2q = _proyectar(r2, l2, q)
        s1q, d1q = _proyectar(r1, l1, q)
        s2p, d2p = _proyectar(r2, l2, p)
        cortes.append((s1p, s2q) if d1p + d2q <= d1q + d2p else (s1q, s2p))
    cortes.sort()
    # Un rung que no avanza en los dos rails a la vez no es un tramo: se ignora (Ink/Stitch también lo descarta).
    tramos = [(0.0, 0.0)]
    for c in cortes:
        if c[0] > tramos[-1][0] + 1e-6 and c[1] > tramos[-1][1] + 1e-6 and c[0] < l1[-1] - 1e-6 and c[1] < l2[-1] - 1e-6:
            tramos.append(c)
    tramos.append((l1[-1], l2[-1]))
    salida: list[tuple[Punto, Punto]] = []
    en_rung: list[int] = []
    for (a1, a2), (b1, b2) in zip(tramos, tramos[1:]):
        if len(salida):
            en_rung.append(len(salida))
        n = max(1, math.ceil(max(b1 - a1, b2 - a2) / paso))
        for k in range(n):
            t = k / n
            salida.append((_en(r1, l1, a1 + (b1 - a1) * t), _en(r2, l2, a2 + (b2 - a2) * t)))
    salida.append((r1[-1], r2[-1]))
    return salida, en_rung


def _simplificar(poli: list[Punto], tolerancia: float = TOLERANCIA_CUERDA_MM) -> list[Punto]:
    """Douglas–Peucker iterativo: quita los vértices a menos de `tolerancia` de la cuerda."""
    if len(poli) < 3:
        return list(poli)
    guardar = [False] * len(poli)
    guardar[0] = guardar[-1] = True
    pila = [(0, len(poli) - 1)]
    while pila:
        i, j = pila.pop()
        a, b = poli[i], poli[j]
        mejor, k_mejor = -1.0, -1
        for k in range(i + 1, j):
            d = idn._dist_seg(poli[k], a, b)
            if d > mejor:
                mejor, k_mejor = d, k
        if mejor > tolerancia:
            guardar[k_mejor] = True
            pila += [(i, k_mejor), (k_mejor, j)]
    return [p for p, g in zip(poli, guardar) if g]


def _num(v: float) -> str:
    texto = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if texto in ("-0", "") else texto


def d_de(subtrazos: list[list[Punto]], cerrar: bool = False) -> str:
    return "".join("M" + "L".join(f"{_num(x)} {_num(y)}" for x, y in s) + ("Z" if cerrar else "") for s in subtrazos)


def _caja(puntos: list[Punto]) -> dict[str, float]:
    xs = [p[0] for p in puntos]
    ys = [p[1] for p in puntos]
    return {"xMm": min(xs), "yMm": min(ys), "widthMm": max(max(xs) - min(xs), 0.001), "heightMm": max(max(ys) - min(ys), 0.001)}


def _nodos(d: str) -> int:
    return max(1, sum(1 for c in d if c in "MmLlHhVvCcSsQqTtAa"))


def _se_cruzan(a: Punto, b: Punto, c: Punto, d: Punto) -> bool:
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def poligono_simple(anillo: list[Punto]) -> bool:
    """Un anillo sin autointersecciones (lados no contiguos que se cruzan)."""
    n = len(anillo)
    lados = [(anillo[i], anillo[(i + 1) % n]) for i in range(n)]
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if _se_cruzan(*lados[i], *lados[j]):
                return False
    return True


def area_de(anillo: list[Punto]) -> float:
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(anillo, anillo[1:] + anillo[:1]))) / 2


def area_de_satin(r1: list[Punto], r2: list[Punto]) -> list[Punto]:
    """El área de un satin: rail 1 de ida y rail 2 de vuelta, sin repetir las puntas comunes."""
    anillo = list(r1) + list(reversed(r2))
    limpio = [p for i, p in enumerate(anillo) if math.dist(p, anillo[i - 1]) > 1e-6]
    return limpio


# ─── Estrategias ─────────────────────────────────────────────────────────
#
# Cada una recibe el objeto y su contexto y devuelve (parámetros, objetos nuevos) o una razón para no
# proponer nada. Los objetos nuevos llevan sólo geometría y puntada; la identidad la pone `_trazar`.

class SinCandidato(Exception):
    """La estrategia no aplica a este objeto (y dice por qué)."""


def _pasada_medida(contexto: dict[str, Any]) -> float:
    """La pasada más larga que cosió Ink/Stitch para el objeto (el `coverPassMm.max` del ERROR), o 0."""
    medida = (contexto.get("disparador") or {}).get("measurement") or {}
    return float(((medida.get("coverPassMm") or {}).get("max")) or 0.0)


def satin_dividido(o: dict[str, Any], contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """(LEGADO, V6.4.1) Partir la columna A LO LARGO en `n` columnas paralelas, con los rails intermedios
    interpolados entre los pares del modelo proporcional de Ink/Stitch: cada pasada queda en 1/n.

    V6.4.2: `n` sale de la pasada más larga entre la que PREDICE la geometría y la que MIDIÓ el DST
    (`coverPassMm.max`): si Ink/Stitch ya cosió 7.4 mm, que el modelo prediga 1.98 no decide que "no hace
    falta partir". La medición sólo dimensiona: el candidato se cose y se mide otra vez."""
    rr = rails_y_rungs(o)
    if rr is None:
        raise SinCandidato("el satin no tiene dos rails")
    r1, r2, rungs = rr
    ps, en_rung = pares(r1, r2, rungs)
    geometrica = max(math.dist(a, b) for a, b in ps)
    medida = _pasada_medida(contexto)
    ancho = max(geometrica, medida)
    n = min(MAX_COLUMNAS, math.ceil(ancho / OBJETIVO_PASADA_MM))
    if n < 2:
        raise SinCandidato(f"la pasada más larga mide {ancho:.2f} mm (geometría {geometrica:.2f}, DST {medida:.2f}): no hace falta partir")
    lerp = lambda a, b, t: (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)  # noqa: E731
    rails = [[lerp(a, b, i / n) for a, b in ps] for i in range(n + 1)]
    nuevos = []
    for j in range(n):
        ra, rb = rails[j], rails[j + 1]
        subs = [_simplificar(ra), _simplificar(rb)]
        for k in en_rung:
            a, b = ra[k], rb[k]
            l = math.dist(a, b)
            if l < 1e-6:
                continue
            u = ((b[0] - a[0]) / l, (b[1] - a[1]) / l)
            subs.append([(a[0] - u[0] * EXTENSION_RUNG_MM, a[1] - u[1] * EXTENSION_RUNG_MM), (b[0] + u[0] * EXTENSION_RUNG_MM, b[1] + u[1] * EXTENSION_RUNG_MM)])
        anchos = sorted(math.dist(a, b) for a, b in zip(ra, rb))
        stitch = {**o["stitch"], "trimAfter": bool(o["stitch"].get("trimAfter")) if j == n - 1 else False}
        calidad = {**(o.get("quality") or {}), "minWidthMm": round(anchos[0], 3), "maxWidthMm": round(anchos[-1], 3), "averageWidthMm": round(anchos[len(anchos) // 2], 3), "representationReasons": ["REPAIR_SPLIT_SATIN"]}
        nuevos.append({"geometry": {"kind": "path", "d": d_de(subs)}, "stitch": stitch, "quality": calidad, "_puntos": ra + rb})
    return {"columns": n, "maxGeometricPassMm": round(geometrica, 3), "measuredPassMm": round(medida, 3), "sizedBy": "dst" if medida > geometrica else "geometry", "columnMaxPassMm": round(ancho / n, 3)}, nuevos


# ─── V6.4.2: la correspondencia del núcleo ───────────────────────────────

#: El núcleo de bordado (kustto-web, empaquetado por `pnpm bordado:exportar-nucleo`): la correspondencia
#: rail↔rail vive en TypeScript junto a satin.ts (`packages/bordado/src/correspondencia.ts`). Aquí sólo
#: se pide y se consume.
NUCLEO = Path(os.environ.get("KUSTTO_NUCLEO", str(Path(__file__).with_name("nucleo.cjs"))))
NODE = os.environ.get("KUSTTO_NODE", "node")


def _ejes_del_objeto(o: dict[str, Any], contexto: dict[str, Any]) -> list[list[Punto]]:
    grupos = set((o.get("identity") or {}).get("groups") or [])
    return [linea for g in contexto.get("estructura") or [] if str(g.get("id")) in grupos for d in g.get("ejes") or [] for linea in idn._subpaths(d) if len(linea) >= 2]


def correspondencia_del_nucleo(o: dict[str, Any], contexto: dict[str, Any]) -> dict[str, Any]:
    """La correspondencia de la columna (y la columna cosible con 1..MAX_COLUMNAS columnas), del núcleo.
    Se pide una vez por objeto y se guarda en el contexto (C y D la comparten)."""
    guardada = contexto.setdefault("_nucleo", {}).get(o["id"])
    if guardada is not None:
        return guardada
    rr = rails_y_rungs(o)
    if rr is None:
        raise SinCandidato("el satin no tiene dos rails")
    r1, r2, rungs = rr
    pedido = {"casos": [{"id": o["id"], "railA": r1, "railB": r2, "rungs": rungs, "eje": _ejes_del_objeto(o, contexto), "columnas": list(range(1, MAX_COLUMNAS + 1))}]}
    with tempfile.TemporaryDirectory() as tmp:
        entrada, salida = Path(tmp) / "satin-entrada.json", Path(tmp) / "satin-salida.json"
        entrada.write_text(json.dumps(pedido), encoding="utf-8")
        try:
            r = subprocess.run([NODE, str(NUCLEO), "satin", str(entrada), str(salida)], capture_output=True, timeout=60, check=False)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise SinCandidato(f"el núcleo no respondió ({type(error).__name__})") from error
        if r.returncode != 0 or not salida.exists():
            raise SinCandidato(f"el núcleo falló ({r.returncode}): {r.stderr.decode(errors='replace')[-200:]}")
        respuesta = json.loads(salida.read_text(encoding="utf-8"))
    caso = {**respuesta["casos"][0], "nucleo": respuesta.get("nucleo")}
    contexto["_nucleo"][o["id"]] = caso
    return caso


def _satin_de_subtrazos(o: dict[str, Any], columnas: list, razon: str) -> list[dict[str, Any]]:
    """Los objetos satin de unas columnas (subtrazos [rail A, rail B, ...rungs]) del núcleo."""
    nuevos = []
    for j, subs in enumerate(columnas):
        subs = [[(float(x), float(y)) for x, y in sp] for sp in subs]
        ra, rb = subs[0], subs[1]
        ps, _ = pares(ra, rb, [])
        anchos = sorted(math.dist(a, b) for a, b in ps)
        stitch = {**o["stitch"], "trimAfter": bool(o["stitch"].get("trimAfter")) if j == len(columnas) - 1 else False}
        calidad = {**(o.get("quality") or {}), "minWidthMm": round(anchos[0], 3), "maxWidthMm": round(anchos[-1], 3), "averageWidthMm": round(anchos[len(anchos) // 2], 3), "representationReasons": [razon]}
        nuevos.append({"geometry": {"kind": "path", "d": d_de(subs)}, "stitch": stitch, "quality": calidad, "_puntos": ra + rb})
    return nuevos


def _cambia_el_emparejamiento(c: dict[str, Any]) -> None:
    if float(c.get("desvioMm") or 0.0) < REMAPEO_MINIMO_MM:
        raise SinCandidato(f"la correspondencia nueva empareja igual que la proporcional (desvío {c.get('desvioMm')} mm < {REMAPEO_MINIMO_MM}): remapear no cambia nada")


def satin_remapeado(o: dict[str, Any], contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """El MISMO satin —los mismos rails, intactos— con rungs nuevos que obligan a Ink/Stitch a coser la
    correspondencia de sección local del núcleo en vez de la proporcional: un satin, no dos."""
    c = correspondencia_del_nucleo(o, contexto)
    _cambia_el_emparejamiento(c)
    rr = rails_y_rungs(o)
    nuevos = _satin_de_subtrazos(o, c["geometrias"]["1"], "REPAIR_REMAPPED_SATIN")
    # La calidad de ancho del satin es la misma: la columna no cambia (el ancho de pares proporcionales, no).
    nuevos[0]["quality"] = {**(o.get("quality") or {}), "representationReasons": ["REPAIR_REMAPPED_SATIN"]}
    return {
        "rungsBefore": len(rr[2]), "rungsAfter": len(c["geometrias"]["1"][0]) - 2, "pairingShiftMm": c.get("desvioMm"),
        "anchors": c["correspondencia"]["anclas"], "method": c["correspondencia"]["metodo"],
        "predicted": {"legacy": c["legado"]["metricas"], "remapped": c["correspondencia"]["metricas"]},
        "nucleo": c.get("nucleo"),
    }, nuevos


def satin_dividido_remapeado(o: dict[str, Any], contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Remapeo y DESPUÉS split: si la columna es de verdad ancha, se parte con la correspondencia NUEVA.
    `n` sale de lo que MIDIÓ Ink/Stitch al coser el remapeado (C), si se coció, y de la predicción del
    núcleo: si el remapeado ya cabe en `OBJETIVO_PASADA_MM`, no hay split (un satin, no dos)."""
    c = correspondencia_del_nucleo(o, contexto)
    _cambia_el_emparejamiento(c)
    predicha = float(c["correspondencia"]["metricas"]["maxAnchoMm"])
    medida_c = (contexto.get("medidas") or {}).get("satin-remapped")
    ancho = max(predicha, medida_c or 0.0)
    n = math.ceil(ancho / OBJETIVO_PASADA_MM)
    if n < 2:
        raise SinCandidato(f"el satin remapeado ya cabe: pasada {ancho:.2f} mm (núcleo {predicha:.2f}, DST de C {medida_c if medida_c is not None else '—'}) ≤ {OBJETIVO_PASADA_MM}")
    n = min(n, MAX_COLUMNAS)
    nuevos = _satin_de_subtrazos(o, c["geometrias"][str(n)], "REPAIR_REMAPPED_SPLIT_SATIN")
    return {"columns": n, "predictedPassMm": predicha, "measuredRemappedPassMm": medida_c, "sizedBy": "dst" if (medida_c or 0) > predicha else "correspondence", "columnMaxPassMm": round(ancho / n, 3)}, nuevos


def satin_a_relleno(o: dict[str, Any], contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """El área de la columna (rail 1 y rail 2 de vuelta) como relleno tatami del perfil v5."""
    rr = rails_y_rungs(o)
    if rr is None:
        raise SinCandidato("el satin no tiene dos rails")
    anillo = area_de_satin(rr[0], rr[1])
    if len(anillo) < 3 or not poligono_simple(anillo):
        raise SinCandidato("los rails no encierran un área simple: el relleno no tendría la forma del objeto")
    area = area_de(anillo)
    stitch = {"type": "fill", **RELLENO_V5, "underlay": area >= AREA_UNDERLAY_MM2, "trimAfter": bool(o["stitch"].get("trimAfter"))}
    return {"areaMm2": round(area, 2), "angleDeg": RELLENO_V5["angleDeg"]}, [{"geometry": {"kind": "path", "d": d_de([anillo], cerrar=True), "fillRule": "evenodd"}, "stitch": stitch, "_puntos": anillo}]


def corrido_por_el_eje(o: dict[str, Any], contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Un corrido por el EJE QUE YA TIENE LA VERDAD (`preparation.estructura` de los grupos del
    objeto), recortado a la columna. Sin un eje que cubra la columna, no hay reparación: el eje no
    se inventa ni se vuelve a esqueletizar."""
    rr = rails_y_rungs(o)
    if rr is None:
        raise SinCandidato("el satin no tiene dos rails")
    ps, _ = pares(*rr)
    medios = [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for a, b in ps]
    medio_ancho = max(math.dist(a, b) for a, b in ps) / 2
    tolerancia = medio_ancho + EJE_TOLERANCIA_MM
    grupos = set((o.get("identity") or {}).get("groups") or [])
    ejes = [linea for g in contexto.get("estructura") or [] if str(g.get("id")) in grupos for d in g.get("ejes") or [] for linea in idn._subpaths(d) if len(linea) >= 2]
    if not ejes:
        raise SinCandidato("la verdad no tiene eje para los grupos del objeto")
    linea_media = tecnica_polilinea(medios)
    # Los tramos del eje que caen dentro de la columna, en rachas seguidas.
    rachas: list[list[Punto]] = []
    for linea in ejes:
        actual: list[Punto] = []
        for p in linea:
            if linea_media.distancia(p) <= tolerancia:
                actual.append(p)
            elif actual:
                rachas.append(actual)
                actual = []
        if actual:
            rachas.append(actual)
    rachas = [r for r in rachas if len(r) >= 2]
    if not rachas:
        raise SinCandidato("el eje de la verdad no pasa por la columna")
    racha = max(rachas, key=lambda r: _largos(r)[-1])
    eje = tecnica_polilinea(racha)
    cubiertos = sum(1 for m in medios if eje.distancia(m) <= tolerancia)
    cobertura = cubiertos / len(medios)
    if cobertura < EJE_COBERTURA_MINIMA:
        raise SinCandidato(f"el eje de la verdad cubre sólo el {round(100 * cobertura)} % de la columna (hace falta {round(100 * EJE_COBERTURA_MINIMA)} %)")
    anchos = sorted(math.dist(a, b) for a, b in ps)
    racha = _simplificar(racha)
    stitch = {"type": "running", "strokeWidthMm": 0.3, "maxStitchLengthMm": 4, "trimAfter": bool(o["stitch"].get("trimAfter")), "beanRepeats": 0 if anchos[len(anchos) // 2] < CORRIDO_TRIPLE_MM else 1}
    return {"axisCoverage": round(cobertura, 3), "axisLengthMm": round(_largos(racha)[-1], 3), "beanRepeats": stitch["beanRepeats"]}, [{"geometry": {"kind": "path", "d": d_de([racha])}, "stitch": stitch, "_puntos": racha}]


def tecnica_polilinea(puntos: list[Punto]):
    import tecnica
    return tecnica._Polilinea(puntos)


GENERADORES: dict[str, Callable[[dict[str, Any], dict[str, Any]], tuple[dict[str, Any], list[dict[str, Any]]]]] = {
    "split-satin": satin_dividido,
    "satin-remapped": satin_remapeado,
    "split-satin-remapped": satin_dividido_remapeado,
    "fill": satin_a_relleno,
    "running-axis": corrido_por_el_eje,
}


# ─── Identidad y linaje de lo reparado ──────────────────────────────────

def _trazar(o: dict[str, Any], nuevos: list[dict[str, Any]], estrategia: str, disparador: str) -> list[dict[str, Any]]:
    """Los objetos nuevos heredan del original sus grupos y piezas (lo que la verdad dice que cosen)
    y lo tienen de padre en el linaje: verdad → IR reparado → Ink/Stitch → puntadas propias."""
    ident = o.get("identity") or {}
    salida = []
    for k, n in enumerate(nuevos):
        puntos = n.pop("_puntos")
        nid = hashlib.sha256(f"{ident.get('id')}|{estrategia}|{k}".encode()).hexdigest()[:14]
        obj = {key: v for key, v in o.items() if key not in ("geometry", "stitch", "quality", "bounds", "nodeCount", "identity", "id")}
        obj.update({
            "id": f"{o['id']}-r{k}",
            "geometry": n["geometry"],
            "stitch": n["stitch"],
            "bounds": _caja(puntos),
            "nodeCount": _nodos(n["geometry"]["d"]),
            "identity": {**{key: v for key, v in ident.items() if key not in ("id", "parents")}, "id": f"ir-{nid}", "groups": list(ident.get("groups") or []), "pieces": list(ident.get("pieces") or []), "parents": [ident.get("id")]},
            "repair": {"from": o["id"], "irFrom": ident.get("id"), "strategy": estrategia, "trigger": disparador, "part": k},
        })
        if n.get("quality"):
            obj["quality"] = n["quality"]
        salida.append(obj)
    return salida


def _linaje_reparado(prep: dict[str, Any], ir_original: str, nuevos: list[dict[str, Any]], motivo: str) -> None:
    """En el linaje de la preparación: un nodo `reparacion` por objeto nuevo (hijo del original) y,
    en la historia de cada grupo y pieza que cosía el original, sus objetos nuevos en su lugar."""
    ids = [n["identity"]["id"] for n in nuevos]
    for fuente in prep.get("linaje") or []:
        nodos = fuente.get("nodos") or []
        if not any(x.get("id") == ir_original for x in nodos):
            continue
        nodos += [{"id": i, "etapa": "reparacion", "padres": [ir_original]} for i in ids]
        for clase in ("grupos", "piezas"):
            for h in fuente.get(clase) or []:
                objetos = h.get("objetos") or []
                if ir_original in objetos:
                    k = objetos.index(ir_original)
                    h["objetos"] = objetos[:k] + ids + objetos[k + 1:]
                    h["sucesos"] = [*(h.get("sucesos") or []), {"tipo": "repaired", "etapa": "reparacion", "motivo": motivo, "de": ir_original, "a": ids}]


def aplicar(design: dict[str, Any], reemplazos: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """El diseño con cada objeto de `reemplazos` sustituido, EN SU SITIO, por sus objetos nuevos.
    Los demás objetos no se tocan (se copian tal cual)."""
    nuevo = copy.deepcopy(design)
    objetos = []
    for o in nuevo["objects"]:
        if o["id"] in reemplazos:
            partes = copy.deepcopy(reemplazos[o["id"]])
            objetos += partes
            if partes:
                motivo = f"{partes[0]['repair']['trigger']}: {partes[0]['repair']['strategy']}"
                _linaje_reparado(nuevo.get("preparation") or {}, (o.get("identity") or {}).get("id"), partes, motivo)
        else:
            objetos.append(o)
    nuevo["objects"] = objetos
    return nuevo


# ─── Validación ──────────────────────────────────────────────────────────

def estructura_de(cosido: dict[str, Any]) -> dict[str, list]:
    """Las pérdidas de estructura de un cosido, como listas comparables (ids y pares)."""
    plan = cosido["plan_metrics"]
    t = plan.get("structuralTruth") or {}
    c = plan.get("strokeCoverage") or {}
    return {
        "TOPOLOGY_COMPONENT_LOST": sorted(str(x.get("id")) for x in t.get("componentsLost") or []),
        "TOPOLOGY_COMPONENT_SPLIT": sorted(str(x.get("id")) for x in t.get("componentsSplit") or []),
        "TOPOLOGY_COMPONENT_MERGED": sorted("+".join(sorted(map(str, x.get("ids") or []))) for x in t.get("componentsMerged") or []),
        "TOPOLOGY_HOLE_LOST": sorted(str(x.get("id")) for x in t.get("countersLost") or []),
        # Un hueco nuevo no tiene id de la verdad: cuenta el número.
        "TOPOLOGY_HOLE_CREATED": [f"#{i}" for i in range(len(t.get("countersCreated") or []))],
        "STRUCTURE_UNCERTAIN": sorted(str(x.get("id")) for x in t.get("inconclusive") or []) + sorted(f"g:{x}" for x in c.get("inconclusive") or []),
        "THIN_STRUCTURE_INCOMPLETE": sorted(map(str, c.get("incomplete") or [])),
        "STRUCTURAL_STROKE_LOST": sorted(map(str, c.get("branchesLost") or [])),
        "TOPOLOGY_JUNCTION_DISCONNECTED": sorted(f"{x.get('group')}@{x.get('at')}" for x in c.get("junctionsDisconnected") or []),
    }


def _errores_de_tecnica(cosido: dict[str, Any]) -> dict[str, list[str]]:
    tec = cosido["plan_metrics"].get("technique") or {}
    return {o["objectId"]: sorted(i["code"] for i in o["issues"] if i["severity"] == "error") for o in tec.get("objects") or []}


def _plan_de(cosido: dict[str, Any], design: dict[str, Any], quality_issues) -> list[str]:
    """Los REVIEW del plan (densidad, saltos, giros, solape, anchura) que no son ni estructura ni técnica."""
    import motor
    return sorted({i["code"] for i in quality_issues(design, cosido["geometry_metrics"], cosido["plan_metrics"]) if motor.categoria(i) == "plan"})


def _indices(cosido: dict[str, Any]) -> dict[str, int]:
    return {o["id"]: k for k, o in enumerate(cosido["optimized_order"])}


def _puntadas_propias(cosido: dict[str, Any], k: int) -> list[tuple[float, float]]:
    """Las puntadas propias del elemento k, en mm del documento (para comparar dos cosidos)."""
    mapa, patron = cosido["mapa"], cosido["pattern"]
    dx, dy = mapa["marco"]["dx"], mapa["marco"]["dy"]
    return [(round((patron.stitches[i][0] - dx) / 10, 2), round((patron.stitches[i][1] - dy) / 10, 2)) for a, b in mapa["elementos"][k]["rangos"] for i in range(a, b + 1)]


def _mascara(anillos: list[list[Punto]], tramos, caja) -> Image.Image:
    x0, y0, x1, y1 = caja
    im = Image.new("1", (max(1, math.ceil((x1 - x0) * PX) + 2), max(1, math.ceil((y1 - y0) * PX) + 2)), 0)
    dib = ImageDraw.Draw(im)
    f = lambda p: ((p[0] - x0) * PX + 1, (p[1] - y0) * PX + 1)  # noqa: E731
    grosor = max(1, round(HILO_MM * PX))
    for a in anillos:
        if len(a) >= 3:
            dib.polygon([f(p) for p in a], fill=1)
        if len(a) >= 2:
            dib.line([f(p) for p in a] + ([f(a[0])] if len(a) >= 3 else []), fill=1, width=grosor)
    for a, b in tramos:
        dib.line([f(a), f(b)], fill=1, width=grosor)
    return im


def distorsion(original: dict[str, Any], cosido: dict[str, Any], ids: list[str]) -> float:
    """1 − IoU entre el área que el objeto ORIGINAL pretendía (su columna, con al menos un hilo de
    ancho) y lo que cosen los objetos `ids` en este cosido (sus puntadas propias, con un hilo)."""
    rr = rails_y_rungs(original)
    if rr is None:
        return 1.0
    pretendida = area_de_satin(rr[0], rr[1])
    k = _indices(cosido)
    tramos = []
    for i in ids:
        if i in k:
            p = _puntadas_propias(cosido, k[i])
            tramos += list(zip(p, p[1:]))
    todos = pretendida + [q for t in tramos for q in t]
    if not tramos:
        return 1.0
    caja = (min(p[0] for p in todos) - 1, min(p[1] for p in todos) - 1, max(p[0] for p in todos) + 1, max(p[1] for p in todos) + 1)
    from PIL import ImageChops, ImageFilter
    # Un cierre de medio milímetro: las rendijas entre filas de un relleno (0.45 mm) o entre piernas de
    # un satin son textura, no forma; sin cerrarlas, un relleno pierde un 10 % de área que sí cubre.
    cerrar = lambda im: im.convert("L").filter(ImageFilter.MaxFilter(CIERRE_PX)).filter(ImageFilter.MinFilter(CIERRE_PX)).point(lambda v: 255 if v else 0).convert("1")  # noqa: E731
    a = cerrar(_mascara([pretendida], [], caja))
    b = cerrar(_mascara([], tramos, caja))
    union = ImageChops.logical_or(a, b).histogram()[-1]
    inter = ImageChops.logical_and(a, b).histogram()[-1]
    return round(1 - inter / union, 4) if union else 1.0


def evaluar(base: dict[str, Any], design_base: dict[str, Any], candidato: dict[str, Any], cosido: dict[str, Any], quality_issues) -> dict[str, Any]:
    """Los invariantes de aceptación de un candidato frente al diseño de partida. Devuelve
    {accepted, rejections[], ...medidas}. Nada se acepta por omisión."""
    rechazos: list[str] = []
    original = candidato["original"]
    nuevos = [o["id"] for o in candidato["objects"]]
    # C. Identidad: el cosido la demuestra y cada objeto nuevo cose con puntadas propias verificadas.
    mapa = cosido.get("mapa")
    if mapa is None:
        rechazos.append("identity: el cosido del candidato no tiene identidad exacta")
    k = _indices(cosido)
    if mapa is not None:
        for i in nuevos:
            e = mapa["elementos"][k[i]] if i in k else None
            if e is None or not e.get("puntadas"):
                rechazos.append(f"identity: {i} no deja puntadas propias")
            elif (e.get("verificacion") or {}).get("estado", "completo") not in ("completo", "recortado"):
                rechazos.append(f"identity: {i} sin identidad entera ({e['verificacion'].get('estado')})")
    # B. Ancestros: los objetos nuevos llevan TODAS las piezas y grupos del original (quitarlo no repara).
    # V6.4.3: un candidato que AÑADE un objeto (recuperar lo que falta) no sustituye a nadie: su ancla
    # sigue intacta (se comprueba en E).
    ident = original.get("identity") or {}
    for clave in ("groups", "pieces") if candidato.get("mode") != "add" else ():
        suyas = set(ident.get(clave) or [])
        heredadas = set().union(*[set((o.get("identity") or {}).get(clave) or []) for o in candidato["objects"]]) if candidato["objects"] else set()
        if suyas - heredadas:
            rechazos.append(f"lineage: se pierden {clave} {sorted(suyas - heredadas)}")
    if not candidato["objects"]:
        rechazos.append("lineage: el candidato quita el objeto")
    # A. Estructura: nada nuevo respecto al diseño de partida.
    e0, e1 = estructura_de(base), estructura_de(cosido)
    regresiones = {c: sorted(set(e1[c]) - set(e0[c])) for c in e1 if set(e1[c]) - set(e0[c])}
    if len(e1["TOPOLOGY_HOLE_CREATED"]) <= len(e0["TOPOLOGY_HOLE_CREATED"]):
        regresiones.pop("TOPOLOGY_HOLE_CREATED", None)
    for c, v in regresiones.items():
        rechazos.append(f"structure: {c} nuevo {v}")
    # Plan: ningún REVIEW de plan nuevo (saltos, densidad, solape…).
    p0, p1 = set(_plan_de(base, design_base, quality_issues)), set(_plan_de(cosido, candidato["design"], quality_issues))
    for c in sorted(p1 - p0):
        rechazos.append(f"plan: {c} nuevo")
    # D. Técnica: el ERROR que disparó desaparece, ningún ERROR en lo nuevo, ninguno nuevo en los demás.
    t0, t1 = _errores_de_tecnica(base), _errores_de_tecnica(cosido)
    for i in nuevos:
        if candidato["trigger"] is not None and candidato["trigger"] in t1.get(i, []):
            rechazos.append(f"technique: {i} sigue con {candidato['trigger']}")
        otros = [c for c in t1.get(i, []) if c != candidato["trigger"]]
        if otros:
            rechazos.append(f"technique: {i} trae ERROR nuevo {otros}")
    for i, codigos in sorted(t1.items()):
        if i in nuevos:
            continue
        nuevos_codigos = sorted(set(codigos) - set(t0.get(i, [])))
        if nuevos_codigos:
            rechazos.append(f"technique: {i} (fuera de la reparación) trae {nuevos_codigos}")
    # E. Los objetos fuera de la reparación: el mismo IR, y sus puntadas (se informa cuántas cambian).
    k0 = _indices(base)
    fuera = [o for o in candidato["design"]["objects"] if o["id"] not in nuevos]
    ir_base = {o["id"]: o for o in design_base["objects"]}
    distintos_ir = [o["id"] for o in fuera if json.dumps(o, sort_keys=True) != json.dumps(ir_base.get(o["id"]), sort_keys=True)]
    for i in distintos_ir:
        rechazos.append(f"scope: {i} (fuera de la reparación) cambia en el IR")
    # El DST va centrado en su caja: si la caja cambia, el redondeo a 0.1 mm de TODO el diseño se
    # desplaza. Iguales = las mismas puntadas a menos de un paso del DST (0.1 mm) más su residuo.
    iguales, redondeo, distintos = [], [], []
    if mapa is not None and base.get("mapa") is not None:
        for o in fuera:
            if o["id"] not in k or o["id"] not in k0:
                continue
            a, b = _puntadas_propias(cosido, k[o["id"]]), _puntadas_propias(base, k0[o["id"]])
            if a == b:
                iguales.append(o["id"])
            elif len(a) == len(b) and max(math.dist(p, q) for p, q in zip(a, b)) <= 0.1 + 1e-6:
                redondeo.append(o["id"])
            else:
                distintos.append(o["id"])
    return {
        "accepted": not rechazos,
        "rejections": rechazos,
        "structureRegressions": regresiones,
        "techniqueErrors": sum(len(v) for v in t1.values()),
        "techniqueErrorsBefore": sum(len(v) for v in t0.values()),
        "unaffectedObjects": len(fuera),
        "unaffectedIdentical": iguales,
        "unaffectedWithinDstRounding": redondeo,
        "unaffectedDifferentStitches": distintos,
    }


def cobertura_del_cosido(cosido: dict[str, Any]) -> dict[str, Any]:
    """V6.4.3 — lo que la puntuación mira de la cobertura de un cosido (global, contra la verdad)."""
    c = (cosido.get("plan_metrics") or {}).get("coverage") or {}
    if not c.get("evaluated"):
        return {}
    return {"significantAfterMm2": c.get("significantUncoveredMm2"), "recallAfter": c["global"]["own"].get("recall"), "outsideAfterMm2": c["global"]["own"].get("outsideMm2")}


def puntuacion(cand: dict[str, Any]) -> tuple:
    """La comparación entre candidatos ACEPTADOS (menor es mejor), la MISMA para los de técnica y los de
    cobertura (V6.4.3: un solo selector), lexicográfica:

    1. regresiones de estructura (0 en un aceptado: una pérdida no se compensa);
    2. ERROR de técnica que quedan en el diseño;
    3. piezas de la verdad perdidas (TOPOLOGY_COMPONENT_LOST);
    4. V6.4.3 — área SIGNIFICATIVA sin hilo propio, en pasos de una región significativa
       (`cob.AREA_SIGNIFICATIVA_MM2`, 0.5 mm²: menos no se puede afirmar con el modelo de hilo);
    5. V6.4.3 — recall propio contra la verdad, en milésimas;
    6. V6.4.3 — hilo propio fuera de la verdad, en los mismos pasos de 0.5 mm² (sin cobertura medida,
       4–6 son 0 y el orden es el de V6.4.2);
    7. distorsión de área, en pasos de `PASO_DE_DISTORSION` (5 %: menos no se distingue);
    8. si cambia la técnica del objeto (satin → relleno o corrido): en el empate visual gana la
       intención original;
    9. V6.4.2 — la GEOMETRÍA del satin cosido: la oblicuidad p95 de sus pasadas (la peor columna), en
       pasos de 5°. Va después de la distorsión: "más recto" nunca gana si cambia la forma;
    10. distorsión de área exacta;
    11. puntadas de más frente al original (relativo, nunca premia coser menos);
    12. objetos nuevos (complejidad): un satin remapeado gana a dos que esconden el problema.
    El id del candidato cierra el orden (determinista). Un +10 % de recall nunca compensa un counter
    perdido: ni siquiera se acepta."""
    v, m = cand["validation"], cand["metrics"]
    c = (cand.get("coverage") or {}).get("global") or {}
    d = float(m.get("geometryDistortion") or 0)
    geometria = m.get("satinObliquityP95Deg")
    return (
        sum(len(x) for x in v["structureRegressions"].values()),
        v["techniqueErrors"],
        cand.get("lostPieces", 0),
        round(float(c.get("significantAfterMm2") or 0) / cob.AREA_SIGNIFICATIVA_MM2),
        -round(float(c.get("recallAfter") or 0), 3),
        round(float(c.get("outsideAfterMm2") or 0) / cob.AREA_SIGNIFICATIVA_MM2),
        math.floor(d / PASO_DE_DISTORSION + 1e-9),
        int(m.get("techniqueChanged") or False),
        math.floor(geometria / PASO_DE_GEOMETRIA_GRADOS + 1e-9) if geometria is not None else 0,
        # Los dos continuos, redondeados: una milésima de área o un 1 % de puntadas es ruido del DST.
        round(d, 3),
        round(max(0.0, float(m.get("stitchDeltaRatio") or 0)), 2),
        len(cand["modifiedObjects"]),
        cand["id"],
    )


# ─── El ciclo ────────────────────────────────────────────────────────────

def _medidas_de(cosido: dict[str, Any], ids: list[str]) -> dict[str, Any]:
    tec = {o["objectId"]: o for o in (cosido["plan_metrics"].get("technique") or {}).get("objects") or []}
    k = _indices(cosido)
    salida = {}
    for i in ids:
        o = tec.get(i)
        m = (o or {}).get("measurements") or {}
        salida[i] = {
            "technique": (o or {}).get("technique"),
            "stitchCount": cosido["mapa"]["elementos"][k[i]]["puntadas"] if cosido.get("mapa") and i in k else None,
            "techniqueIssues": sorted(f"{x['code']}:{x['severity']}" for x in (o or {}).get("issues") or []),
            "relevant": {c: m.get(c) for c in ("coverPassMm", "longPassRatio", "railWidthMm", "railCoverage", "coverCrossings", "satinGeometry", "axisDistanceMm", "interiorCoverage", "retraceRatio") if m.get(c) is not None},
        }
    return salida


def geometria_de(cosido: dict[str, Any], ids: list[str]) -> dict[str, Any]:
    """V6.4.2: la geometría satin COSIDA de unos objetos (la peor columna): oblicuidad p95, cambio de
    dirección p95, rupturas de monotonía, cruces de la cubierta y la pasada máxima. None si no hay satin."""
    tec = {o["objectId"]: o for o in (cosido["plan_metrics"].get("technique") or {}).get("objects") or []}
    g = [(tec[i]["measurements"].get("satinGeometry"), tec[i]["measurements"].get("coverCrossings", 0)) for i in ids if i in tec and tec[i]["technique"] == "satin"]
    g = [(x, c) for x, c in g if x]
    if not g:
        return {"satinObliquityP95Deg": None}
    return {
        "satinObliquityP95Deg": round(max(x["obliquityDeg"]["p95"] for x, _ in g), 2),
        "satinObliquityP50Deg": round(max(x["obliquityDeg"]["p50"] for x, _ in g), 2),
        "satinDirectionDeltaP95Deg": round(max(x["directionDeltaDeg"]["p95"] for x, _ in g), 2),
        "satinMonotonicityBreaks": sum(x["monotonicityBreaks"] for x, _ in g),
        "satinCoverCrossings": sum(c for _, c in g),
        "satinPassMaxMm": max(x["passMaxMm"] for x, _ in g),
        "satinPassP95Mm": max(x["passP95Mm"] for x, _ in g),
    }


def _codigos_de_estructura(cosido: dict[str, Any]) -> list[str]:
    return sorted(c for c, v in estructura_de(cosido).items() if v)


def objetivos(cosido: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """DETECTAR: (medición del objeto, ERROR disparador) de cada objeto con un ERROR reparable, en el
    orden del diseño. Sólo `error`: un WARNING o un INFO no se reparan."""
    tec = cosido["plan_metrics"].get("technique") or {}
    salida = []
    for o in tec.get("objects") or []:
        errores = [i for i in o["issues"] if i["severity"] == "error"]
        disparador = next((i for codigo in ESTRATEGIAS for i in errores if i["code"] == codigo), None)
        if disparador is not None:
            salida.append((o, disparador))
    return salida


def reparar(design: dict[str, Any], base: dict[str, Any], carpeta: Path, coser: Callable[[dict[str, Any], Path], dict[str, Any]], quality_issues=None, generadores: dict[str, Callable] | None = None, estrategias: dict[str, tuple[str, ...]] | None = None) -> dict[str, Any]:
    """El ciclo entero sobre un diseño ya cosido (`base`). `coser(diseño, carpeta)` es el de motor.py
    (en las pruebas, uno simulado). Devuelve el RepairResult: qué falló, qué se intentó, por qué se
    rechazó cada candidato y cuál se eligió, con el diseño final."""
    import motor
    quality_issues = quality_issues or motor.quality_issues
    generadores = {**GENERADORES, **(generadores or {})}
    estrategias = estrategias or ESTRATEGIAS
    contexto_base = {"estructura": (design.get("preparation") or {}).get("estructura") or [], "_nucleo": {}}
    por_id = {o["id"]: o for o in design["objects"]}
    informe: dict[str, Any] = {"algorithm": ALGORITMO, "maxCandidatesPerObject": MAX_CANDIDATOS, "depth": PROFUNDIDAD, "attempted": False, "objects": [], "selected": False, "design": design}
    elegidos: dict[str, dict[str, Any]] = {}
    informe["deferred"] = []
    for n_objeto, (medicion, disparador) in enumerate(objetivos(base)):
        oid = medicion["objectId"]
        original = por_id.get(oid)
        if original is None:
            continue
        if n_objeto >= MAX_OBJETOS:
            informe["deferred"].append({"objectId": oid, "trigger": disparador["code"], "reason": f"fuera del presupuesto de {MAX_OBJETOS} objetos por diseño"})
            continue
        informe["attempted"] = True
        registro: dict[str, Any] = {"objectId": oid, "irObject": medicion.get("irObject"), "technique": medicion.get("technique"), "trigger": {"code": disparador["code"], "measurement": disparador.get("measurement"), "expected": disparador.get("expected")}, "candidates": [], "accepted": [], "selected": None}
        # A: el original, siempre, como referencia (se rechaza por el mismo ERROR que lo trajo aquí).
        registro["candidates"].append({"id": "A", "strategy": "original", "parameters": {}, "modifiedObjects": [oid], "accepted": False, "rejections": [f"technique: {oid} tiene {disparador['code']}"], "metrics": {"geometryDistortion": distorsion(original, base, [oid]), "stitchDeltaRatio": 0.0, "techniqueChanged": False, **geometria_de(base, [oid])}, "before": _medidas_de(base, [oid])})
        # El contexto de ESTE objeto: su ERROR (la medición del DST que dimensiona) y lo que se va midiendo
        # al coser sus candidatos (el remapeado C alimenta al split remapeado D).
        contexto = {**contexto_base, "disparador": disparador, "medidas": {}}
        for n, estrategia in enumerate(estrategias.get(disparador["code"], ())[: MAX_CANDIDATOS - 1]):
            cid = chr(ord("B") + n)
            cand: dict[str, Any] = {"id": cid, "strategy": estrategia, "parameters": {}, "modifiedObjects": [], "accepted": False, "rejections": []}
            registro["candidates"].append(cand)
            try:
                parametros, nuevos = generadores[estrategia](copy.deepcopy(original), contexto)
            except SinCandidato as razon:
                cand["rejections"].append(f"no-candidate: {razon}")
                continue
            partes = _trazar(original, nuevos, estrategia, disparador["code"])
            cand["parameters"] = parametros
            cand["modifiedObjects"] = [p["id"] for p in partes]
            diseno = aplicar(design, {oid: partes})
            try:
                motor.validate_design(diseno, "", canonical_hash_verified=True)
            except ValueError as error:
                cand["rejections"].append(f"contract: {error}")
                continue
            cand["designHash"] = hashlib.sha256(json.dumps(diseno, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            try:
                cosido = coser(diseno, carpeta / oid / cid)
                # El diseño del candidato, junto a su DST: para poder inspeccionarlo después.
                (carpeta / oid / cid).mkdir(parents=True, exist_ok=True)
                (carpeta / oid / cid / "design.json").write_text(json.dumps(diseno, sort_keys=True), encoding="utf-8")
            except Exception as error:  # noqa: BLE001 — un candidato que no cose se rechaza, no tumba el diseño
                cand["rejections"].append(f"stitch: {type(error).__name__}: {error}")
                continue
            cand["cache"] = "hit" if cosido.get("cacheHit") else "miss"
            cand["cacheKey"] = cosido.get("cacheKey")
            cand["inkstitchMs"] = cosido.get("engine_ms")
            validacion = evaluar(base, design, {"original": original, "objects": partes, "trigger": disparador["code"], "design": diseno}, cosido, quality_issues)
            cand["validation"] = {k: v for k, v in validacion.items() if k not in ("accepted", "rejections")}
            cand["rejections"] += validacion["rejections"]
            cand["accepted"] = validacion["accepted"]
            antes = sum(e["puntadas"] for e in base["mapa"]["elementos"] if base["optimized_order"][e["elemento"]]["id"] == oid)
            k = _indices(cosido)
            despues = sum(cosido["mapa"]["elementos"][k[i]]["puntadas"] for i in cand["modifiedObjects"] if i in k) if cosido.get("mapa") else 0
            cand["metrics"] = {
                "geometryDistortion": distorsion(original, cosido, cand["modifiedObjects"]),
                "stitchDelta": despues - antes,
                "stitchDeltaRatio": round((despues - antes) / max(antes, 1), 4),
                "techniqueChanged": any(p["stitch"]["type"] != original["stitch"]["type"] for p in partes),
                **geometria_de(cosido, cand["modifiedObjects"]),
            }
            # V6.4.2 — lo MEDIDO alimenta a los candidatos que vienen detrás (una sola generación).
            if cand["metrics"].get("satinPassMaxMm") is not None:
                contexto["medidas"][estrategia] = cand["metrics"]["satinPassMaxMm"]
            cand["after"] = _medidas_de(cosido, cand["modifiedObjects"]) if cosido.get("mapa") else None
            cand["structureIssues"] = _codigos_de_estructura(cosido)
            # V6.4.3: la cobertura del candidato entra en la puntuación (antes que la distorsión).
            cand["coverage"] = {"global": cobertura_del_cosido(cosido)}
            cand["lostPieces"] = len(estructura_de(cosido)["TOPOLOGY_COMPONENT_LOST"])
            cand["_partes"], cand["_cosido"], cand["_diseno"], cand["_trigger"] = partes, cosido, diseno, disparador["code"]
        if original["id"] in contexto["_nucleo"]:
            (carpeta / oid).mkdir(parents=True, exist_ok=True)
            (carpeta / oid / "correspondencia.json").write_text(json.dumps(contexto["_nucleo"][original["id"]]), encoding="utf-8")
        aceptados = [c for c in registro["candidates"] if c["accepted"]]
        registro["accepted"] = [c["id"] for c in aceptados]
        if aceptados:
            mejor = min(aceptados, key=puntuacion)
            registro["selected"] = mejor["id"]
            registro["reason"] = f"{mejor['id']} ({mejor['strategy']}): el aceptado de menor puntuación {list(puntuacion(mejor)[:-1])}"
            elegidos[oid] = mejor
        else:
            registro["reason"] = "ningún candidato cumple los invariantes: el objeto queda como estaba"
        informe["objects"].append(registro)
    cosido_final = base
    if elegidos:
        if len(elegidos) == 1:
            (oid, mejor), = elegidos.items()
            final, cosido_final = mejor["_diseno"], mejor["_cosido"]
            combinado = {"objects": [oid], "verified": True, "rejections": []}
        else:
            # Varias reparaciones: el diseño con todas, cosido y validado entero otra vez.
            final = aplicar(design, {oid: c["_partes"] for oid, c in elegidos.items()})
            combinado = {"objects": sorted(elegidos), "verified": False, "rejections": []}
            try:
                cosido_final = coser(final, carpeta / "combinado")
                rechazos = []
                for oid, c in elegidos.items():
                    rechazos += evaluar(base, design, {"original": por_id[oid], "objects": c["_partes"], "trigger": c["_trigger"], "design": final}, cosido_final, quality_issues)["rejections"]
                # Los objetos de las otras reparaciones no son "fuera de la reparación" aquí.
                reparados = {p["id"] for c in elegidos.values() for p in c["_partes"]}
                rechazos = [r for r in rechazos if not any(f"{i} (fuera de la reparación)" in r for i in reparados)]
                combinado["rejections"] = sorted(set(rechazos))
                combinado["verified"] = not combinado["rejections"]
            except Exception as error:  # noqa: BLE001
                combinado["rejections"] = [f"stitch: {type(error).__name__}: {error}"]
            if not combinado["verified"]:
                # La combinación no se sostiene: se queda la primera reparación (validada sola).
                oid = sorted(elegidos)[0]
                final, cosido_final = elegidos[oid]["_diseno"], elegidos[oid]["_cosido"]
                combinado["fallback"] = oid
        informe.update({"selected": True, "design": final, "combined": combinado, "finalCacheKey": cosido_final.get("cacheKey"), "after": {"structureIssues": _codigos_de_estructura(cosido_final), "techniqueErrors": sum(len(v) for v in _errores_de_tecnica(cosido_final).values()), "stitchCount": cosido_final["dst_metrics"].get("stitchCount")}})
    informe["techniqueSelected"] = bool(elegidos)
    # V6.4.3: UNA ronda de cobertura, sobre el diseño que sale de la técnica (sin recursión: un candidato
    # de cobertura que trae un ERROR de técnica se rechaza, no vuelve a la ronda de técnica).
    cov = reparar_cobertura(informe["design"], cosido_final, carpeta / "cobertura", coser, quality_issues, generadores, contexto_base)
    informe["coverage"] = {k: v for k, v in cov.items() if k not in ("design", "_cosido")}
    informe["coverageSelected"] = cov["selected"]
    if cov["selected"]:
        cosido_final = cov["_cosido"]
        informe.update({"selected": True, "design": cov["design"], "finalCacheKey": cosido_final.get("cacheKey"), "after": {"structureIssues": _codigos_de_estructura(cosido_final), "techniqueErrors": sum(len(v) for v in _errores_de_tecnica(cosido_final).values()), "stitchCount": cosido_final["dst_metrics"].get("stitchCount")}})
    informe["attempted"] = informe["attempted"] or cov["attempted"]
    informe["before"] = {"structureIssues": _codigos_de_estructura(base), "techniqueErrors": sum(len(v) for v in _errores_de_tecnica(base).values()), "stitchCount": base["dst_metrics"].get("stitchCount")}
    for r in informe["objects"]:
        for c in r["candidates"]:
            for clave in ("_partes", "_cosido", "_diseno", "_trigger"):
                c.pop(clave, None)
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / "repair.json").write_text(json.dumps({k: v for k, v in informe.items() if k != "design"}, sort_keys=True, indent=1, ensure_ascii=False, default=str), encoding="utf-8")
    if informe["selected"]:
        # V6.4.3: el diseño que sale (técnica y cobertura), para auditar lo que se cosió.
        (carpeta / "design.final.json").write_text(json.dumps(informe["design"], sort_keys=True), encoding="utf-8")
    return informe


def resumen(informe: dict[str, Any]) -> dict[str, Any]:
    """Lo que va en la metadata: qué objetos, qué disparó, qué candidatos y cuál se eligió."""
    return {
        "algorithm": informe["algorithm"],
        "attempted": informe["attempted"],
        "selected": informe["selected"],
        "before": informe.get("before"),
        "after": informe.get("after"),
        "combined": informe.get("combined"),
        "deferred": informe.get("deferred"),
        "ms": informe.get("ms"),
        "techniqueSelected": informe.get("techniqueSelected"),
        "coverageSelected": informe.get("coverageSelected"),
        "coverage": resumen_de_cobertura(informe.get("coverage") or {}),
        "objects": [{
            "objectId": r["objectId"], "trigger": r["trigger"]["code"], "selected": r["selected"], "reason": r.get("reason"),
            "candidates": [{"id": c["id"], "strategy": c["strategy"], "accepted": c["accepted"], "rejections": c["rejections"], "cache": c.get("cache"), "metrics": c.get("metrics"), "coverage": (c.get("coverage") or {}).get("global")} for c in r["candidates"]],
        } for r in informe["objects"]],
    }



# ─── V6.4.3: la ronda de COBERTURA ───────────────────────────────────────
#
# Disparador: una REGIÓN sin hilo propio (cobertura.py), significativa, con una causa reparable y
# confianza suficiente. Las regiones de un mismo objeto (sin cubrir por SU hilo) se juntan en un
# disparador: la reparación es del objeto. Los candidatos pasan por lo mismo que los de técnica
# (Ink/Stitch real, identidad, estructura, plan, técnica) y además por la cobertura: la región mejora
# de verdad, el diseño no pierde recall ni mueve el rojo a otro sitio, y el hilo fuera no crece más
# que lo cubierto (overdraw).


#: Qué causa se intenta reparar y con qué (reutilizando los generadores de V6.4.1/V6.4.2).
COBERTURA_ESTRATEGIAS: dict[str, tuple[str, ...]] = {
    "UNDERCOVERED_SATIN": ("satin-remapped", "fill"),
    "LOST_STRUCTURE": ("running-truth-axis", "fill-truth-region"),
    "LOST_OBJECT": ("running-truth-axis", "fill-truth-region"),
    "THIN_STRUCTURE_GAP": ("running-truth-axis",),
    "UNDERCOVERED_RUNNING": ("running-truth-axis",),
}
#: Disparadores de cobertura por diseño, de más área a menos. Cada uno cuesta hasta 2 cosidos; con la
#: combinación, 11 cosidos (~25–35 s) sobre los ~60–90 s del peor caso de técnica: dentro de los 180 s.
MAX_REPARACIONES_DE_COBERTURA = 5
#: Confianza mínima de la clasificación (cobertura.py) para tocar nada.
CONFIANZA_MINIMA = 0.5
#: La región disparadora tiene que perder al menos la mitad de su área sin hilo, y una huella de hilo.
MEJORA_LOCAL_MINIMA = 0.5
#: El recall global puede bajar por redondeo (una celda); más, no.
TOLERANCIA_DE_RECALL = 0.0005
#: Holgura para "no mover el rojo a otro sitio" y para el hilo fuera (mm²): una celda de 0.05 mm son 0.0025.
TOLERANCIA_DE_AREA_MM2 = 0.1


#: Una región sin hilo PROPIO que ya tiene hilo de OTRO objeto encima en más de esta parte no se repara:
#: coser lo suyo debajo no cambia lo que se ve (el defecto es el hilo del otro fuera de su pieza).
TAPADA_POR_OTRO = 0.5


def disparadores_de_cobertura(cosido: dict[str, Any], omitidas: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Las regiones que se intentan reparar, agrupadas. En `omitidas`, las significativas de causa
    reparable que NO se intentan y por qué (sin recuperabilidad, poca confianza, tapadas por otro hilo)."""
    cov = (cosido.get("plan_metrics") or {}).get("coverage") or {}
    if not cov.get("evaluated"):
        return []
    omitidas = omitidas if omitidas is not None else []
    elegibles = []
    for r in cov.get("regions") or []:
        if not r.get("significant") or r.get("cause") not in COBERTURA_ESTRATEGIAS:
            continue
        razon = None
        if float(r.get("confidence") or 0) < CONFIANZA_MINIMA:
            razon = f"confianza {r.get('confidence')} < {CONFIANZA_MINIMA}"
        elif r["cause"].startswith("LOST") and r.get("recoverability") != "RECOVERABLE":
            razon = f"{r.get('recoverability')}: no hay de dónde sacar lo que falta sin inventarlo"
        elif float(r.get("physicallyCoveredRatio") or 0) > TAPADA_POR_OTRO:
            razon = f"el {round(100 * float(r['physicallyCoveredRatio']))} % ya tiene hilo de otro objeto encima: coser lo suyo debajo no cambia lo que se ve"
        if razon:
            omitidas.append({"region": r["id"], "cause": r["cause"], "areaMm2": r["areaMm2"], "reason": razon})
            continue
        elegibles.append(r)
    grupos: dict[str, dict[str, Any]] = {}
    for r in elegibles:
        clave = f"obj:{r['object']}" if r["cause"] == "UNDERCOVERED_SATIN" and r.get("object") else f"reg:{r['id']}"
        g = grupos.setdefault(clave, {"cause": r["cause"], "regions": [], "areaMm2": 0.0, "object": r.get("object"), "pieceId": r["pieceId"], "color": r.get("color"), "axisGroups": r.get("truthAxisGroups") or []})
        g["regions"].append(r["id"])
        g["areaMm2"] = round(g["areaMm2"] + r["areaMm2"], 4)
    orden = sorted(grupos.values(), key=lambda g: (-g["areaMm2"], g["regions"][0]))
    for k, g in enumerate(orden):
        g["id"] = f"cov{k + 1}"
    return orden


def _region_de(cosido: dict[str, Any], rid: str) -> dict[str, Any] | None:
    return next((r for r in ((cosido.get("plan_metrics") or {}).get("coverage") or {}).get("regions") or [] if r["id"] == rid), None)


def fill_de_la_verdad(ancla: dict[str, Any] | None, contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Cubrir un ÁREA perdida con un relleno de SU forma, la de la verdad (el contorno de sus celdas):
    no se inventa geometría ni se engorda nada; el color es el que la evidencia afirma."""
    reg = contexto["region"]
    color = (reg.get("color") or {}).get("colorId")
    if not color:
        raise SinCandidato("la región no tiene un color afirmable")
    if reg.get("malla") is None or not reg.get("rachas"):
        raise SinCandidato("sin la malla de la verdad no hay forma que rellenar")
    anillos = cob.contornos(reg["rachas"], reg["malla"])
    area = sum(area_de(a) for a in anillos if len(a) >= 3)
    if not anillos or area < cob.AREA_MICRO_MM2:
        raise SinCandidato("la región no deja un contorno cosible")
    stitch = {"type": "fill", **RELLENO_V5, "underlay": area >= AREA_UNDERLAY_MM2, "trimAfter": False}
    return {"areaMm2": round(area, 3), "rings": len(anillos), "colorId": color, "colorEvidence": (reg.get("color") or {}).get("evidence")}, [{"geometry": {"kind": "path", "d": d_de(anillos, cerrar=True), "fillRule": "evenodd"}, "stitch": stitch, "colorId": color, "_puntos": [p for a in anillos for p in a]}]


def corrido_por_el_eje_de_la_verdad(ancla: dict[str, Any] | None, contexto: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Recuperar una estructura FINA perdida cosiendo un corrido por el eje que ya tiene la verdad
    (`preparation.estructura`) en el tramo que cruza la región. Sin eje, no hay candidato."""
    reg = contexto["region"]
    if not reg.get("truthAxisGroups"):
        raise SinCandidato("ningún eje de la verdad cruza la región")
    x0, y0, x1, y1 = reg["bboxMm"]
    margen = cob.HILO_COBERTURA_MM
    ejes = [(g, l) for g in reg["truthAxisGroups"] for e in contexto["estructura"] if str(e.get("id")) == g for d in e.get("ejes") or [] for l in idn._subpaths(d)]
    tramos = []
    for g, linea in ejes:
        actual: list[Punto] = []
        for p in linea:
            if x0 - margen <= p[0] <= x1 + margen and y0 - margen <= p[1] <= y1 + margen:
                actual.append(p)
            elif actual:
                tramos.append((g, actual))
                actual = []
        if actual:
            tramos.append((g, actual))
    tramos = [(g, t) for g, t in tramos if len(t) >= 2 and _largos(t)[-1] >= cob.HILO_COBERTURA_MM]
    if not tramos:
        raise SinCandidato("el eje de la verdad no deja un tramo cosible en la región")
    grupo, tramo = max(tramos, key=lambda gt: (_largos(gt[1])[-1], gt[0]))
    color = (reg.get("color") or {}).get("colorId") or contexto.get("color_del_grupo", {}).get(grupo)
    if not color:
        raise SinCandidato("no hay color afirmable para el tramo")
    stitch = {"type": "running", "strokeWidthMm": 0.3, "maxStitchLengthMm": 4, "trimAfter": False, "beanRepeats": 0 if reg.get("widthMm", 0) < CORRIDO_TRIPLE_MM else 1}
    return {"axisGroup": grupo, "axisLengthMm": round(_largos(tramo)[-1], 3), "colorId": color}, [{"geometry": {"kind": "path", "d": d_de([_simplificar(tramo)])}, "stitch": stitch, "colorId": color, "groups": [grupo], "_puntos": tramo}]


GENERADORES_DE_COBERTURA = {"fill-truth-region": fill_de_la_verdad, "running-truth-axis": corrido_por_el_eje_de_la_verdad}


def _objeto_recuperado(ancla: dict[str, Any] | None, n: dict[str, Any], estrategia: str, disparador: dict[str, Any], diseno: dict[str, Any]) -> dict[str, Any]:
    puntos = n.pop("_puntos")
    base = ancla or next(iter(diseno["objects"]))
    nid = hashlib.sha256(f"{disparador['regions'][0]}|{estrategia}".encode()).hexdigest()[:14]
    grupos = n.pop("groups", None) or [g for g in (base.get("identity") or {}).get("groups") or [] if ancla is not None]
    obj = {k: v for k, v in base.items() if k in ("sourceObjectId", "sourceType", "classification")}
    obj.update({
        "id": f"cov-{disparador['regions'][0]}",
        "colorId": n.pop("colorId"),
        "geometry": n["geometry"], "stitch": n["stitch"], "bounds": _caja(puntos), "nodeCount": _nodos(n["geometry"]["d"]),
        "identity": {"id": f"ir-{nid}", "groups": grupos, "pieces": [disparador["pieceId"]], "parents": [(ancla or {}).get("identity", {}).get("id")] if ancla else []},
        "repair": {"recovered": disparador["regions"], "strategy": estrategia, "trigger": disparador["cause"], "anchor": (ancla or {}).get("id")},
    })
    return obj


def insertar(design: dict[str, Any], ancla_id: str | None, nuevos: list[dict[str, Any]], pieza: str, motivo: str) -> dict[str, Any]:
    """El diseño con `nuevos` DESPUÉS de su ancla (o al final), sin tocar ningún otro objeto; en el
    linaje, un nodo `reparacion` por objeto y, en la historia de su pieza, su recuperación."""
    nuevo = copy.deepcopy(design)
    objetos = []
    for o in nuevo["objects"]:
        objetos.append(o)
        if o["id"] == ancla_id:
            objetos += copy.deepcopy(nuevos)
    if ancla_id is None or not any(o["id"] == ancla_id for o in nuevo["objects"]):
        objetos += copy.deepcopy(nuevos)
    nuevo["objects"] = objetos
    for fuente in (nuevo.get("preparation") or {}).get("linaje") or []:
        for h in fuente.get("piezas") or []:
            if h.get("id") == pieza:
                ids = [x["identity"]["id"] for x in nuevos]
                (fuente.setdefault("nodos", [])).extend({"id": i, "etapa": "reparacion", "padres": list(x["identity"]["parents"])} for i, x in zip(ids, nuevos))
                h["objetos"] = [*(h.get("objetos") or []), *ids]
                h["sucesos"] = [*(h.get("sucesos") or []), {"tipo": "recovered", "etapa": "reparacion", "motivo": motivo, "a": ids}]
    return nuevo


def evaluar_cobertura(base: dict[str, Any], cosido: dict[str, Any], disparador: dict[str, Any], mallas_: dict[str, Any]) -> dict[str, Any]:
    """La cobertura del candidato frente a la de partida: LOCAL (la región disparadora) y GLOBAL."""
    c0 = (base.get("plan_metrics") or {}).get("coverage") or {}
    c1 = (cosido.get("plan_metrics") or {}).get("coverage") or {}
    rechazos: list[str] = []
    if not c1.get("evaluated"):
        return {"accepted": False, "rejections": ["coverage: el candidato no se pudo medir"]}
    antes = despues = 0.0
    for rid in disparador["regions"]:
        info = (base.get("coverage_rachas") or {}).get(rid)
        reg = _region_de(base, rid)
        if not info or not reg:
            continue
        antes += reg["areaMm2"]
        despues += cob.sin_hilo_en(cosido["pattern"], cosido["mapa"], cosido["optimized_order"], mallas_[info["fuente"]], reg["pieceId"], info["rachas"])
    # El hilo fuera JUNTO a la región (su caja y 1 mm alrededor), de todo el hilo: lo que la reparación
    # añade al naranja donde actúa.
    fuera_antes = fuera_despues = 0.0
    for rid in disparador["regions"]:
        info = (base.get("coverage_rachas") or {}).get(rid)
        reg = _region_de(base, rid)
        if info and reg:
            fuera_antes += cob.fuera_cerca(base["pattern"], base["mapa"], mallas_[info["fuente"]], reg["bboxMm"])
            fuera_despues += cob.fuera_cerca(cosido["pattern"], cosido["mapa"], mallas_[info["fuente"]], reg["bboxMm"])
    ganancia = antes - despues
    if ganancia < max(MEJORA_LOCAL_MINIMA * antes, cob.AREA_MICRO_MM2):
        rechazos.append(f"coverage: la región no mejora bastante ({antes:.2f} → {despues:.2f} mm² sin hilo)")
    g0, g1 = c0["global"]["own"], c1["global"]["own"]
    f0, f1 = c0["global"]["physical"], c1["global"]["physical"]
    if (g1.get("recall") or 0) < (g0.get("recall") or 0) - TOLERANCIA_DE_RECALL:
        rechazos.append(f"coverage: el recall propio baja ({g0.get('recall')} → {g1.get('recall')})")
    s0, s1 = float(c0.get("significantUncoveredMm2") or 0), float(c1.get("significantUncoveredMm2") or 0)
    if s1 > s0 - ganancia + TOLERANCIA_DE_AREA_MM2:
        rechazos.append(f"coverage: el rojo significativo se mueve a otro sitio ({s0:.2f} → {s1:.2f} mm², la región ganó {ganancia:.2f})")
    cubierto = g1["coveredMm2"] - g0["coveredMm2"]
    for nombre, a, b in (("propio", g0, g1), ("físico", f0, f1)):
        extra = b["outsideMm2"] - a["outsideMm2"]
        if extra > max(0.0, cubierto) + TOLERANCIA_DE_AREA_MM2:
            rechazos.append(f"coverage: overdraw — el hilo fuera {nombre} crece {extra:.2f} mm² por {cubierto:.2f} mm² cubiertos")
    return {
        "accepted": not rechazos, "rejections": rechazos,
        "local": {"uncoveredBeforeMm2": round(antes, 3), "uncoveredAfterMm2": round(despues, 3), "recallBefore": 0.0, "recallAfter": round(1 - despues / antes, 3) if antes else None,
                  "outsideBeforeMm2": round(fuera_antes, 3), "outsideAfterMm2": round(fuera_despues, 3)},
        "global": {"recallBefore": g0.get("recall"), "recallAfter": g1.get("recall"), "precisionBefore": g0.get("precision"), "precisionAfter": g1.get("precision"),
                   "uncoveredBeforeMm2": g0["uncoveredMm2"], "uncoveredAfterMm2": g1["uncoveredMm2"], "outsideBeforeMm2": g0["outsideMm2"], "outsideAfterMm2": g1["outsideMm2"],
                   "significantBeforeMm2": s0, "significantAfterMm2": s1, "coveredDeltaMm2": round(cubierto, 3)},
    }


#: La ronda de cobertura elige con el mismo selector que la de técnica.
puntuacion_de_cobertura = puntuacion


def reparar_cobertura(design: dict[str, Any], base: dict[str, Any], carpeta: Path, coser, quality_issues, generadores: dict[str, Callable] | None, contexto_base: dict[str, Any]) -> dict[str, Any]:
    import motor
    t0 = time.perf_counter()
    generadores = {**GENERADORES, **GENERADORES_DE_COBERTURA, **(generadores or {})}
    informe: dict[str, Any] = {"algorithm": ALGORITMO + "+coverage", "coverageAlgorithm": cob.ALGORITMO, "attempted": False, "selected": False, "triggers": [], "deferred": [], "design": design, "_cosido": base,
                               "before": ((base.get("plan_metrics") or {}).get("coverage") or {}).get("global")}
    informe["skipped"] = []
    disparadores = disparadores_de_cobertura(base, informe["skipped"])
    if not disparadores:
        informe["ms"] = round((time.perf_counter() - t0) * 1000)
        return informe
    mallas_ = cob.mallas(design.get("preparation") or {})
    por_id = {o["id"]: o for o in design["objects"]}
    elegidos: list[dict[str, Any]] = []
    for n_d, disparador in enumerate(disparadores):
        if n_d >= MAX_REPARACIONES_DE_COBERTURA:
            informe["deferred"].append({"trigger": disparador["id"], "regions": disparador["regions"], "reason": f"fuera del presupuesto de {MAX_REPARACIONES_DE_COBERTURA} reparaciones de cobertura"})
            continue
        informe["attempted"] = True
        registro = {**{k: disparador[k] for k in ("id", "cause", "regions", "areaMm2", "object", "pieceId")}, "candidates": [], "accepted": [], "selected": None}
        info = (base.get("coverage_rachas") or {}).get(disparador["regions"][0]) or {}
        reg0 = _region_de(base, disparador["regions"][0]) or {}
        original = por_id.get(disparador["object"]) if disparador.get("object") else None
        # El ancla de lo que se añade: el último objeto de la pieza con el color de la región (o del diseño con ese color).
        color = (disparador.get("color") or {}).get("colorId")
        de_la_pieza = [o for o in design["objects"] if disparador["pieceId"] in ((o.get("identity") or {}).get("pieces") or [])]
        ancla = next((o for o in reversed(de_la_pieza) if o.get("colorId") == color), None) or next((o for o in reversed(design["objects"]) if o.get("colorId") == color), None)
        contexto = {**contexto_base, "disparador": {"measurement": {}}, "medidas": {},
                    "region": {**reg0, "rachas": info.get("rachas") or [], "malla": mallas_.get(info.get("fuente")), "truthAxisGroups": disparador.get("axisGroups")},
                    "color_del_grupo": {g: o.get("colorId") for o in design["objects"] for g in (o.get("identity") or {}).get("groups") or []}}
        for n_e, estrategia in enumerate(COBERTURA_ESTRATEGIAS[disparador["cause"]][:2]):
            cid = chr(ord("B") + n_e)
            cand: dict[str, Any] = {"id": cid, "strategy": estrategia, "parameters": {}, "modifiedObjects": [], "accepted": False, "rejections": []}
            registro["candidates"].append(cand)
            reemplaza = estrategia in GENERADORES and original is not None
            try:
                parametros, nuevos = generadores[estrategia](copy.deepcopy(original if reemplaza else ancla), contexto)
            except SinCandidato as razon:
                cand["rejections"].append(f"no-candidate: {razon}")
                continue
            if reemplaza:
                partes = _trazar(original, nuevos, estrategia, disparador["cause"])
                diseno = aplicar(design, {original["id"]: partes})
                modo, ref = "replace", original
            else:
                partes = [_objeto_recuperado(ancla, x, estrategia, disparador, design) for x in nuevos]
                diseno = insertar(design, (ancla or {}).get("id"), partes, disparador["pieceId"], f"{disparador['cause']}: {estrategia}")
                modo, ref = "add", ancla or partes[0]
            cand.update({"parameters": parametros, "modifiedObjects": [p["id"] for p in partes], "mode": modo})
            try:
                motor.validate_design(diseno, "", canonical_hash_verified=True)
            except ValueError as error:
                cand["rejections"].append(f"contract: {error}")
                continue
            try:
                cosido = coser(diseno, carpeta / disparador["id"] / cid)
                (carpeta / disparador["id"] / cid).mkdir(parents=True, exist_ok=True)
                (carpeta / disparador["id"] / cid / "design.json").write_text(json.dumps(diseno, sort_keys=True), encoding="utf-8")
            except Exception as error:  # noqa: BLE001
                cand["rejections"].append(f"stitch: {type(error).__name__}: {error}")
                continue
            cand["cache"] = "hit" if cosido.get("cacheHit") else "miss"
            # El DST se guarda por su SVG (clave_de_cosido: Ink/Stitch, mecanismo de identidad y SVG): sólo de
            # eso depende. La clave del CANDIDATO nombra además qué lo produjo (algoritmo de cobertura,
            # estrategia, regiones, objeto fuente, IR candidato y Ink/Stitch), para informar y deduplicar.
            cand["cacheKey"] = cosido.get("cacheKey")
            cand["candidateKey"] = hashlib.sha256(json.dumps([cob.ALGORITMO, estrategia, disparador["regions"], ((original if reemplaza else ancla) or {}).get("id"), partes, motor.INKSTITCH_VERSION], sort_keys=True, default=str).encode()).hexdigest()
            cand["inkstitchMs"] = cosido.get("engine_ms")
            cand["coverageMs"] = (((cosido.get("plan_metrics") or {}).get("coverage") or {}).get("ms"))
            t_e = time.perf_counter()
            validacion = evaluar(base, design, {"original": ref, "objects": partes, "trigger": None, "design": diseno, "mode": modo}, cosido, quality_issues)
            cobertura_ = evaluar_cobertura(base, cosido, disparador, mallas_)
            cand["evaluationMs"] = round((time.perf_counter() - t_e) * 1000, 1)
            cand["validation"] = {k: v for k, v in validacion.items() if k not in ("accepted", "rejections")}
            cand["coverage"] = {k: v for k, v in cobertura_.items() if k not in ("accepted", "rejections")}
            cand["rejections"] += validacion["rejections"] + cobertura_["rejections"]
            cand["accepted"] = validacion["accepted"] and cobertura_["accepted"]
            k = _indices(cosido)
            antes = sum(e["puntadas"] for e in base["mapa"]["elementos"] if base["optimized_order"][e["elemento"]]["id"] == (original or {}).get("id")) if reemplaza else 0
            despues = sum(cosido["mapa"]["elementos"][k[i]]["puntadas"] for i in cand["modifiedObjects"] if i in k) if cosido.get("mapa") else 0
            # Lo que se AÑADE se compara con el diseño entero (no tiene un "antes" propio); lo que reemplaza, con su objeto.
            referencia = antes if reemplaza else int(base["dst_metrics"].get("stitchCount") or 0)
            cand["metrics"] = {"geometryDistortion": distorsion(original, cosido, cand["modifiedObjects"]) if reemplaza else 0.0, "stitchDelta": despues - antes, "stitchDeltaRatio": round((despues - antes) / max(referencia, 1), 4), "techniqueChanged": reemplaza and any(p["stitch"]["type"] != original["stitch"]["type"] for p in partes), **geometria_de(cosido, cand["modifiedObjects"])}
            cand["lostPieces"] = len(estructura_de(cosido)["TOPOLOGY_COMPONENT_LOST"])
            cand["_partes"], cand["_cosido"], cand["_diseno"], cand["_modo"], cand["_ancla"] = partes, cosido, diseno, modo, (original if reemplaza else ancla)
        aceptados = [c for c in registro["candidates"] if c["accepted"]]
        registro["accepted"] = [c["id"] for c in aceptados]
        if aceptados:
            mejor = min(aceptados, key=puntuacion_de_cobertura)
            registro["selected"] = mejor["id"]
            registro["reason"] = f"{mejor['id']} ({mejor['strategy']}): el aceptado de menor puntuación {list(puntuacion_de_cobertura(mejor)[:-1])}"
            elegidos.append({**mejor, "_disparador": disparador})
        else:
            registro["reason"] = "ningún candidato mejora la cobertura sin romper nada: la región queda como estaba"
        informe["triggers"].append(registro)
    if elegidos:
        if len(elegidos) == 1:
            final, cosido_final = elegidos[0]["_diseno"], elegidos[0]["_cosido"]
            combinado = {"triggers": [elegidos[0]["_disparador"]["id"]], "verified": True, "rejections": []}
        else:
            final = design
            for c in elegidos:
                if c["_modo"] == "replace":
                    final = aplicar(final, {c["_ancla"]["id"]: c["_partes"]})
                else:
                    final = insertar(final, (c["_ancla"] or {}).get("id"), c["_partes"], c["_disparador"]["pieceId"], f"{c['_disparador']['cause']}: {c['strategy']}")
            combinado = {"triggers": [c["_disparador"]["id"] for c in elegidos], "verified": False, "rejections": []}
            try:
                cosido_final = coser(final, carpeta / "combinado")
                reparados = {p["id"] for c in elegidos for p in c["_partes"]}
                rechazos = []
                for c in elegidos:
                    rechazos += evaluar(base, design, {"original": c["_ancla"] or c["_partes"][0], "objects": c["_partes"], "trigger": None, "design": final, "mode": c["_modo"]}, cosido_final, quality_issues)["rejections"]
                    rechazos += evaluar_cobertura(base, cosido_final, c["_disparador"], mallas_)["rejections"]
                rechazos = [r for r in rechazos if not any(f"{i} (fuera de la reparación)" in r for i in reparados) and "se mueve a otro sitio" not in r and "overdraw" not in r]
                # En la combinación, el balance global se mide una vez, con todas las ganancias juntas.
                c0 = base["plan_metrics"]["coverage"]["global"]["own"]
                c1 = cosido_final["plan_metrics"]["coverage"]["global"]["own"]
                if c1["outsideMm2"] - c0["outsideMm2"] > max(0.0, c1["coveredMm2"] - c0["coveredMm2"]) + TOLERANCIA_DE_AREA_MM2:
                    rechazos.append("coverage: overdraw en la combinación")
                combinado["rejections"] = sorted(set(rechazos))
                combinado["verified"] = not combinado["rejections"]
            except Exception as error:  # noqa: BLE001
                combinado["rejections"] = [f"stitch: {type(error).__name__}: {error}"]
            if not combinado["verified"]:
                mejor = max(elegidos, key=lambda c: (c["coverage"]["local"]["uncoveredBeforeMm2"] - c["coverage"]["local"]["uncoveredAfterMm2"], c["_disparador"]["id"]))
                final, cosido_final = mejor["_diseno"], mejor["_cosido"]
                combinado["fallback"] = mejor["_disparador"]["id"]
        informe.update({"selected": True, "design": final, "_cosido": cosido_final, "combined": combinado,
                        "after": ((cosido_final.get("plan_metrics") or {}).get("coverage") or {}).get("global")})
    for r in informe["triggers"]:
        for c in r["candidates"]:
            for clave in ("_partes", "_cosido", "_diseno", "_modo", "_ancla"):
                c.pop(clave, None)
    informe["ms"] = round((time.perf_counter() - t0) * 1000)
    return informe


def resumen_de_cobertura(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "attempted": c.get("attempted"), "selected": c.get("selected"), "before": c.get("before"), "after": c.get("after"), "ms": c.get("ms"), "coverageAlgorithm": c.get("coverageAlgorithm"),
        "combined": c.get("combined"), "deferred": c.get("deferred"), "skipped": c.get("skipped"),
        "triggers": [{"id": t["id"], "cause": t["cause"], "regions": t["regions"], "areaMm2": t["areaMm2"], "object": t.get("object"), "selected": t["selected"], "reason": t.get("reason"),
                      "candidates": [{"id": x["id"], "strategy": x["strategy"], "mode": x.get("mode"), "accepted": x["accepted"], "rejections": x["rejections"], "cache": x.get("cache"), "candidateKey": x.get("candidateKey"), "inkstitchMs": x.get("inkstitchMs"), "coverageMs": x.get("coverageMs"), "evaluationMs": x.get("evaluationMs"), "coverage": x.get("coverage"), "metrics": x.get("metrics")} for x in t["candidates"]]} for t in c.get("triggers") or []],
    }
