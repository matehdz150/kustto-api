"""V6.7.0 — dónde entra la aguja en un corrido fino.

Ink/Stitch reparte un corrido avanzando: cada puntada es lo más larga que deja
su tolerancia, con los dos extremos SOBRE el eje. En una "O" de 3 mm eso da un
polígono de 7–9 lados desiguales, y todos por dentro de la curva: la cuerda
deja la curva a un lado y el hilo se come el counter. La letra se ve
poligonal aunque el eje que le llega sea una elipse lisa.

Aquí la aguja se pone de una vez, a lo largo de todo el corrido:

  - EN CURVA, UNA PUNTADA POR CADA TROZO QUE SE PUEDE COSER EN RECTA. La
    cuerda `c` de una curva de radio `r` se separa de ella c²/8r (su flecha).
    Con la flecha acotada a `FLECHA_MM`, la densidad de puntadas en cada punto
    es la que pide su curvatura (o una cada `largo` en recto), y las puntadas se
    reparten a partes iguales de esa densidad: iguales en una "O", más cortas
    donde la curva se cierra.
  - CENTRADAS EN EL EJE. Cada vértice se mueve hacia fuera la mitad de la
    flecha media de sus dos cuerdas: el hilo queda la mitad por dentro y la
    mitad por fuera, no todo por dentro.
  - LAS ESQUINAS SE QUEDAN. Un giro de más de 45° (el umbral de Ink/Stitch
    para clavar la aguja en una esquina) y los extremos llevan puntada, y no se
    mueven: ahí se une con la pieza de al lado.
  - NINGUNA PUNTADA MÁS CORTA QUE `PUNTADA_MINIMA_MM`: la flecha manda hasta
    ahí; por debajo, el hilo ya no se tiende entre los dos agujeros. Salvo
    donde así la cuerda se separaría del eje más que la tolerancia del corrido
    (la que ya cumplía Ink/Stitch): ahí baja hasta `PUNTADA_CASI_CERO_MM`.
  - LA PRIMERA Y LA ÚLTIMA PUNTADA, DE `REMATE_MINIMO_MM` O MÁS. El remate de
    Ink/Stitch va y vuelve en recta desde la punta hasta su primera puntada de
    ese largo: si la primera es más corta, se salta ese nodo y cruza la curva
    por dentro (medido con Ink/Stitch 3.3.0: sigue la cuerda desde 0.5 mm; con
    0.45 ya va al nodo siguiente). En la "a" de ITESO 50 ese atajo tapaba el counter.
  - SIN ACERCARSE A OTRA PIEZA. Centrar mueve el vértice hacia fuera de la
    curva; si fuera queda otra pieza más cerca que desde el eje, el vértice se
    queda en el eje (la regla de holgura de la regularización, V6.6.0).
"""
from __future__ import annotations

import math
from typing import Callable

Punto = tuple[float, float]

#: Lo más que la cuerda se separa del eje: un octavo del hilo de 0.4 mm (el
#: mismo octavo que la regularización deja cambiar el ancho, V6.6.0). Con el
#: centrado, el hilo queda a ±la mitad de esto.
FLECHA_MM = 0.05
#: La puntada más corta: el hilo (0.4 mm) sale por un agujero y entra por otro,
#: y cada agujero se come medio hilo; con menos de medio hilo libre entre los
#: dos, la puntada no se tiende y se amontona (tecnica.py marca por debajo de
#: 0.3 mm una puntada "casi cero").
PUNTADA_MINIMA_MM = 0.6
#: Lo más corta que puede ser una puntada para no pasarse de la tolerancia: la
#: de "casi cero" de tecnica.py, la misma que el mínimo de Ink/Stitch en el SVG.
PUNTADA_CASI_CERO_MM = 0.3
#: La primera y la última puntada, al menos esto: lo que el remate de Ink/Stitch necesita para
#: ir y volver por ella y no en recta hasta el nodo siguiente (ver arriba).
REMATE_MINIMO_MM = 0.5
#: Un giro de más de esto entre las dos cuerdas de ±`VENTANA_MM` es una esquina.
ESQUINA_DEG = 45.0
#: La curvatura se mide a la escala de una puntada corta, no de un píxel.
VENTANA_MM = 0.15
PASO_MM = 0.02


