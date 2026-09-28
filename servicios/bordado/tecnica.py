"""V6.4 — VALIDADOR DE TÉCNICA, objeto por objeto.

La estructura puede estar entera y la técnica ser mala: un satin cuyas
puntadas no cruzan la columna, un corrido que se aparta de su trazado, un
relleno con zonas sin hilo. Aquí se mide, para cada objeto del IR, si SUS
puntadas (los rangos propios de V6.3, nunca las de otro objeto) son una
técnica razonable para la geometría que pretendían coser.

  - La INTENCIÓN es el objeto del IR: su tipo, sus parámetros y su
    geometría (los rails y rungs de un satin, el trazado de un corrido, el
    área de un relleno).
  - Las PUNTADAS son las propias del objeto en el DST (`mapa`).
  - Primero MEDICIONES; los umbrales, pocos, con su porqué (INFORME §3).

Sólo detecta: no toca la geometría, el IR, el DST ni la ruta.
"""
from __future__ import annotations

import math
from typing import Any

import pyembroidery as pe
from PIL import Image, ImageDraw, ImageFilter

import identidad as idn

#: Por debajo, una puntada es un remate o un empalme, no la técnica (mm).
PUNTADA_MINIMA_MM = 0.3
#: Muestras mínimas para afirmar algo de una técnica (puntadas de cubierta, puntos).
MUESTRAS_MINIMAS = 8
#: Resolución de las máscaras de área (px por mm).
PX = 10

ALGORITMO = "v6.4-technique"

# ─── Umbrales (ver INFORME §3: qué propiedad miden y de dónde salen) ─────
#: Satin: sus dos bordes reciben pasadas de rail a rail a todo lo largo (`railCoverage`). Si la mitad
#: de los bordes no tiene ninguna cerca, esa parte no es un satin (se cose a lo largo).
SATIN_CRUCE_MINIMO = 0.5
#: Satin: la columna más ancha que el motor admite (`SATIN_TOO_WIDE`, 6 mm), más la
#: compensación de los dos lados y el redondeo del DST. Una PASADA de cubierta más larga
#: no es un satin: el motor la parte en dos puntadas colineales para que quepa.
SATIN_PASADA_MAXIMA_MM = 6.0 + 2 * 0.15 + 0.1
#: …y si más de una décima parte de las pasadas es así, el objeto no se cose como satin.
SATIN_FRACCION_LARGA = 0.1
#: Satin: hilo por el centro (lejos de los dos rails) frente a dos pasadas de su eje (el
#: underlay de centro va y vuelve una vez). Más del doble es otra cosa: un recorrido a lo largo.
SATIN_CENTRO_MAXIMO = 2.0
#: …y sin underlay no debería haber casi nada por el centro.
SATIN_CENTRO_SIN_UNDERLAY = 0.5
#: Satin (sólo medida, `misalignedRatio`): una puntada de más del doble del ancho local de su columna.
#: No decide: en esquinas y remates los rails rodean la columna y la medida da falsos positivos.
SATIN_RAZON_MALA = 2.0
#: Corrido: el hilo mide 0.4 mm; un corrido cuyo p95 se aparta más de eso de su trazado no lo sigue.
CORRIDO_FUERA_MM = 0.4
#: Corrido: pasadas de más sobre las que pide su técnica (1 + 2·bean); con remates, +2 es normal.
CORRIDO_PASADAS_DE_MAS = 2
#: …en más de la mitad de su largo: la ida y vuelta ya no es un remate.
CORRIDO_FRACCION_REPASO = 0.5
#: General: más de esta parte de las puntadas propias por debajo de 0.3 mm (o en el mismo agujero)
#: es un objeto que se amontona (ver INFORME §3 para lo medido en los casos buenos).
CASI_CERO_FRACCION = 0.35
#: Las puntadas cortas de los dos remates de Ink/Stitch (tie-in + tie-off, 4 cada uno como mucho).
PUNTADAS_DE_REMATE = 8
#: Satin: una columna cuyo ancho entre rails no llega a 0.3 mm (su p95) no tiene ancho para una
#: puntada de cubierta: es un satin colapsado (cose ida y vuelta en la misma línea).
SATIN_ANCHO_COLAPSADO_MM = 0.3
#: Relleno: menos de esta parte del interior sin huecos visibles no es un relleno.
RELLENO_COBERTURA_MINIMA = 0.6
#: Relleno: un punto del interior a más de medio milímetro de todo hilo está en un hueco de 1 mm, que
#: se ve. Cada puntada se pinta con este ancho: un tatami de 0.45 mm cubre todo, gire como gire (con
#: el ancho del hilo, 0.4 mm, la medida dependía del redondeo del DST a 0.1 mm: ver INFORME §3).
RELLENO_HUECO_VISIBLE_MM = 1.0
#: Relleno: por debajo de esta área (mm²) su interior no se puede medir con 0.1 mm.
RELLENO_AREA_MINIMA = 2.0


def _percentiles(v: list[float]) -> dict[str, float]:
    if not v:
        return {}
    o = sorted(v)
    q = lambda p: o[min(len(o) - 1, int(round(p * (len(o) - 1))))]  # noqa: E731
    return {"min": round(o[0], 3), "p50": round(q(0.5), 3), "p75": round(q(0.75), 3), "p95": round(q(0.95), 3), "max": round(o[-1], 3)}


def _largo(t) -> float:
    return math.dist(t[0], t[1])