def _remuestrear(p: list[Punto], h: float) -> list[Punto]:
    s = [0.0]
    for a, b in zip(p, p[1:]):
        s.append(s[-1] + math.dist(a, b))
    total = s[-1]
    n = max(2, int(math.ceil(total / h)) + 1)
    salida: list[Punto] = []
    j = 0
    for i in range(n):
        t = total * i / (n - 1)
        while j < len(p) - 2 and s[j + 1] < t:
            j += 1
        seg = s[j + 1] - s[j]
        u = 0.0 if seg <= 0 else (t - s[j]) / seg
        salida.append((p[j][0] + (p[j + 1][0] - p[j][0]) * u, p[j][1] + (p[j + 1][1] - p[j][1]) * u))
    return salida


def _giro(a: Punto, b: Punto, c: Punto) -> float:
    ux, uy = b[0] - a[0], b[1] - a[1]
    vx, vy = c[0] - b[0], c[1] - b[1]
    return math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)


def penetraciones(
    eje: list[Punto],
    largo: float,
    flecha: float = FLECHA_MM,
    minima: float = PUNTADA_MINIMA_MM,
    tolerancia: float | None = None,
    holgura: Callable[[Punto], float] | None = None,
) -> list[Punto]:
    """Los puntos donde entra la aguja a lo largo de `eje`, del primero al último.

    `tolerancia`: lo más que la cuerda puede separarse del eje (la del corrido).
    `holgura(p)`: la distancia de `p` a lo más cercano de otra pieza.
    """
    eje = [q for i, q in enumerate(eje) if i == 0 or math.dist(q, eje[i - 1]) > 1e-9]
    if len(eje) < 2:
        return list(eje)
    cerrada = len(eje) > 3 and math.dist(eje[0], eje[-1]) < 1e-6
    q = _remuestrear(eje, PASO_MM)
    n = len(q)
    total = sum(math.dist(a, b) for a, b in zip(q, q[1:]))
    h = total / (n - 1)
    if total <= minima:
        return [eje[0], eje[-1]]
    k = max(1, round(VENTANA_MM / h))

    def en(i: int) -> Punto:
        if cerrada:
            return q[i % (n - 1)]
        return q[max(0, min(n - 1, i))]

    curvatura: list[float] = []
    giro: list[float] = []
    for i in range(n):
        if not cerrada and (i == 0 or i == n - 1):
            curvatura.append(0.0)
            giro.append(0.0)
            continue
        a, b, c = en(i - k), en(i), en(i + k)
        g = abs(_giro(a, b, c))
        curvatura.append(g / max(1e-9, (math.dist(a, b) + math.dist(b, c)) / 2))
        giro.append(g)
    # Esquinas: el máximo local de un giro de más de 45°, a más de una puntada mínima de otra.
    fijos = [0, n - 1]
    limite = math.radians(ESQUINA_DEG)
    for i in range(1, n - 1):
        if giro[i] > limite and giro[i] >= max(giro[max(0, i - k):i + k + 1]) and all(abs(i - f) * h > minima for f in fijos):
            fijos.append(i)
    # Densidad de puntadas por mm: la de la curvatura (c = sqrt(8 f / κ)), entre la del largo y la de la
    # mínima; y nunca menos de la que pide la tolerancia (con su propio mínimo, el de casi cero).
    def pedida(kk: float) -> float:
        visual = min(1 / minima, math.sqrt(kk / (8 * flecha)))
        dura = min(1 / PUNTADA_CASI_CERO_MM, math.sqrt(kk / (8 * tolerancia))) if tolerancia else 0.0
        return max(1 / largo, visual, dura)

    densidad = [pedida(kk) for kk in curvatura]

    def repartir(fijos: list[int], extremos: set[tuple[int, int]]) -> list[int]:
        """Los índices de las puntadas: entre cada par de fijos, a partes iguales de la densidad."""
        indices: list[int] = []
        for a, b in zip(fijos, fijos[1:]):
            acumulada = [0.0]
            for i in range(a, b):
                acumulada.append(acumulada[-1] + h * (densidad[i] + densidad[i + 1]) / 2)
            m = max(1, math.ceil(acumulada[-1] - 1e-9))
            suelo = PUNTADA_CASI_CERO_MM if tolerancia else minima
            if h * (b - a) / m < suelo:
                m = max(1, int(h * (b - a) // suelo))
            if (a, b) in extremos:
                m = 1
            indices.append(a)
            j = 0
            for r in range(1, m):
                objetivo = acumulada[-1] * r / m
                while j < len(acumulada) - 1 and acumulada[j + 1] < objetivo:
                    j += 1
                indices.append(a + j)
        indices.append(n - 1)
        return indices

    indices = repartir(sorted(fijos), set())
    # Las puntas: si la primera o la última puntada no llega al remate, un nodo fijo a
    # `REMATE_MINIMO_MM` (de cuerda) de esa punta y una sola puntada hasta él. Sólo si queda
    # sitio para una puntada más entre medias; si ya es así, el reparto parejo se queda.
    if total >= 2 * REMATE_MINIMO_MM + PUNTADA_CASI_CERO_MM and len(indices) > 2:
        def a_cuerda(desde: int, paso: int) -> int:
            i = desde
            while 0 < i + paso < n - 1 and math.dist(en(desde), en(i)) < REMATE_MINIMO_MM:
                i += paso
            return i

        extremos: set[tuple[int, int]] = set()
        nuevos = list(fijos)
        if math.dist(en(indices[0]), en(indices[1])) < REMATE_MINIMO_MM:
            ia = a_cuerda(0, 1)
            if not any(0 < g < ia for g in fijos):
                nuevos.append(ia)
                extremos.add((0, ia))
        if math.dist(en(indices[-2]), en(indices[-1])) < REMATE_MINIMO_MM:
            ib = a_cuerda(n - 1, -1)
            if not any(ib < g < n - 1 for g in fijos):
                nuevos.append(ib)
                extremos.add((ib, n - 1))
        if extremos:
            fijos = sorted(set(nuevos))
            indices = repartir(fijos, extremos)
    vertices = [en(i) for i in indices]

    def flecha_de(ia: int, ib: int) -> Punto:
        """El desvío más grande de la curva respecto a la cuerda, como vector."""
        a, b = en(ia), en(ib)
        vx, vy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(vx, vy) or 1e-9
        nx, ny = -vy / l, vx / l
        mejor = 0.0
        for i in range(ia, ib + 1):
            c = en(i)
            d = (c[0] - a[0]) * nx + (c[1] - a[1]) * ny
            if abs(d) > abs(mejor):
                mejor = d
        return (mejor * nx, mejor * ny)

    flechas = [flecha_de(indices[t], indices[t + 1]) for t in range(len(indices) - 1)]
    fijas = set(fijos)
    centrados = list(vertices)
    for t in range(1, len(indices) - 1):
        if indices[t] in fijas:
            continue
        fa, fb = flechas[t - 1], flechas[t]
        movido = (vertices[t][0] + (fa[0] + fb[0]) / 4, vertices[t][1] + (fa[1] + fb[1]) / 4)
        if holgura is not None and holgura(movido) < holgura(vertices[t]):
            continue
        centrados[t] = movido
    # El primero y el último, los del eje tal cual (la unión con la pieza de al lado).
    centrados[0] = eje[0]
    centrados[-1] = eje[-1]
    return centrados