class _Polilinea:
    """Distancia EXACTA de un punto a una polilínea (sin radio máximo: el ancho de una columna puede pasar de 1 mm)."""

    CELDA = 1.0

    def __init__(self, puntos: list[tuple[float, float]]) -> None:
        self.tramos = list(zip(puntos, puntos[1:]))
        # Cada tramo, en las celdas por las que pasa (muestreado cada media celda).
        self.celdas: dict[tuple[int, int], list[int]] = {}
        for k, (a, b) in enumerate(self.tramos):
            n = max(1, math.ceil(2 * math.dist(a, b) / self.CELDA))
            vistos = {(math.floor((a[0] + (b[0] - a[0]) * i / n) / self.CELDA), math.floor((a[1] + (b[1] - a[1]) * i / n) / self.CELDA)) for i in range(n + 1)}
            for c in vistos:
                self.celdas.setdefault(c, []).append(k)
        cs = list(self.celdas) or [(0, 0)]
        self.caja = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs))
        # V6.4.2: el arco acumulado al comienzo de cada tramo (para situar un punto A LO LARGO del rail).
        self.arcos = [0.0]
        for a, b in self.tramos:
            self.arcos.append(self.arcos[-1] + math.dist(a, b))

    def cercano(self, p: tuple[float, float]) -> tuple[float, int]:
        """(distancia, tramo más cercano). Por anillos de celdas alrededor de `p`. Tras el anillo r, lo que
        falta está a ≥ (r − 1) celdas (una de margen: el muestreo puede saltarse la esquina de una celda):
        así el mínimo es exacto."""
        if not self.tramos:
            return math.inf, -1
        cx, cy = math.floor(p[0] / self.CELDA), math.floor(p[1] / self.CELDA)
        x0, y0, x1, y1 = self.caja
        r_max = max(abs(cx - x0), abs(cx - x1), abs(cy - y0), abs(cy - y1)) + 1
        mejor, k_mejor, vistos = math.inf, -1, set()
        for r in range(r_max + 1):
            for dx in range(-r, r + 1):
                for dy in ((-r, r) if abs(dx) != r else range(-r, r + 1)):
                    for k in self.celdas.get((cx + dx, cy + dy), ()):
                        if k not in vistos:
                            vistos.add(k)
                            d = idn._dist_seg(p, *self.tramos[k])
                            if d < mejor or (d == mejor and k < k_mejor):
                                mejor, k_mejor = d, k
            if mejor <= (r - 1) * self.CELDA:
                break
        return mejor, k_mejor

    def distancia(self, p: tuple[float, float]) -> float:
        return self.cercano(p)[0]

    def en_arco(self, s: float) -> tuple[float, float]:
        s = max(0.0, min(self.arcos[-1], s))
        for k, (a, b) in enumerate(self.tramos):
            if self.arcos[k + 1] >= s:
                l = self.arcos[k + 1] - self.arcos[k]
                t = (s - self.arcos[k]) / l if l > 0 else 0.0
                return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        return self.tramos[-1][1]

    def arco_y_tangente(self, p: tuple[float, float], ventana: float = 0.5) -> tuple[float, tuple[float, float]]:
        """Dónde cae `p` a lo largo del rail (arco de su proyección) y la tangente unitaria del rail ahí,
        medida entre ±`ventana` mm de arco (un vértice suelto no cambia la dirección de la columna)."""
        _, k = self.cercano(p)
        if k < 0:
            return 0.0, (1.0, 0.0)
        a, b = self.tramos[k]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l2 = dx * dx + dy * dy
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
        s = self.arcos[k] + t * math.sqrt(l2)
        q0, q1 = self.en_arco(s - ventana), self.en_arco(s + ventana)
        l = math.dist(q0, q1)
        return s, (((q1[0] - q0[0]) / l, (q1[1] - q0[1]) / l) if l > 1e-9 else (1.0, 0.0))


def _problema(codigo: str, severidad: str, objeto: dict, tecnica: str, medicion: dict, esperado: str, confianza: float, mensaje: str) -> dict[str, Any]:
    return {"code": codigo, "severity": severidad, "objectId": objeto.get("id"), "irObject": (objeto.get("identity") or {}).get("id"), "technique": tecnica, "measurement": medicion, "expected": esperado, "confidence": round(confianza, 2), "message": mensaje}


def _confianza(n: int) -> float:
    """Más muestras, más confianza: 0.5 con el mínimo, hacia 1 con muchas."""
    return max(0.0, min(1.0, 1 - MUESTRAS_MINIMAS / (2 * max(n, 1))))


# ─── SATIN ───────────────────────────────────────────────────────────────

class _Borde:
    """El borde de una columna (sus dos rails y las tapas que los unen), para
    preguntar, en cualquier punto, cuál es el tramo de borde más cercano:
    su DIRECCIÓN dice hacia dónde va la columna ahí."""

    def __init__(self, rail1: list[tuple[float, float]], rail2: list[tuple[float, float]]) -> None:
        # Sólo los rails: en las tapas (donde empieza y acaba la columna) las
        # puntadas les son paralelas por construcción.
        self.tramos = list(zip(rail1, rail1[1:])) + list(zip(rail2, rail2[1:]))
        self.celdas: dict[tuple[int, int], list[int]] = {}
        for k, (a, b) in enumerate(self.tramos):
            for cx in range(math.floor(min(a[0], b[0])), math.floor(max(a[0], b[0])) + 1):
                for cy in range(math.floor(min(a[1], b[1])), math.floor(max(a[1], b[1])) + 1):
                    self.celdas.setdefault((cx, cy), []).append(k)

    def mas_cercano(self, p: tuple[float, float]) -> tuple[float, int]:
        """(distancia, índice del tramo), buscando en anillos de celdas hasta que ninguno más cerca pueda quedar."""
        cx, cy = math.floor(p[0]), math.floor(p[1])
        mejor, cual = math.inf, -1
        for r in range(0, 64):
            if mejor < r - 1:
                break
            for i in range(cx - r, cx + r + 1):
                for j in (cy - r, cy + r) if r else (cy,):
                    for k in self.celdas.get((i, j), ()):
                        d = idn._dist_seg(p, *self.tramos[k])
                        if d < mejor:
                            mejor, cual = d, k
            for j in range(cy - r + 1, cy + r):
                for i in (cx - r, cx + r) if r else ():
                    for k in self.celdas.get((i, j), ()):
                        d = idn._dist_seg(p, *self.tramos[k])
                        if d < mejor:
                            mejor, cual = d, k
        return mejor, cual

    def angulo(self, k: int, u: tuple[float, float]) -> float:
        """Ángulo (0–90°) entre la dirección `u` y el tramo de borde `k`."""
        a, b = self.tramos[k]
        v = (b[0] - a[0], b[1] - a[1])
        n = math.hypot(*v) * math.hypot(*u)
        if n == 0:
            return 90.0
        return math.degrees(math.acos(min(1.0, abs(v[0] * u[0] + v[1] * u[1]) / n)))


def _cruzan(p, q, r, s) -> bool:
    """Si los segmentos pq y rs se cortan en su interior (sin contar compartir un extremo)."""
    def o(a, b, c):
        v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        return 0 if abs(v) < 1e-9 else (1 if v > 0 else -1)
    if min(math.dist(x, y) for x in (p, q) for y in (r, s)) < 0.05:
        return False
    return o(p, q, r) * o(p, q, s) < 0 and o(r, s, p) * o(r, s, q) < 0


def _cruces(segmentos) -> int:
    """Pares de segmentos que se cruzan, con celdas de 1 mm para no compararlos todos."""
    celdas: dict[tuple[int, int], list[int]] = {}
    for k, (a, b) in enumerate(segmentos):
        for cx in range(math.floor(min(a[0], b[0])), math.floor(max(a[0], b[0])) + 1):
            for cy in range(math.floor(min(a[1], b[1])), math.floor(max(a[1], b[1])) + 1):
                celdas.setdefault((cx, cy), []).append(k)
    vistos: set[tuple[int, int]] = set()
    n = 0
    for lista in celdas.values():
        for i in range(len(lista)):
            for j in range(i + 1, len(lista)):
                par = (lista[i], lista[j])
                if par in vistos:
                    continue
                vistos.add(par)
                if _cruzan(*segmentos[par[0]], *segmentos[par[1]]):
                    n += 1
    return n


def _pasadas_rectas(tramos) -> list:
    """Los tramos seguidos y colineales (< 10°) unidos en una pasada: una puntada de satin
    demasiado larga el motor la parte en varias, y la pasada es la de rail a rail."""
    salida: list = []
    for a, b in tramos:
        if salida:
            p, q = salida[-1]
            u = (q[0] - p[0], q[1] - p[1])
            v = (b[0] - a[0], b[1] - a[1])
            nu, nv = math.hypot(*u), math.hypot(*v)
            if math.dist(q, a) < 1e-6 and nu > 0 and nv > 0 and (u[0] * v[0] + u[1] * v[1]) / (nu * nv) > math.cos(math.radians(10)):
                salida[-1] = (p, b)
                continue
        salida.append((a, b))
    return salida


#: Dónde está un punto dentro de la columna, t = d1 / (d1 + d2): 0 en el rail 1, 1 en el 2.
#: Cerca de un rail es t < 0.35 (o > 0.65): relativo al ancho, porque Ink/Stitch acorta una de
#: cada dos puntadas en el lado de dentro de una curva (un 15 % del ancho: `short stitches`).
LADO_DE_RAIL = 0.35


def _lado(p, r1: "_Polilinea", r2: "_Polilinea") -> int:
    """-1 junto al rail 1, +1 junto al rail 2, 0 por el centro de la columna."""
    d1, d2 = r1.distancia(p), r2.distancia(p)
    if d1 + d2 == 0:
        return 0
    t = d1 / (d1 + d2)
    return -1 if t < LADO_DE_RAIL else 1 if t > 1 - LADO_DE_RAIL else 0


def _muestras(tramos, paso: float = 0.2):
    """Puntos cada `paso` mm a lo largo de unos tramos (en el centro de cada trocito)."""
    for p, q in tramos:
        n = max(1, math.ceil(math.dist(p, q) / paso))
        for i in range(n):
            t = (i + 0.5) / n
            yield (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)


def _cobertura_de_rails(tramos, r1: "_Polilinea", r2: "_Polilinea", separacion: float) -> float | None:
    """Qué parte de los dos rails tiene cerca (a `max(1 mm, 3 × separación)`) la punta de una
    pasada de rail a rail. Un satin bueno llega a sus dos bordes a todo lo largo, tenga el underlay
    y los remates que tenga; uno que corre a lo largo de la columna no llega a ninguno."""
    radio = max(1.0, 3 * separacion)
    puntas: dict[tuple[int, int], list] = {}
    for a, b in _pasadas_rectas(tramos):
        if math.dist(a, b) >= PUNTADA_MINIMA_MM and _lado(a, r1, r2) * _lado(b, r1, r2) == -1:
            for p in (a, b):
                puntas.setdefault((math.floor(p[0]), math.floor(p[1])), []).append(p)
    cubiertas = total = 0
    for rail in (r1, r2):
        for p, q in rail.tramos:
            l = math.dist(p, q)
            n = max(1, math.ceil(l / 0.2))
            for i in range(n):
                t = (i + 0.5) / n
                m = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
                total += 1
                cx, cy = math.floor(m[0]), math.floor(m[1])
                r = math.ceil(radio)
                if any(math.dist(m, x) <= radio for dx in range(-r, r + 1) for dy in range(-r, r + 1) for x in puntas.get((cx + dx, cy + dy), ())):
                    cubiertas += 1
    return round(cubiertas / total, 3) if total else None


#: V6.4.2: dos pasadas seguidas cuyos extremos retroceden más que esto en un rail (mm) rompen la monotonía.
RETROCESO_MM = 0.5


def geometria_de_pasadas(pasadas, r1: "_Polilinea", r2: "_Polilinea") -> dict[str, Any] | None:
    """V6.4.2 — la GEOMETRÍA de un satin cosido, pasada a pasada (sólo medidas, ninguna decide un estado):

    - oblicuidad: el ángulo de cada pasada con la normal local de la columna (la perpendicular a la
      bisectriz de las tangentes de sus dos rails donde toca cada uno). 0° es transversal; un abanico
      sube. En una curva la normal gira con los rails: una curva bien cosida no se penaliza;
    - cambio de dirección entre pasadas seguidas (sin distinguir ida y vuelta);
    - monotonía: cuántas veces el extremo de una pasada retrocede en su rail (> `RETROCESO_MM`);
    - largo máximo y p95 de las pasadas.
    """
    if len(pasadas) < 2:
        return None
    oblicuidades, direcciones, arcos = [], [], []
    for a, b in pasadas:
        # El extremo de a en el rail 1 o en el 2: el que esté más cerca.
        if r1.distancia(a) + r2.distancia(b) > r1.distancia(b) + r2.distancia(a):
            a, b = b, a
        s1, t1 = r1.arco_y_tangente(a)
        s2, t2 = r2.arco_y_tangente(b)
        l = math.dist(a, b)
        u = ((b[0] - a[0]) / l, (b[1] - a[1]) / l)
        bx, by = t1[0] + t2[0], t1[1] + t2[1]
        lb = math.hypot(bx, by)
        bx, by = ((bx / lb, by / lb) if lb > 1e-9 else t1)
        oblicuidades.append(math.degrees(math.asin(min(1.0, abs(u[0] * bx + u[1] * by)))))
        direcciones.append(math.degrees(math.atan2(u[1], u[0])) % 180)
        arcos.append((s1, s2))

    # Rachas monótonas: el avance a lo largo de la columna (s1 + s2) cambia de sentido cuando retrocede
    # más de `RETROCESO_MM` desde el último extremo. Ink/Stitch cose a veces un satin en dos mitades (hasta
    # la mitad y vuelta desde el final): eso es UNA ruptura, no una por pasada.
    retrocesos, sentido, extremo = 0, 0, None
    for s1, s2 in arcos:
        u = s1 + s2
        if extremo is None:
            extremo = u
            continue
        paso = u - extremo
        if sentido == 0:
            if abs(paso) > RETROCESO_MM:
                sentido, extremo = (1 if paso > 0 else -1), u
        elif paso * sentido >= 0:
            extremo = u
        elif abs(paso) > RETROCESO_MM:
            retrocesos += 1
            sentido, extremo = -sentido, u
    deltas = [min(abs(x - y) % 180, 180 - abs(x - y) % 180) for x, y in zip(direcciones, direcciones[1:])]
    largos = [math.dist(a, b) for a, b in pasadas]
    return {
        "passes": len(pasadas),
        "obliquityDeg": _percentiles(oblicuidades),
        "directionDeltaDeg": _percentiles(deltas),
        "monotonicityBreaks": retrocesos,
        "passMaxMm": round(max(largos), 3),
        "passP95Mm": _percentiles(largos).get("p95"),
    }


def _satin(o: dict, tramos, indices_rail, borde: "_Borde") -> tuple[dict, list]:
    """Satin: cada puntada, por dónde empieza y acaba respecto a sus dos rails.

    - cubierta: de un rail al otro (lo que es un satin);
    - mismo rail: empieza y acaba en el mismo borde (recorre la columna);
    - centro: ninguno de los dos extremos en un rail (el underlay, o un
      recorrido longitudinal por dentro);
    - mixta: un extremo en un rail y el otro dentro.
    """
    stitch = o.get("stitch") or {}
    tiron = float(stitch.get("pullCompensationMm", 0.15))
    con_underlay = bool(stitch.get("underlay", True))
    r1, r2 = indices_rail
    clases = {"cubierta": 0, "mismo_rail": 0, "centro": 0, "mixta": 0}
    largo_centro = 0.0
    cubiertas: list = []
    razones: list[float] = []
    anchos: list[float] = []
    paralelas = 0
    largo_paralelo = largo_cubierta = 0.0
    for a, b in tramos:
        l = _largo((a, b))
        if l < PUNTADA_MINIMA_MM:
            continue
        la, lb = _lado(a, r1, r2), _lado(b, r1, r2)
        if la == 0 and lb == 0:
            clases["centro"] += 1
            largo_centro += l
            continue
        if la == 0 or lb == 0:
            clases["mixta"] += 1
            continue
        if la == lb:
            clases["mismo_rail"] += 1
            continue
        clases["cubierta"] += 1
        cubiertas.append((a, b))
        largo_cubierta += l
        # Medidas (no deciden, ver INFORME §8): el ancho de la forma en su punto
        # medio y si corre paralela a su borde más cercano.
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        w = max(2 * min(r1.distancia(m), r2.distancia(m)), 0.05)
        anchos.append(w)
        razones.append(l / (w + 2 * tiron))
        u = (b[0] - a[0], b[1] - a[1])
        n = max(2, math.ceil(l / 0.5))  # cada 0.5 mm: es una medida, no decide
        par = 0
        for i in range(1, n):
            q = (a[0] + u[0] * i / n, a[1] + u[1] * i / n)
            _, kb = borde.mas_cercano(q)
            if kb >= 0 and borde.angulo(kb, u) < 30:
                par += 1
        if par > 0.5 * (n - 1):
            paralelas += 1
            largo_paralelo += l
    # Pasadas de cubierta (de rail a rail), reconstruidas de las puntadas partidas.
    pasadas = [
        math.dist(a, b)
        for a, b in _pasadas_rectas(tramos)
        if math.dist(a, b) >= PUNTADA_MINIMA_MM and _lado(a, r1, r2) * _lado(b, r1, r2) == -1
    ]
    largas = sum(1 for x in pasadas if x > SATIN_PASADA_MAXIMA_MM)
    cobertura_eje = _cobertura_de_rails(tramos, r1, r2, float(stitch.get("spacingMm", 0.42)))
    # El ancho de la GEOMETRÍA (no de las puntadas): de cada muestra de un rail al otro.
    ancho_rails = [r2.distancia(m) for m in _muestras(r1.tramos, 0.5)] + [r1.distancia(m) for m in _muestras(r2.tramos, 0.5)]
    con_rail = clases["cubierta"] + clases["mismo_rail"] + clases["mixta"]
    largo_eje = (sum(math.dist(p, q) for p, q in r1.tramos) + sum(math.dist(p, q) for p, q in r2.tramos)) / 2
    medidas = {
        "stitchClasses": clases,
        "coverStitches": clases["cubierta"],
        "crossingRatio": round(clases["cubierta"] / con_rail, 3) if con_rail else None,
        "centerLengthRatio": round(largo_centro / max(2 * largo_eje, 1e-6), 3),
        "coverPassMm": _percentiles(pasadas),
        "longPassRatio": round(largas / len(pasadas), 3) if pasadas else None,
        "coverCrossings": _cruces(cubiertas),
        "railCoverage": cobertura_eje,
        "railWidthMm": _percentiles(ancho_rails),
        "widthRatio": _percentiles(razones),
        "misalignedRatio": round(sum(1 for r in razones if r > SATIN_RAZON_MALA) / len(razones), 3) if razones else None,
        "longitudinalLengthRatio": round(largo_paralelo / largo_cubierta, 3) if largo_cubierta else None,
        "columnWidthMm": _percentiles(anchos),
        "satinGeometry": geometria_de_pasadas([(a, b) for a, b in _pasadas_rectas(tramos) if math.dist(a, b) >= PUNTADA_MINIMA_MM and _lado(a, r1, r2) * _lado(b, r1, r2) == -1], r1, r2),
    }
    problemas = []
    # El colapso es de la GEOMETRÍA: se juzga aunque haya pocas puntadas que medir.
    if ancho_rails and medidas["railWidthMm"]["p95"] < SATIN_ANCHO_COLAPSADO_MM:
        problemas.append(_problema("SATIN_COLLAPSED", "error", o, "satin", {"railWidthMm": medidas["railWidthMm"]}, f"p95 del ancho entre rails ≥ {SATIN_ANCHO_COLAPSADO_MM} mm", 0.9, f"Los dos rails del satin están a menos de {SATIN_ANCHO_COLAPSADO_MM} mm en casi todo su largo (p95 {medidas['railWidthMm']['p95']} mm): la columna no tiene ancho y el satin cose en la misma línea."))
    medibles = con_rail + clases["centro"]
    if medibles < MUESTRAS_MINIMAS:
        problemas.append(_problema("TECHNIQUE_UNCERTAIN", "info", o, "satin", {"stitches": medibles}, f"≥ {MUESTRAS_MINIMAS} puntadas", 0.3, "Satin con muy pocas puntadas para medir su técnica."))
        return medidas, problemas
    conf = _confianza(medibles)
    if cobertura_eje is not None and cobertura_eje < SATIN_CRUCE_MINIMO:
        problemas.append(_problema("SATIN_NOT_CROSSING", "error", o, "satin", {"railCoverage": cobertura_eje, "crossingRatio": medidas["crossingRatio"], "stitchClasses": clases}, f"≥ {SATIN_CRUCE_MINIMO} de los dos rails con una pasada de rail a rail cerca", conf, f"Sólo el {round(100 * cobertura_eje)} % de los bordes del satin recibe una pasada que cruce la columna: el resto se cose a lo largo, no de borde a borde."))
    exceso = medidas["centerLengthRatio"] > (SATIN_CENTRO_MAXIMO if con_underlay else SATIN_CENTRO_SIN_UNDERLAY)
    if exceso and largo_centro > largo_cubierta:
        problemas.append(_problema("SATIN_CENTER_EXCESS", "error", o, "satin", {"centerLengthRatio": medidas["centerLengthRatio"], "underlay": con_underlay}, f"hilo por el centro ≤ {SATIN_CENTRO_MAXIMO if con_underlay else SATIN_CENTRO_SIN_UNDERLAY}× dos pasadas de su eje", conf, "El satin cose más hilo por dentro de la columna, sin tocar sus bordes, que de borde a borde: corre a lo largo, no cruza."))
    if (medidas["longPassRatio"] or 0) > SATIN_FRACCION_LARGA:
        problemas.append(_problema("SATIN_PASS_TOO_WIDE", "error", o, "satin", {"longPassRatio": medidas["longPassRatio"], "coverPassMm": medidas["coverPassMm"]}, f"≤ {SATIN_FRACCION_LARGA} de las pasadas de rail a rail de más de {SATIN_PASADA_MAXIMA_MM:.1f} mm", conf, f"El {round(100 * medidas['longPassRatio'])} % de las pasadas de este satin cruza más de {SATIN_PASADA_MAXIMA_MM:.1f} mm de rail a rail (máx. {medidas['coverPassMm'].get('max')} mm): la columna es más ancha de lo que un satin cubre y el motor parte sus puntadas."))
    return medidas, problemas


# ─── RUNNING ─────────────────────────────────────────────────────────────

#: Lo que ocupa un remate de Ink/Stitch (tie-in / tie-off) en cada punta de un corrido (mm).
REMATE_MM = 1.0
#: La puntada del corrido en Ink/Stitch (`running_stitch_length_mm`). Un trazado que no tiene al menos
#: una puntada entera fuera de sus dos remates es TODO remate: su repaso no se puede juzgar.
CORRIDO_PUNTADA_MM = 2.2


def _pasadas(tramos, trazado: list[list[tuple[float, float]]], radio: float = 0.2) -> list[int]:
    """Por cada muestra del trazado (cada 0.2 mm), cuántos tramos propios pasan a `radio` de ella.
    Sin las puntas (`REMATE_MM`): ahí el remate cose varias veces a propósito."""
    celdas: dict[tuple[int, int], list[int]] = {}
    for k, (a, b) in enumerate(tramos):
        for cx in range(math.floor(min(a[0], b[0]) - radio), math.floor(max(a[0], b[0]) + radio) + 1):
            for cy in range(math.floor(min(a[1], b[1]) - radio), math.floor(max(a[1], b[1]) + radio) + 1):
                celdas.setdefault((cx, cy), []).append(k)
    salida = []
    for linea in trazado:
        total = sum(math.dist(p, q) for p, q in zip(linea, linea[1:]))
        recorrido = 0.0
        for p, q in zip(linea, linea[1:]):
            l = math.dist(p, q)
            n = max(1, math.ceil(l / 0.2))
            for i in range(n):
                t = (i + 0.5) / n
                s_ = recorrido + l * t
                if s_ < REMATE_MM or s_ > total - REMATE_MM:
                    continue
                m = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
                cerca = sorted({k for k in celdas.get((math.floor(m[0]), math.floor(m[1])), ()) if idn._dist_seg(m, *tramos[k]) <= radio})
                # Una PASADA es una racha de tramos seguidos: con puntadas cortas, dos o tres tramos
                # consecutivos de la misma pasada caen a `radio` de la muestra y no son un repaso.
                salida.append(sum(1 for i, k in enumerate(cerca) if i == 0 or k != cerca[i - 1] + 1))
            recorrido += l
    return salida


def _corrido(o: dict, tramos, trazado) -> tuple[dict, list]:
    stitch = o.get("stitch") or {}
    esperadas = 1 + 2 * int(stitch.get("beanRepeats", 1))
    tramos_eje = [(p, q) for linea in trazado for p, q in zip(linea, linea[1:])]
    eje = idn._Indice(tramos_eje, 1.0)
    puntos = sorted({p for t in tramos for p in t})
    dist = [min(eje.distancia(p), 9.99) for p in puntos]
    pasadas = _pasadas(tramos, trazado)
    de_mas = sum(1 for n in pasadas if n > esperadas + CORRIDO_PASADAS_DE_MAS)
    medidas = {
        "points": len(puntos),
        "axisDistanceMm": _percentiles(dist),
        "expectedPasses": esperadas,
        "passes": _percentiles([float(n) for n in pasadas]),
        "retraceRatio": round(de_mas / len(pasadas), 3) if pasadas else None,
        "uncoveredAxisRatio": round(sum(1 for n in pasadas if n == 0) / len(pasadas), 3) if pasadas else None,
    }
    problemas = []
    largo = sum(math.dist(p, q) for p, q in tramos_eje)
    medidas["pathLengthMm"] = round(largo, 2)
    if largo < PUNTADA_MINIMA_MM:
        # Un trazado de un punto (o casi) que cose igual: no hay eje con el que comparar.
        problemas.append(_problema("RUNNING_DEGENERATE_PATH", "warning", o, "running", {"pathLengthMm": medidas["pathLengthMm"], "stitches": len(tramos)}, f"trazado ≥ {PUNTADA_MINIMA_MM} mm", 0.9, f"El corrido no tiene trazado (mide {medidas['pathLengthMm']} mm) pero cose {len(tramos)} puntadas: el objeto está degenerado en el IR."))
        return medidas, problemas
    if len(puntos) < MUESTRAS_MINIMAS // 2:
        problemas.append(_problema("TECHNIQUE_UNCERTAIN", "info", o, "running", {"points": len(puntos), "aspect": "all"}, f"≥ {MUESTRAS_MINIMAS // 2} puntos", 0.3, "Corrido con muy pocas puntadas para medir su técnica."))
        return medidas, problemas
    conf = _confianza(len(puntos))
    # El eje se juzga siempre (un remate cose SOBRE el trazado); el repaso, sólo fuera de los remates.
    if medidas["axisDistanceMm"].get("p95", 0) > CORRIDO_FUERA_MM:
        problemas.append(_problema("RUNNING_OFF_AXIS", "error", o, "running", {"axisDistanceMm": medidas["axisDistanceMm"]}, f"p95 ≤ {CORRIDO_FUERA_MM} mm del trazado", conf, f"Las puntadas del corrido se apartan de su trazado (p95 {medidas['axisDistanceMm']['p95']} mm; el hilo mide 0.4)."))
    if not pasadas or largo < 2 * REMATE_MM + CORRIDO_PUNTADA_MM:
        problemas.append(_problema("TECHNIQUE_UNCERTAIN", "info", o, "running", {"pathLengthMm": medidas["pathLengthMm"], "aspect": "retrace"}, f"trazado ≥ {2 * REMATE_MM + CORRIDO_PUNTADA_MM} mm (dos remates y una puntada)", 0.3, "Corrido más corto que sus dos remates y una puntada: su repaso no se puede juzgar (sí su eje)."))
        return medidas, problemas
    if (medidas["retraceRatio"] or 0) > CORRIDO_FRACCION_REPASO:
        problemas.append(_problema("RUNNING_EXCESSIVE_RETRACE", "error", o, "running", {"retraceRatio": medidas["retraceRatio"], "passes": medidas["passes"], "expectedPasses": esperadas}, f"≤ {CORRIDO_FRACCION_REPASO} del trazado con más de {esperadas + CORRIDO_PASADAS_DE_MAS} pasadas", conf, f"El {round(100 * medidas['retraceRatio'])} % del corrido se cose más de {esperadas + CORRIDO_PASADAS_DE_MAS} veces (su técnica pide {esperadas})."))
    return medidas, problemas


# ─── FILL ────────────────────────────────────────────────────────────────

def _mascara_de_area(anillos, caja) -> Image.Image:
    """El área (par-impar) de unos anillos, a PX px/mm."""
    x0, y0, x1, y1 = caja
    im = Image.new("1", (max(1, math.ceil((x1 - x0) * PX) + 2), max(1, math.ceil((y1 - y0) * PX) + 2)), 0)
    for a in anillos:
        if len(a) < 3:
            continue
        capa = Image.new("1", im.size, 0)
        ImageDraw.Draw(capa).polygon([((x - x0) * PX + 1, (y - y0) * PX + 1) for x, y in a], fill=1)
        im = Image.frombytes("1", im.size, bytes(p ^ q for p, q in zip(im.tobytes(), capa.tobytes())))
    return im.convert("L").point(lambda v: 255 if v else 0)


def _relleno(o: dict, tramos, anillos) -> tuple[dict, list]:
    xs = [p[0] for a in anillos for p in a]
    ys = [p[1] for a in anillos for p in a]
    if not xs:
        return {}, []
    caja = (min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1)
    area = _mascara_de_area(anillos, caja)
    # El interior: el área sin su borde (0.3 mm: la compensación y el hilo que se abre en él).
    interior = area.filter(ImageFilter.MinFilter(7))
    n_interior = interior.histogram()[255]
    hilo = Image.new("L", area.size, 0)
    dib = ImageDraw.Draw(hilo)
    for a, b in tramos:
        dib.line([((a[0] - caja[0]) * PX + 1, (a[1] - caja[1]) * PX + 1), ((b[0] - caja[0]) * PX + 1, (b[1] - caja[1]) * PX + 1)], fill=255, width=round(RELLENO_HUECO_VISIBLE_MM * PX))
    cubierto = Image.frombytes("L", area.size, bytes(255 if (i and h) else 0 for i, h in zip(interior.tobytes(), hilo.tobytes()))).histogram()[255]
    largos = [_largo(t) for t in tramos if _largo(t) >= PUNTADA_MINIMA_MM]
    # Dirección dominante, pesada por largo (módulo 180°), y cuánto se concentra en ±10°.
    hist = [0.0] * 18
    for a, b in tramos:
        l = _largo((a, b))
        if l < 1:
            continue
        ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) % 180
        hist[int(ang // 10) % 18] += l
    total = sum(hist) or 1
    pico = max(range(18), key=lambda i: hist[i])
    concentracion = (hist[pico] + hist[(pico - 1) % 18] + hist[(pico + 1) % 18]) / total
    area_mm2 = area.histogram()[255] / (PX * PX)
    largo_total = sum(_largo(t) for t in tramos)
    medidas = {
        "areaMm2": round(area_mm2, 2),
        "interiorCoverage": round(cubierto / n_interior, 3) if n_interior else None,
        "dominantAngleDeg": pico * 10 + 5,
        "directionConcentration": round(concentracion, 3),
        "threadMmPerMm2": round(largo_total / max(area_mm2, 1e-6), 2),
        "fillStitchLengthMm": _percentiles(largos),
    }
    problemas = []
    if area_mm2 < RELLENO_AREA_MINIMA or n_interior < 50:
        problemas.append(_problema("TECHNIQUE_UNCERTAIN", "info", o, "fill", {"areaMm2": medidas["areaMm2"]}, f"≥ {RELLENO_AREA_MINIMA} mm² de área", 0.3, "Relleno demasiado pequeño para medir su interior."))
        return medidas, problemas
    if medidas["interiorCoverage"] is not None and medidas["interiorCoverage"] < RELLENO_COBERTURA_MINIMA:
        problemas.append(_problema("FILL_COVERAGE_IRREGULAR", "error", o, "fill", {"interiorCoverage": medidas["interiorCoverage"], "areaMm2": medidas["areaMm2"]}, f"≥ {RELLENO_COBERTURA_MINIMA} del interior con hilo", 0.8, f"Sólo el {round(100 * medidas['interiorCoverage'])} % del interior del relleno tiene hilo encima."))
    return medidas, problemas


# ─── General ─────────────────────────────────────────────────────────────

def _general(o: dict, tecnica: str, tramos, ceros: int = 0) -> tuple[dict, list]:
    stitch = o.get("stitch") or {}
    largos = [_largo(t) for t in tramos]
    maximo = {"running": 2.2, "satin": 6.3, "fill": float(stitch.get("maxStitchLengthMm", 4))}[tecnica]
    # Casi cero: más cortas que el paso mínimo con sentido (`PUNTADA_MINIMA_MM`), o en el mismo agujero.
    cortas = sum(1 for l in largos if l < PUNTADA_MINIMA_MM) + ceros
    largas = [l for l in largos if l > 1.5 * maximo]
    total = len(largos) + ceros
    medidas = {"stitches": total, "stitchLengthMm": _percentiles(largos), "zeroStitches": ceros, "nearZeroRatio": round(cortas / total, 3) if total else None, "longInternalStitches": len(largas), "techniqueMaxMm": maximo}
    problemas = []
    # Los dos remates (hasta `PUNTADAS_DE_REMATE` puntadas cortas a propósito) no cuentan.
    base = total - PUNTADAS_DE_REMATE
    sin_remates = max(0, cortas - PUNTADAS_DE_REMATE) / base if base > 0 else None
    medidas["nearZeroRatioWithoutTies"] = round(sin_remates, 3) if sin_remates is not None else None
    if base >= MUESTRAS_MINIMAS and sin_remates > CASI_CERO_FRACCION:
        problemas.append(_problema("STITCH_NEAR_ZERO", "warning", o, tecnica, {"nearZeroRatioWithoutTies": medidas["nearZeroRatioWithoutTies"], "zeroStitches": ceros}, f"≤ {CASI_CERO_FRACCION} de puntadas de menos de {PUNTADA_MINIMA_MM} mm, sin los remates", _confianza(base), f"El {round(100 * sin_remates)} % de las puntadas del objeto (sin sus remates) mide menos de {PUNTADA_MINIMA_MM} mm: se amontonan en los mismos agujeros."))
    if largas:
        problemas.append(_problema("STITCH_INTERNAL_TOO_LONG", "warning", o, tecnica, {"count": len(largas), "maxMm": round(max(largas), 2)}, f"≤ {1.5 * maximo} mm (1.5× el largo de su técnica)", 0.9, f"{len(largas)} puntada(s) propias de más de {1.5 * maximo:.1f} mm dentro del objeto."))
    return medidas, problemas


def _huecos(pattern: pe.EmbPattern, rangos) -> dict:
    """Entre dos rangos propios del mismo objeto: un SALTO (hay un JUMP o un TRIM en medio: no se ve)
    o una CONEXIÓN cosida (puntadas sin dueño: hilo visible). Sólo medidas: la puntada larga que
    cuenta `STITCH_INTERNAL_TOO_LONG` es siempre STITCH → STITCH dentro de un rango."""
    saltos = conexiones = 0
    largo_conexion = 0.0
    for (_, b), (a, _) in zip(rangos, rangos[1:]):
        entre = pattern.stitches[b + 1:a]
        if any(x[2] in (pe.JUMP, pe.TRIM) for x in entre):
            saltos += 1
        else:
            conexiones += 1
            puntos = [pattern.stitches[b], *entre, pattern.stitches[a]]
            largo_conexion += sum(math.dist(p[:2], q[:2]) for p, q in zip(puntos, puntos[1:])) / 10
    return {"internalJumps": saltos, "internalConnections": conexiones, "internalConnectionMm": round(largo_conexion, 2)}


def validar(pattern: pe.EmbPattern, mapa: dict[str, Any], objetos: list[dict[str, Any]]) -> dict[str, Any]:
    """Una validación de técnica por objeto, con SUS puntadas (nada de otro objeto entra)."""
    hilos = idn.hilos_por_elemento(pattern, mapa)
    # Sin su identidad demostrada (sólo `completo` o `recortado`, que es el núcleo exacto sin 1–2
    # puntadas de contexto), las puntadas de un elemento no son firmemente suyas.
    incompletos = {e["elemento"] for e in mapa["elementos"] if (e.get("verificacion") or {}).get("estado", "completo") not in ("completo", "recortado")}
    incompletos |= set(mapa.get("incompletos") or [])
    rangos = {e["elemento"]: e["rangos"] for e in mapa["elementos"]}
    salida = []
    for k, o in enumerate(objetos):
        ident = o.get("identity") or {}
        tecnica = (o.get("stitch") or {}).get("type")
        if ident.get("role") == "travel" or tecnica not in ("running", "satin", "fill"):
            continue
        tramos = [t for t in hilos.get(k, []) if t[0] != t[1]]
        if not tramos:
            continue
        subtrazos = idn._subpaths((o.get("geometry") or {}).get("d") or "")
        # Puntadas de largo cero (dos puntadas seguidas en el mismo agujero) dentro de sus rangos.
        ceros = sum(1 for a, b in rangos.get(k, ()) for i in range(a, b) if pattern.stitches[i][:2] == pattern.stitches[i + 1][:2])
        medidas, problemas = _general(o, tecnica, tramos, ceros)
        medidas.update(_huecos(pattern, rangos.get(k, [])))
        if tecnica == "satin":
            # El contrato del IR (`satin.ts`, `satinMode: rails`): los dos primeros subtrazos son los
            # rails y el resto los travesaños. Un rail recto tiene sólo dos puntos, como un travesaño.
            rails = [s for s in subtrazos[:2] if len(s) >= 2]
            if len(rails) < 2:
                problemas.append(_problema("TECHNIQUE_UNCERTAIN", "info", o, "satin", {"rails": len(rails)}, "dos rails", 0.2, "Satin sin sus dos rails: no se puede medir el cruce."))
            else:
                indices = tuple(_Polilinea(r) for r in rails)
                m, p = _satin(o, tramos, indices, _Borde(*rails))
                medidas.update(m)
                problemas += p
        elif tecnica == "running":
            m, p = _corrido(o, tramos, subtrazos)
            medidas.update(m)
            problemas += p
        else:
            m, p = _relleno(o, tramos, subtrazos)
            medidas.update(m)
            problemas += p
        if k in incompletos:
            # Sin la identidad entera, un error de técnica no es firme.
            for x in problemas:
                if x["severity"] == "error":
                    x["severity"], x["code"] = "info", "TECHNIQUE_UNCERTAIN"
        errores = [x for x in problemas if x["severity"] == "error"]
        salida.append({
            "objectId": o.get("id"),
            "irObject": ident.get("id"),
            "technique": tecnica,
            "measurements": medidas,
            "issues": problemas,
            "verdict": "fail" if errores else "pass",
            "confidence": round(min([x["confidence"] for x in errores] or [1.0]), 2),
        })
    return {"algorithm": ALGORITMO, "evaluated": True, "objects": salida, "failed": [x["objectId"] for x in salida if x["verdict"] == "fail"]}
