"""V6.4.3 — COBERTURA: la verdad original contra el DST real.

    medir → localizar → atribuir → clasificar     (la reparación, en `reparacion.py`)

La REFERENCIA es la verdad estructural del ORIGINAL, tal como la exporta la
preparación del servidor (`preparation.verdad[].malla`: por celda, la pieza de
tinta y el color que se ve; ver `verdad/malla.ts`). El RESULTADO es el DST
real, con la identidad exacta de V6.3 (`mapa`): de quién es cada puntada.

- Modelo de hilo: el de `vista_hilo.py` (sin calibrar): una puntada cubre
  `HILO_COBERTURA_MM` (0.5 mm, el hilo asentado); "fuera" es el hilo a más de
  `HOLGURA_FUERA_MM` (0.3 mm) del borde de la verdad. Es COBERTURA PREDICHA del
  hilo, no la de la tela cosida.
- Dos coberturas:
    - física: hay hilo encima, de quien sea (lo que se ve);
    - PROPIA: el hilo de los objetos de la pieza (`HiloPropio`, V6.3) la cubre. Es la que
      diagnostica: el hilo de B (otro objeto, otro color) no cubre A.
- Métricas a los dos lados: recall (cubierto / verdad) y precisión (cubierto / hilo), el
  área sin hilo y el área de hilo fuera, global y por pieza, color, objeto y grupo.
- Lo que falta se agrupa en REGIONES conexas (8-vecinas) dentro de cada pieza, se atribuye
  a los objetos de esa pieza por su geometría del IR (sin "el objeto más cercano"), y se
  clasifica: LOST_OBJECT, LOST_STRUCTURE, UNDERCOVERED_*, THIN_STRUCTURE_GAP,
  EDGE_UNDERCOVERAGE, MICRO_DETAIL, UNCERTAIN.

Todo en rachas (filas de celdas) y recortes por pieza: nada es O(celdas × puntadas).
"""
from __future__ import annotations

import base64
import math
import re
import time
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter

import identidad as idn

ALGORITMO = "v6.4.3-coverage"
#: El hilo asentado (vista_hilo.COBERTURA_HILO_MM): con 0.38, un satin perfecto dejaba rayas "sin hilo".
HILO_COBERTURA_MM = 0.5
#: Hasta aquí del borde llega cualquier bordado bien hecho (compensación y medio hilo): no es "fuera".
HOLGURA_FUERA_MM = 0.3
#: Una región más pequeña que una huella de hilo (0.5 × 0.5 mm) no se puede afirmar con este modelo.
AREA_MICRO_MM2 = HILO_COBERTURA_MM * HILO_COBERTURA_MM
#: Una región es SIGNIFICATIVA (cuenta, se puede reparar) desde dos huellas de hilo.
AREA_SIGNIFICATIVA_MM2 = 2 * AREA_MICRO_MM2
#: Una franja pegada al hilo propio y al borde de la verdad, más estrecha que la holgura, es BORDE.
ANCHO_DE_BORDE_MM = HOLGURA_FUERA_MM
#: La parte de una franja que tiene que estar a menos de la holgura del hilo propio para ser BORDE.
CUOTA_DE_BORDE = 0.9
#: La parte de una región dentro del IR de sus objetos por debajo de la cual el IR no la representa.
CUOTA_DE_ATRIBUCION = 0.5
#: Los motivos de incertidumbre de la verdad que ponen en duda que EXISTA el área (no sólo su conexión):
#: una pieza más fina que dos celdas de la rejilla, o que desaparece al exigir más tinta. Una duda de
#: conexión o de separación (antialias entre dos piezas) no dice nada de cuánta tinta hay.
MOTIVOS_DE_AREA_INCIERTA = {"resolucion", "umbral-existencia"}
#: Hasta dónde se busca el hilo propio desde una región (mm).
DISTANCIA_MAXIMA_MM = 2.0

Tramo = tuple[tuple[float, float], tuple[float, float]]


# ─── La malla de la verdad ───────────────────────────────────────────────

def _varints(texto: str):
    b = base64.b64decode(texto)
    p = 0
    n = len(b)
    while p < n:
        v = s = 0
        while True:
            x = b[p]
            p += 1
            v |= (x & 0x7F) << s
            if x < 0x80:
                break
            s += 7
        yield v


def rachas_de_capa(texto: str, ancho: int, alto: int) -> dict[int, list[tuple[int, int, int]]]:
    """Por valor (≠ 0), sus rachas (fila, desde, hasta) en celdas."""
    salida: dict[int, list[tuple[int, int, int]]] = {}
    total = ancho * alto
    k = 0
    datos = _varints(texto)
    for v in datos:
        n = next(datos)
        if v:
            fin = min(k + n, total)
            while k < fin:
                j, i = divmod(k, ancho)
                tomar = min(fin - k, ancho - i)
                salida.setdefault(v, []).append((j, i, i + tomar))
                k += tomar
        else:
            k += n
    return salida


class Malla:
    """Una fuente de la verdad: rejilla, piezas (con sus rachas) y colores."""

    def __init__(self, fuente: dict[str, Any]) -> None:
        m = fuente["malla"]
        self.fuente = fuente.get("id")
        self.x0, self.y0, self.paso = float(m["x0"]), float(m["y0"]), float(m["paso"])
        self.ancho, self.alto = int(m["ancho"]), int(m["alto"])
        self.piezas = m["piezas"]
        self.colores = m["colores"]
        self.rachas = rachas_de_capa(m["capaPiezas"], self.ancho, self.alto)
        self.rachas_color = rachas_de_capa(m["capaColores"], self.ancho, self.alto)
        # V6.5.0 (imagen): la confianza de la evidencia de color, 0–100 por celda.
        self.rachas_confianza = rachas_de_capa(m["capaConfianzaColor"], self.ancho, self.alto) if m.get("capaConfianzaColor") else None
        self.counters = [h for h in fuente.get("counters") or [] if h.get("polo")]
        self.en_ir = {c["id"]: c.get("enIR") for c in fuente.get("componentes") or []}

    def color_por_fila(self) -> dict[int, list[tuple[int, int, int]]]:
        if not hasattr(self, "_color_por_fila"):
            filas: dict[int, list[tuple[int, int, int]]] = {}
            for valor, rs in self.rachas_color.items():
                for j, a, b in rs:
                    filas.setdefault(j, []).append((valor, a, b))
            self._color_por_fila = filas
        return self._color_por_fila

    def confianza_por_fila(self) -> dict[int, list[tuple[int, int, int]]] | None:
        if self.rachas_confianza is None:
            return None
        if not hasattr(self, "_confianza_por_fila"):
            filas: dict[int, list[tuple[int, int, int]]] = {}
            for valor, rs in self.rachas_confianza.items():
                for j, a, b in rs:
                    filas.setdefault(j, []).append((valor, a, b))
            self._confianza_por_fila = filas
        return self._confianza_por_fila

    def px(self, p: tuple[float, float], origen: tuple[int, int] = (0, 0)) -> tuple[float, float]:
        """mm del documento → coordenada de píxel de PIL (centro de la celda (i, j) = (i, j))."""
        return ((p[0] - self.x0) / self.paso - 0.5 - origen[0], (p[1] - self.y0) / self.paso - 0.5 - origen[1])

    def mm2(self, celdas: int) -> float:
        return celdas * self.paso * self.paso


# ─── Rasterizar hilo, verdad y geometría del IR (en un recorte) ─────────

class Recorte:
    """Un rectángulo de celdas de la malla (con margen) donde se pinta todo lo de una pieza."""

    def __init__(self, malla: Malla, caja: tuple[int, int, int, int], margen: int) -> None:
        self.m = malla
        i0, j0, i1, j1 = caja
        self.i0, self.j0 = max(0, i0 - margen), max(0, j0 - margen)
        self.i1, self.j1 = min(malla.ancho, i1 + margen), min(malla.alto, j1 + margen)
        self.w, self.h = max(1, self.i1 - self.i0), max(1, self.j1 - self.j0)

    def lienzo(self) -> Image.Image:
        return Image.new("L", (self.w, self.h), 0)

    def rachas(self, rachas, valor: int = 255) -> Image.Image:
        im = self.lienzo()
        d = ImageDraw.Draw(im)
        for j, a, b in rachas:
            if self.j0 <= j < self.j1:
                x0, x1 = max(a, self.i0) - self.i0, min(b, self.i1) - self.i0 - 1
                if x1 >= x0:
                    d.line([(x0, j - self.j0), (x1, j - self.j0)], fill=valor)
        return im

    def hilo(self, tramos: list[Tramo], ancho_mm: float = HILO_COBERTURA_MM) -> Image.Image:
        im = self.lienzo()
        d = ImageDraw.Draw(im)
        g = max(1, round(ancho_mm / self.m.paso))
        r = g / 2
        origen = (self.i0, self.j0)
        cx0, cy0 = self.m.x0 + (self.i0 - 1) * self.m.paso - ancho_mm, self.m.y0 + (self.j0 - 1) * self.m.paso - ancho_mm
        cx1, cy1 = self.m.x0 + (self.i1 + 1) * self.m.paso + ancho_mm, self.m.y0 + (self.j1 + 1) * self.m.paso + ancho_mm
        for a, b in tramos:
            if max(a[0], b[0]) < cx0 or min(a[0], b[0]) > cx1 or max(a[1], b[1]) < cy0 or min(a[1], b[1]) > cy1:
                continue
            pa, pb = self.m.px(a, origen), self.m.px(b, origen)
            if pa != pb:
                d.line([pa, pb], fill=255, width=g)
            for q in (pa, pb):
                d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=255)
        return im

    def poligonos(self, anillos: list[list[tuple[float, float]]], par_impar: bool = True) -> Image.Image:
        """El área de unos anillos (par-impar: un anillo dentro de otro es un hueco)."""
        im = self.lienzo()
        origen = (self.i0, self.j0)
        for a in anillos:
            if len(a) < 3:
                continue
            capa = self.lienzo()
            ImageDraw.Draw(capa).polygon([self.m.px(p, origen) for p in a], fill=255)
            im = ImageChops.logical_xor(im.convert("1"), capa.convert("1")).convert("L") if par_impar else ImageChops.lighter(im, capa)
        return im


def _cuenta(im: Image.Image) -> int:
    return im.histogram()[255] if im.mode == "L" else im.convert("L").histogram()[255]


# V6.9.0: EL PRODUCTO SE CUENTA DONDE PUEDE SER DISTINTO DE CERO. En un raster la pieza es el logo entero
# (~2 Mpx a 0.05 mm) y cada región sin hilo se multiplicaba, en el lienzo completo, por el IR de cada
# objeto: en Harvard a 80 mm (587 objetos, 33 regiones) eran 19 404 productos y 50 de los 67 s de la
# medida, que la reparación repite por candidato. Fuera de la caja de lo que no es cero el producto es
# cero: contarlo en el recorte da la MISMA cuenta.

def _caja_comun(a, b):
    """La intersección de dos cajas de PIL (x0, y0, x1, y1), o None si no se tocan."""
    if a is None or b is None:
        return None
    c = (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))
    return c if c[0] < c[2] and c[1] < c[3] else None


def _cuenta_producto(a: Image.Image, b: Image.Image, caja) -> int:
    """`_cuenta(multiply(a, b))` cuando `a` o `b` es cero fuera de `caja` (del lienzo de ambos)."""
    if caja is None:
        return 0
    return _cuenta(ImageChops.multiply(a.crop(caja), b.crop(caja)))


def _toca_recortada(region: Image.Image, caja_region, recortada) -> bool:
    """¿La región toca una imagen guardada recortada a su caja, `(caja, imagen)`?"""
    caja, im = recortada
    c = _caja_comun(caja_region, caja)
    if c is None:
        return False
    return _cuenta(ImageChops.multiply(region.crop(c), im.crop((c[0] - caja[0], c[1] - caja[1], c[2] - caja[0], c[3] - caja[1])))) > 0


def _dilatar(im: Image.Image, pasos: int) -> Image.Image:
    for _ in range(max(0, pasos)):
        im = im.filter(ImageFilter.MaxFilter(3))
    return im


def area_del_ir(o: dict[str, Any], rec: Recorte) -> Image.Image:
    """Lo que el objeto del IR PRETENDE cubrir: su columna, su área o su trazo con el ancho del hilo."""
    import reparacion as rep  # rails de un satin
    tipo = (o.get("stitch") or {}).get("type")
    subs = idn._subpaths((o.get("geometry") or {}).get("d") or "")
    if tipo == "satin":
        rr = rep.rails_y_rungs(o)
        return rec.poligonos([rep.area_de_satin(rr[0], rr[1])]) if rr else rec.lienzo()
    if tipo == "fill":
        return rec.poligonos(subs)
    ancho = max(float((o.get("stitch") or {}).get("strokeWidthMm") or 0.3), HILO_COBERTURA_MM)
    return rec.hilo([(p, q) for s in subs for p, q in zip(s, s[1:])], ancho)


# ─── Regiones sin hilo ───────────────────────────────────────────────────

def _rachas_de_imagen(im: Image.Image) -> list[tuple[int, int, int]]:
    datos = im.tobytes()
    w = im.width
    salida = []
    for j in range(im.height):
        fila = datos[j * w:(j + 1) * w]
        for mt in re.finditer(rb"[^\x00]+", fila):
            salida.append((j, mt.start(), mt.end()))
    return salida


def regiones_de(im: Image.Image) -> list[list[tuple[int, int, int]]]:
    """Las piezas conexas (8-vecinas) de una imagen binaria, como listas de rachas. Unión-búsqueda
    sobre las rachas: cada racha se une a las de la fila anterior que la tocan (±1 en diagonal)."""
    rachas = _rachas_de_imagen(im)
    padre = list(range(len(rachas)))

    def raiz(a: int) -> int:
        while padre[a] != a:
            padre[a] = padre[padre[a]]
            a = padre[a]
        return a
    por_fila: dict[int, list[int]] = {}
    for k, (j, _, _) in enumerate(rachas):
        por_fila.setdefault(j, []).append(k)
    for k, (j, a, b) in enumerate(rachas):
        for m in por_fila.get(j - 1, ()):
            _, c, e = rachas[m]
            if c <= b and e >= a:  # [a, b) y [c, e) se tocan con 8-vecindad
                ra, rm = raiz(k), raiz(m)
                if ra != rm:
                    padre[max(ra, rm)] = min(ra, rm)
    grupos: dict[int, list[tuple[int, int, int]]] = {}
    for k, r in enumerate(rachas):
        grupos.setdefault(raiz(k), []).append(r)
    return list(grupos.values())


def _forma(rachas: list[tuple[int, int, int]], paso: float) -> dict[str, float]:
    """Área, perímetro (aristas de celda), ancho ≈ 2·área/perímetro y largo ≈ área/ancho, en mm."""
    celdas = sum(b - a for _, a, b in rachas)
    horizontales = sum(b - a - 1 for _, a, b in rachas)
    por_fila: dict[int, list[tuple[int, int]]] = {}
    for j, a, b in rachas:
        por_fila.setdefault(j, []).append((a, b))
    verticales = 0
    for j, filas in por_fila.items():
        for a, b in filas:
            for c, e in por_fila.get(j - 1, ()):
                verticales += max(0, min(b, e) - max(a, c))
    perimetro = 4 * celdas - 2 * (horizontales + verticales)
    area = celdas * paso * paso
    ancho = 2 * area / (perimetro * paso) if perimetro else 0.0
    return {"areaMm2": round(area, 4), "widthMm": round(ancho, 3), "lengthMm": round(area / ancho, 3) if ancho else 0.0, "cells": celdas}


# ─── Medir ───────────────────────────────────────────────────────────────

def _objetos_de_pieza(objetos: list[dict[str, Any]], pieza: str) -> list[int]:
    return idn._objetos_de(objetos, "pieces", pieza)


def _hilo_fuera(malla: Malla, objetos: list[dict[str, Any]], propio, holgura: int, tot: dict[str, int], por_objeto: dict[str, dict[str, Any]] | None = None) -> dict[str, tuple[int, int]]:
    """El hilo PROPIO fuera de la verdad: el de cada objeto contra la unión de las piezas que declara
    su identidad (un objeto de dos piezas cose legítimamente sobre las dos). Se mide una vez por grupo
    de objetos con las mismas piezas, en el recorte de su hilo y su verdad: el hilo que cae lejos de su
    pieza cuenta entero, y el de un objeto compartido no se cuenta una vez por pieza.
    Devuelve, por pieza, (celdas fuera, celdas de hilo) de los grupos en que está; suma el global a `tot`
    y, en `por_objeto`, el hilo y el hilo fuera de cada objeto (contra las mismas piezas)."""
    valor_de = {meta["id"]: v for v, meta in enumerate(malla.piezas, 1)}
    grupos: dict[tuple[str, ...], list[int]] = {}
    for k, o in enumerate(objetos):
        ps = tuple(sorted({str(p) for p in (o.get("identity") or {}).get("pieces") or [] if p in valor_de}))
        if ps:
            grupos.setdefault(ps, []).append(k)
    por_pieza: dict[str, tuple[int, int]] = {}
    margen = holgura + math.ceil(HILO_COBERTURA_MM / malla.paso) + 2
    for ps, ks in sorted(grupos.items()):
        tramos = propio.de(set(ks))
        if not tramos:
            continue
        rachas = [r for p in ps for r in malla.rachas.get(valor_de[p], [])]
        xs = [q[0] for t in tramos for q in t]
        ys = [q[1] for t in tramos for q in t]
        i0, j0 = math.floor((min(xs) - malla.x0) / malla.paso), math.floor((min(ys) - malla.y0) / malla.paso)
        i1, j1 = math.ceil((max(xs) - malla.x0) / malla.paso) + 1, math.ceil((max(ys) - malla.y0) / malla.paso) + 1
        if rachas:
            i0, j0 = min(i0, min(a for _, a, _ in rachas)), min(j0, min(j for j, _, _ in rachas))
            i1, j1 = max(i1, max(b for _, _, b in rachas)), max(j1, max(j for j, _, _ in rachas) + 1)
        rec = Recorte(malla, (max(0, i0), max(0, j0), min(malla.ancho, i1), min(malla.alto, j1)), margen)
        hilo = rec.hilo(tramos)
        holgada = _dilatar(rec.rachas(rachas), holgura)
        n_f = _cuenta(ImageChops.subtract(hilo, holgada))
        n_h = _cuenta(hilo)
        if por_objeto is not None:
            for k in ks:
                hilo_k = rec.hilo(propio.de({k})) if len(ks) > 1 else hilo
                x = por_objeto.setdefault(str(objetos[k].get("id")), {"truthInIrCells": 0, "ownCoveredCells": 0, "paso": malla.paso})
                x["threadCells"] = x.get("threadCells", 0) + _cuenta(hilo_k)
                x["outsideCells"] = x.get("outsideCells", 0) + _cuenta(ImageChops.subtract(hilo_k, holgada))
        tot["fuera_propio"] += n_f
        tot["hilo_propio"] += n_h
        for p in ps:
            f, h = por_pieza.get(p, (0, 0))
            por_pieza[p] = (f + n_f, h + n_h)
    return por_pieza


def _por_grupo(preparacion: dict[str, Any], objetos: list[dict[str, Any]], por_objeto: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """La cobertura por GRUPO de la verdad (linaje V6.3): la suma de la de sus objetos (la verdad dentro de
    su IR, lo que cubre su hilo propio, su hilo fuera). Un grupo sin objetos no tiene hilo: se cuenta
    aparte, por la etapa que lo quitó (sus átomos no viajan en la malla: su área no se mide aquí)."""
    de_ir = {(o.get("identity") or {}).get("id"): str(o.get("id")) for o in objetos}
    salida, quitados = [], {"groups": 0, "byStage": {}}
    for l in preparacion.get("linaje") or []:
        for g in l.get("grupos") or []:
            ids = [de_ir[i] for i in g.get("objetos") or [] if i in de_ir]
            if not ids:
                quitados["groups"] += 1
                etapa = str(g.get("etapa") or g.get("destino"))
                quitados["byStage"][etapa] = quitados["byStage"].get(etapa, 0) + 1
                continue
            xs = [por_objeto[i] for i in ids if i in por_objeto]
            dentro = sum(x["truthInIrMm2"] for x in xs)
            cubierto = sum(x["ownCoveredMm2"] for x in xs)
            hilo = sum(x["threadAreaMm2"] for x in xs)
            fuera = sum(x["outsideMm2"] for x in xs)
            salida.append({"groupId": g.get("id"), "destino": g.get("destino"), "objects": ids, "truthInIrMm2": round(dentro, 3), "ownCoveredMm2": round(cubierto, 3), "ownRecall": round(cubierto / dentro, 4) if dentro else None,
                           "threadAreaMm2": round(hilo, 3), "outsideMm2": round(fuera, 3), "outsideRatio": round(fuera / hilo, 4) if hilo else None})
    return salida, quitados


def medir(pattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], preparacion: dict[str, Any], colores: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """La cobertura del DST contra la verdad, con las regiones sin hilo clasificadas.
    `objetos` en el orden del documento (el de los elementos de Ink/Stitch)."""
    t0 = time.perf_counter()
    fuentes = [f for f in preparacion.get("verdad") or [] if f.get("malla")]
    if not fuentes:
        return {"algorithm": ALGORITMO, "evaluated": False, "reason": "la preparación no trae la malla de la verdad"}
    propio = idn.HiloPropio(pattern, mapa)
    todos = idn._todos_los_tramos(pattern, mapa)
    incompletos = set(mapa.get("incompletos") or [])
    ejes_de_grupo = {str(g.get("id")): [l for d in g.get("ejes") or [] for l in idn._subpaths(d) if len(l) >= 2] for g in preparacion.get("estructura") or []}
    historia = {h["id"]: h for l in preparacion.get("linaje") or [] for h in l.get("piezas") or []}
    color_de_hex = {str(c.get("sourceHex", "")).lower(): c.get("id") for c in colores or []}
    piezas_salida, regiones = [], []
    tot = {"original": 0, "fisico": 0, "propio": 0, "fuera_fisico": 0, "fuera_propio": 0, "hilo_propio": 0}
    por_objeto: dict[str, dict[str, float]] = {}
    tiempos = {"regiones": 0.0, "clasificar": 0.0}
    for malla in [Malla(f) for f in fuentes]:
        paso = malla.paso
        margen = math.ceil((HOLGURA_FUERA_MM + HILO_COBERTURA_MM + DISTANCIA_MAXIMA_MM) / paso) + 2
        holgura = max(1, round(HOLGURA_FUERA_MM / paso))
        fuera_de_pieza = _hilo_fuera(malla, objetos, propio, holgura, tot, por_objeto)
        for valor in sorted(malla.rachas):
            meta = malla.piezas[valor - 1]
            pid = meta["id"]
            rachas = malla.rachas[valor]
            caja = (min(a for _, a, _ in rachas), min(j for j, _, _ in rachas), max(b for _, _, b in rachas), max(j for j, _, _ in rachas) + 1)
            suyos = _objetos_de_pieza(objetos, pid)
            rec = Recorte(malla, caja, margen)
            verdad = rec.rachas(rachas)
            area = _cuenta(verdad)
            hilo_propio = rec.hilo(propio.de(set(suyos))) if suyos else rec.lienzo()
            hilo_fisico = rec.hilo(todos)
            cubierto_propio = ImageChops.multiply(verdad, hilo_propio)
            cubierto_fisico = ImageChops.multiply(verdad, hilo_fisico)
            n_cp, n_cf, n_hp = _cuenta(cubierto_propio), _cuenta(cubierto_fisico), _cuenta(hilo_propio)
            n_fp, n_hg = fuera_de_pieza.get(pid, (0, 0))
            tot["original"] += area
            tot["fisico"] += n_cf
            tot["propio"] += n_cp
            sin_hilo = ImageChops.subtract(verdad, hilo_propio)
            h = historia.get(pid) or {}
            bajas = [x for x in h.get("sucesos") or [] if x.get("tipo") == "removed"]
            registro = {
                "pieceId": pid, "source": malla.fuente, "structural": meta.get("estructural"), "uncertain": meta.get("incierto"),
                "reasons": meta.get("motivos") or [], "areaUncertain": bool(meta.get("incierto")) and (not meta.get("motivos") or bool(set(meta.get("motivos") or []) & MOTIVOS_DE_AREA_INCIERTA)),
                "widthMm": meta.get("anchoMm"), "truthAreaMm2": round(malla.mm2(area), 3),
                "objects": [objetos[k].get("id") for k in suyos], "enIR": malla.en_ir.get(pid), "lineage": {"destino": h.get("destino"), "etapa": h.get("etapa"), "removals": [{"etapa": x.get("etapa"), "motivo": x.get("motivo")} for x in bajas[-3:]]},
                "own": {"coveredMm2": round(malla.mm2(n_cp), 3), "uncoveredMm2": round(malla.mm2(area - n_cp), 3), "outsideMm2": round(malla.mm2(n_fp), 3), "threadAreaMm2": round(malla.mm2(n_hg), 3), "recall": round(n_cp / area, 4) if area else None, "precision": round(1 - n_fp / n_hg, 4) if n_hg else None},
                "physical": {"coveredMm2": round(malla.mm2(n_cf), 3), "recall": round(n_cf / area, 4) if area else None},
            }
            # Por objeto: lo de la pieza dentro de su IR, y cuánto cubre su propio hilo.
            areas_ir, cajas_ir = {}, {}
            for k in suyos:
                o = objetos[k]
                ir = ImageChops.multiply(area_del_ir(o, rec), verdad)
                caja_ir = ir.getbbox()
                areas_ir[k], cajas_ir[k] = ir, caja_ir
                hilo_o = rec.hilo(propio.de({k}))
                x = por_objeto.setdefault(str(o.get("id")), {"truthInIrCells": 0, "ownCoveredCells": 0, "paso": paso})
                x["truthInIrCells"] += _cuenta(ir.crop(caja_ir)) if caja_ir else 0
                x["ownCoveredCells"] += _cuenta_producto(ir, hilo_o, caja_ir)
            # Las regiones sin hilo PROPIO de la pieza.
            borde = ImageChops.multiply(_dilatar(ImageChops.invert(verdad), 1), verdad)
            cerca_hilo = _dilatar(hilo_propio, 1)
            # A menos de la holgura del hilo propio: donde un filo sin hilo es compensación, no pérdida.
            junto_al_hilo = _dilatar(hilo_propio, holgura)
            # V6.9.0: lo que es igual para todas las regiones de la pieza se calcula una vez: el hilo propio
            # dilatado paso a paso (la distancia) y el eje de cada grupo (recortado a su caja).
            crecidos: list[Image.Image] = []
            ejes_px: dict[str, tuple[Any, Image.Image | None]] = {}

            def eje_de(g: str, ejes) -> tuple[Any, Image.Image | None]:
                if g not in ejes_px:
                    im = rec.hilo([(p, q) for l in ejes for p, q in zip(l, l[1:])], paso * 2)
                    c = im.getbbox()
                    ejes_px[g] = (c, im.crop(c) if c else None)
                return ejes_px[g]

            t_r = time.perf_counter()
            for r_rachas in regiones_de(sin_hilo):
                forma = _forma(r_rachas, paso)
                # Las rachas de la región están en celdas DEL RECORTE: a la malla, sumando su origen.
                region = rec.rachas([(j + rec.j0, a + rec.i0, b + rec.i0) for j, a, b in r_rachas], 255) if forma["areaMm2"] >= AREA_MICRO_MM2 else None
                reg = {"pieceId": pid, **{k: v for k, v in forma.items() if k != "cells"}, "_rachas": [(j + rec.j0, a + rec.i0, b + rec.i0) for j, a, b in r_rachas], "_fuente": malla.fuente}
                j0 = min(j for j, _, _ in r_rachas) + rec.j0
                i0 = min(a for _, a, _ in r_rachas) + rec.i0
                i1 = max(b for _, _, b in r_rachas) + rec.i0
                j1 = max(j for j, _, _ in r_rachas) + rec.j0 + 1
                reg["bboxMm"] = [round(malla.x0 + i0 * paso, 2), round(malla.y0 + j0 * paso, 2), round(malla.x0 + i1 * paso, 2), round(malla.y0 + j1 * paso, 2)]
                if region is not None:
                    n = forma["cells"]
                    # La región es cero fuera de su caja (en celdas del recorte).
                    bb = (i0 - rec.i0, j0 - rec.j0, i1 - rec.i0, j1 - rec.j0)
                    reg["touchesOwnThread"] = _cuenta_producto(region, cerca_hilo, bb) > 0
                    reg["touchesTruthBorder"] = _cuenta_producto(region, borde, bb) > 0
                    reg["nearOwnThreadRatio"] = round(_cuenta_producto(region, junto_al_hilo, bb) / n, 3)
                    reg["physicallyCoveredRatio"] = round(_cuenta_producto(region, hilo_fisico, bb) / n, 3)
                    if reg["touchesOwnThread"]:
                        reg["distanceToOwnThreadMm"] = 0.0
                    elif suyos and n_hp:
                        d = None
                        for n_k, paso_k in enumerate(range(1, math.ceil(DISTANCIA_MAXIMA_MM / paso) + 1, 2)):
                            if n_k == len(crecidos):
                                crecidos.append(_dilatar(crecidos[-1] if crecidos else hilo_propio, 2))
                            if _cuenta_producto(region, crecidos[n_k], bb):
                                d = round((paso_k + 1) * paso, 2)
                                break
                        reg["distanceToOwnThreadMm"] = d
                    else:
                        reg["distanceToOwnThreadMm"] = None
                    # Un objeto cuyo IR no toca la caja de la región tiene parte 0 (y se quitaba igual).
                    reg["attribution"] = sorted(({"objectId": objetos[k].get("id"), "share": round(_cuenta_producto(region, ir, _caja_comun(bb, cajas_ir[k])) / n, 3)} for k, ir in areas_ir.items() if _caja_comun(bb, cajas_ir[k])), key=lambda x: (-x["share"], x["objectId"]))
                    reg["attribution"] = [x for x in reg["attribution"] if x["share"] > 0]
                    cx, cy = (reg["bboxMm"][0] + reg["bboxMm"][2]) / 2, (reg["bboxMm"][1] + reg["bboxMm"][3]) / 2
                    reg["nearCounter"] = any(math.dist((cx, cy), tuple(hh["polo"])) <= float(hh.get("anchoMm") or 0) / 2 + max(reg["bboxMm"][2] - reg["bboxMm"][0], reg["bboxMm"][3] - reg["bboxMm"][1]) / 2 + 0.5 for hh in malla.counters)
                    # Ejes de la verdad (estructura) que pasan por la región: los de los grupos de sus objetos
                    # y, si la pieza no tiene objetos, cualquiera cuyo eje la cruce.
                    grupos = {g for k in suyos for g in (objetos[k].get("identity") or {}).get("groups") or []}
                    reg["color"] = _color_de_region(malla, [(j + rec.j0, a + rec.i0, b + rec.i0) for j, a, b in r_rachas], [objetos[k] for k in suyos], color_de_hex)
                    # Los grupos de la verdad (linaje) de la región: los de los objetos a los que se atribuye o,
                    # si no hay, los de los objetos de la pieza del color de la región.
                    atribuidos = {x["objectId"] for x in reg["attribution"]}
                    fuente_g = [objetos[k] for k in suyos if objetos[k].get("id") in atribuidos] or [objetos[k] for k in suyos if reg["color"].get("colorId") and objetos[k].get("colorId") == reg["color"]["colorId"]]
                    reg["truthGroupIds"] = sorted({str(g) for o in fuente_g for g in (o.get("identity") or {}).get("groups") or []})
                    reg["lineage"] = registro["lineage"]
                    reg["isolated"] = reg["distanceToOwnThreadMm"] is None and reg["physicallyCoveredRatio"] == 0
                    reg["truthAxisGroups"] = sorted(g for g, ejes in ejes_de_grupo.items() if (g in grupos or not suyos) and ejes and _toca_recortada(region, bb, eje_de(g, ejes)))
                t_c = time.perf_counter()
                reg.update(clasificar(reg, registro, suyos, incompletos, objetos))
                tiempos["clasificar"] += time.perf_counter() - t_c
                regiones.append(reg)
            tiempos["regiones"] += time.perf_counter() - t_r
            piezas_salida.append(registro)
        # El físico global: todo el hilo contra toda la tinta de la fuente.
        tinta = [r for rs in malla.rachas.values() for r in rs]
        if tinta:
            rec = Recorte(malla, (0, 0, malla.ancho, malla.alto), 0)
            verdad = rec.rachas(tinta)
            hilo = rec.hilo(todos)
            tot["fuera_fisico"] += _cuenta(ImageChops.subtract(hilo, _dilatar(verdad, holgura)))
            tot["hilo_fisico"] = tot.get("hilo_fisico", 0) + _cuenta(hilo)
    paso = fuentes[0]["malla"]["paso"]
    mm2 = lambda c: round(c * paso * paso, 3)  # noqa: E731
    # Ids de región deterministas: por pieza, de más área a menos.
    regiones.sort(key=lambda r: (r["pieceId"], -r["areaMm2"], r["bboxMm"]))
    cuenta_pieza: dict[str, int] = {}
    for r in regiones:
        cuenta_pieza[r["pieceId"]] = cuenta_pieza.get(r["pieceId"], 0) + 1
        r["id"] = f"{r['pieceId']}-u{cuenta_pieza[r['pieceId']]}"
    # Las rachas de cada región viajan aparte (la reparación las usa; no van a la metadata).
    rachas = {r["id"]: {"rachas": r.pop("_rachas"), "fuente": r.pop("_fuente")} for r in regiones}
    significativas = [r for r in regiones if r["significant"]]
    resumen_causas: dict[str, dict[str, float]] = {}
    for r in regiones:
        x = resumen_causas.setdefault(r["cause"], {"regions": 0, "areaMm2": 0.0})
        x["regions"] += 1
        x["areaMm2"] = round(x["areaMm2"] + r["areaMm2"], 3)
    # Las migas (menos de una huella de hilo) sólo cuentan en `causes`: una por región inflaría la metadata
    # (Discovery tiene ~350) y ninguna se puede afirmar ni reparar.
    listadas = [r for r in regiones if r["areaMm2"] >= AREA_MICRO_MM2]
    for r in regiones:
        if r["areaMm2"] < AREA_MICRO_MM2:
            rachas.pop(r["id"], None)
    objetos_salida = [{"objectId": oid, "truthInIrMm2": round(x["truthInIrCells"] * x["paso"] ** 2, 3), "ownCoveredMm2": round(x["ownCoveredCells"] * x["paso"] ** 2, 3), "ownRecall": round(x["ownCoveredCells"] / x["truthInIrCells"], 4) if x["truthInIrCells"] else None,
                       "threadAreaMm2": round(x.get("threadCells", 0) * x["paso"] ** 2, 3), "outsideMm2": round(x.get("outsideCells", 0) * x["paso"] ** 2, 3), "outsideRatio": round(x.get("outsideCells", 0) / x["threadCells"], 4) if x.get("threadCells") else None} for oid, x in sorted(por_objeto.items())]
    grupos_salida, grupos_quitados = _por_grupo(preparacion, objetos, {o["objectId"]: o for o in objetos_salida})
    return {
        "algorithm": ALGORITMO, "evaluated": True,
        "model": {"threadCoverageMm": HILO_COBERTURA_MM, "outsideToleranceMm": HOLGURA_FUERA_MM, "gridMm": paso, "kind": "predicted-thread-coverage"},
        "global": {
            "originalAreaMm2": mm2(tot["original"]),
            "physical": {"coveredMm2": mm2(tot["fisico"]), "uncoveredMm2": mm2(tot["original"] - tot["fisico"]), "threadAreaMm2": mm2(tot.get("hilo_fisico", 0)), "outsideMm2": mm2(tot["fuera_fisico"]), "outsideRatio": round(tot["fuera_fisico"] / tot["hilo_fisico"], 4) if tot.get("hilo_fisico") else None, "recall": round(tot["fisico"] / tot["original"], 4) if tot["original"] else None, "precision": round(1 - tot["fuera_fisico"] / tot["hilo_fisico"], 4) if tot.get("hilo_fisico") else None},
            "own": {"coveredMm2": mm2(tot["propio"]), "uncoveredMm2": mm2(tot["original"] - tot["propio"]), "threadAreaMm2": mm2(tot["hilo_propio"]), "outsideMm2": mm2(tot["fuera_propio"]), "outsideRatio": round(tot["fuera_propio"] / tot["hilo_propio"], 4) if tot["hilo_propio"] else None, "recall": round(tot["propio"] / tot["original"], 4) if tot["original"] else None, "precision": round(1 - tot["fuera_propio"] / tot["hilo_propio"], 4) if tot["hilo_propio"] else None},
        },
        "significantUncoveredMm2": round(sum(r["areaMm2"] for r in significativas), 3),
        "causes": resumen_causas,
        "pieces": piezas_salida,
        "objects": objetos_salida,
        "groups": grupos_salida,
        "groupsRemoved": grupos_quitados,
        "regions": listadas,
        "regionsTotal": len(regiones),
        "ms": round((time.perf_counter() - t0) * 1000, 1),
        "regionsMs": round(tiempos["regiones"] * 1000, 1),
        "classificationMs": round(tiempos["clasificar"] * 1000, 1),
        "_rachas": rachas,
    }


# ─── Clasificar ──────────────────────────────────────────────────────────

#: Lo que la ADAPTACIÓN de la preparación tiene por detalle (profile.ts `geometria.minAreaMm2` y
#: capas.ts `ANCHO_MINIMO_DETALLE_MM`): si la región perdida cabe en eso, quitarla fue su decisión.
AREA_DE_DETALLE_MM2 = 0.75
ANCHO_DE_DETALLE_MM = 0.2


#: V6.5.0: la confianza media (0–1) de la evidencia de color de una imagen desde la que el color se afirma.
CONFIANZA_DE_COLOR_MINIMA = 0.5


def _color_de_region(malla: Malla, rachas, suyos: list[dict[str, Any]], color_de_hex: dict[str, str]) -> dict[str, Any]:
    """El color con el que se cosería la región, SÓLO si hay evidencia: la capa de color de la verdad
    (SVG: el color que se ve en esas celdas, si es uno; imagen, V6.5.0: el hilo de la tinta a la que se
    parece el píxel original, con su confianza, o "mezcla") o, si la verdad no tiene color (raster
    anterior a V6.5.0: "tinta"), que todos los objetos de su pieza sean del mismo color. Si no, None:
    no se inventa."""
    if malla.colores and malla.colores != ["tinta"]:
        cuenta: dict[int, int] = {}
        por_fila = malla.color_por_fila()
        for j, a, b in rachas:
            for valor, c, e in por_fila.get(j, ()):
                n = min(b, e) - max(a, c)
                if n > 0:
                    cuenta[valor] = cuenta.get(valor, 0) + n
        raster = malla.rachas_confianza is not None
        if cuenta and raster:
            # V6.5.0: en una imagen, la mezcla (antialias, degradado) no es evidencia de NINGÚN hilo: no
            # vota. El hilo se afirma si domina entre las celdas que sí tienen uno y éstas son la mayoría
            # de la región; en una región pequeña el anillo de antialias pasa del 10 % y no la invalida,
            # pero un degradado (casi todo mezcla) sigue sin color.
            mezcla = next((k + 1 for k, c in enumerate(malla.colores) if str(c).lower() == "mezcla"), None)
            con_hilo = {v: c for v, c in cuenta.items() if v != mezcla}
            total = sum(cuenta.values())
            if not con_hilo or sum(con_hilo.values()) < 0.5 * total:
                return {"colorId": None, "evidence": "raster-color-mixed"}
            valor, n = max(con_hilo.items(), key=lambda kv: (kv[1], -kv[0]))
            hexa = str(malla.colores[valor - 1]).lower()
            if n >= 0.9 * sum(con_hilo.values()) and hexa in color_de_hex:
                confianza = _confianza_media(malla, rachas, valor)
                if confianza >= CONFIANZA_DE_COLOR_MINIMA:
                    return {"colorId": color_de_hex[hexa], "evidence": "raster-color", "confidence": round(confianza, 2)}
                return {"colorId": None, "evidence": "raster-color-low-confidence", "confidence": round(confianza, 2)}
            return {"colorId": None, "evidence": "raster-color-ambiguous"}
        if cuenta:
            valor, n = max(cuenta.items(), key=lambda kv: (kv[1], -kv[0]))
            hexa = str(malla.colores[valor - 1]).lower()
            if n >= 0.9 * sum(cuenta.values()) and hexa in color_de_hex:
                return {"colorId": color_de_hex[hexa], "evidence": "truth-color"}
        return {"colorId": None, "evidence": "raster-color-ambiguous" if raster else "truth-color-ambiguous"}
    ids = sorted({o.get("colorId") for o in suyos})
    if len(ids) == 1:
        return {"colorId": ids[0], "evidence": "single-color-piece"}
    return {"colorId": None, "evidence": "multi-color-piece" if ids else "no-objects"}


def _confianza_media(malla: Malla, rachas, valor: int) -> float:
    """La confianza media (0–1) de las celdas de la región cuyo color es `valor`."""
    colores, confianzas = malla.color_por_fila(), malla.confianza_por_fila() or {}
    suma = total = 0
    for j, a, b in rachas:
        tramos = [(max(a, c), min(b, e)) for v, c, e in colores.get(j, ()) if v == valor and min(b, e) > max(a, c)]
        for x0, x1 in tramos:
            # Todas las celdas del color cuentan: las de confianza 0 no están en la capa (valor 0).
            total += x1 - x0
            for conf, c, e in confianzas.get(j, ()):
                n = min(x1, e) - max(x0, c)
                if n > 0:
                    suma += conf * n
    return (suma / total / 100.0) if total else 0.0


def _recuperable(reg: dict[str, Any], adaptada: bool) -> str:
    """RECOVERABLE: la verdad trae un eje de estructura fina que pasa por la región (se cose por él,
    sin inventar geometría), o la región es un ÁREA con color afirmable que no es un detalle para la
    preparación (se rellena con SU forma, la de la verdad). ADAPTABLE: la adaptación de la preparación
    la quitó y, por sus propios umbrales, es un detalle: recuperarla es decisión de la preparación.
    UNRECOVERABLE: no hay de dónde sacar lo que falta (sin eje y sin color afirmable)."""
    if reg.get("truthAxisGroups"):
        return "RECOVERABLE"
    detalle = reg.get("areaMm2", 0) < AREA_DE_DETALLE_MM2 or reg.get("widthMm", 0) < ANCHO_DE_DETALLE_MM
    if adaptada and detalle:
        return "ADAPTABLE"
    if (reg.get("color") or {}).get("colorId"):
        return "RECOVERABLE"
    return "UNRECOVERABLE"


REPARABLES = {"LOST_STRUCTURE", "LOST_OBJECT", "UNDERCOVERED_RUNNING", "UNDERCOVERED_SATIN", "THIN_STRUCTURE_GAP"}


def clasificar(reg: dict[str, Any], pieza: dict[str, Any], suyos: list[int], incompletos: set[int], objetos: list[dict[str, Any]]) -> dict[str, Any]:
    """POR QUÉ falta hilo aquí, en orden: incierto, micro, borde, perdida, sin cubrir por su objeto.
    Devuelve {cause, significant, confidence, reason}."""
    area = reg["areaMm2"]
    significativa = area >= AREA_SIGNIFICATIVA_MM2 and bool(pieza.get("structural"))
    salida: dict[str, Any] = {"significant": significativa}
    if pieza.get("areaUncertain") or any(k in incompletos for k in suyos):
        return {**salida, "significant": False, "cause": "UNCERTAIN", "confidence": 0.3, "reason": f"la verdad duda de que el área exista ({', '.join(pieza.get('reasons') or ['incierta'])})" if pieza.get("areaUncertain") else "la identidad de sus objetos no es entera"}
    if area < AREA_MICRO_MM2 or not pieza.get("structural"):
        return {**salida, "significant": False, "cause": "MICRO_DETAIL", "confidence": 0.8, "reason": f"{area:.2f} mm² < una huella de hilo ({AREA_MICRO_MM2} mm²)" if area < AREA_MICRO_MM2 else "la verdad la tiene por detalle (no estructural)"}
    # BORDE: una franja estrecha entre el hilo propio y el borde de la verdad, TODA a menos de la holgura
    # del hilo. Un trazo fino perdido también es estrecho y toca el hilo (por su extremo), pero casi
    # todo él queda lejos: eso no es borde, es estructura perdida.
    if reg.get("widthMm", 0) <= ANCHO_DE_BORDE_MM and reg.get("touchesOwnThread") and reg.get("touchesTruthBorder") and float(reg.get("nearOwnThreadRatio") or 0) >= CUOTA_DE_BORDE:
        return {**salida, "significant": False, "cause": "EDGE_UNDERCOVERAGE", "confidence": 0.7, "reason": f"franja de {reg['widthMm']} mm entre el hilo y el borde (≤ {ANCHO_DE_BORDE_MM}: compensación y modelo de hilo)"}
    bajas = (pieza.get("lineage") or {}).get("removals") or []
    adaptada = any(b.get("etapa") == "adaptacion" for b in bajas)
    if not suyos:
        return {**salida, "cause": "LOST_OBJECT", "confidence": 0.9, "recoverability": _recuperable(reg, adaptada),
                "reason": "la pieza no tiene objetos en el IR; el linaje: " + ("; ".join(f"{b.get('etapa')}: {b.get('motivo')}" for b in bajas) or "sin baja registrada")}
    cuota = sum(x["share"] for x in reg.get("attribution") or [])
    if cuota < CUOTA_DE_ATRIBUCION:
        return {**salida, "cause": "LOST_STRUCTURE", "confidence": round(0.9 - cuota, 2), "recoverability": _recuperable(reg, adaptada),
                "reason": f"sólo el {round(100 * cuota)} % de la región está dentro del IR de sus objetos: el IR no la representa" + (f" (la adaptación quitó partes: {bajas[-1].get('motivo')})" if adaptada else "")}
    principal = reg["attribution"][0]["objectId"]
    o = next(x for x in objetos if x.get("id") == principal)
    tipo = (o.get("stitch") or {}).get("type")
    if tipo == "running":
        causa = "THIN_STRUCTURE_GAP" if reg.get("truthAxisGroups") else "UNDERCOVERED_RUNNING"
    else:
        causa = {"satin": "UNDERCOVERED_SATIN", "fill": "UNDERCOVERED_FILL"}.get(tipo, "UNCERTAIN")
    return {**salida, "cause": causa, "confidence": round(min(1.0, cuota), 2), "reason": f"dentro del IR de {principal} ({tipo}) pero sin su hilo", "object": principal}


# ─── Incidencias (informativas) ─────────────────────────────────────────

def incidencias(medida: dict[str, Any]) -> list[dict[str, Any]]:
    """Lo que la cobertura dice del diseño, como incidencias INFO (no cambian el estado: la cobertura es
    predicha, no física). Una por familia de causa con regiones significativas, y COVERAGE_UNCERTAIN
    cuando hay regiones que el modelo no puede afirmar (ni reparar): que un área sea pequeña o dudosa
    no la da por buena."""
    if not medida.get("evaluated"):
        return []
    familias = {"COVERAGE_LOST": ("LOST_OBJECT", "LOST_STRUCTURE"), "COVERAGE_UNDERCOVERED": ("UNDERCOVERED_SATIN", "UNDERCOVERED_FILL", "UNDERCOVERED_RUNNING", "THIN_STRUCTURE_GAP")}
    salida = []
    for codigo, causas in familias.items():
        rs = [r for r in medida.get("regions") or [] if r.get("significant") and r.get("cause") in causas]
        if rs:
            area = round(sum(r["areaMm2"] for r in rs), 2)
            salida.append({"code": codigo, "severity": "info", "message": f"{len(rs)} región(es) del original sin hilo propio ({area} mm²; cobertura predicha): {', '.join(r['id'] for r in rs[:6])}.", "regions": [r["id"] for r in rs]})
    dudosas = [r for r in medida.get("regions") or [] if r.get("cause") == "UNCERTAIN"]
    if dudosas:
        salida.append({"code": "COVERAGE_UNCERTAIN", "severity": "info", "message": f"{len(dudosas)} región(es) sin hilo que la verdad o la identidad no permiten afirmar ({round(sum(r['areaMm2'] for r in dudosas), 2)} mm²): no se reparan.", "regions": [r["id"] for r in dudosas]})
    return salida


# ─── Evidencia visual ────────────────────────────────────────────────────

def mascaras(pattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], preparacion: dict[str, Any]) -> dict[str, Any] | None:
    """Sobre la malla entera (la primera fuente): la tinta de la verdad, la tinta cubierta por hilo PROPIO,
    todo el hilo y el hilo fuera de la tinta (más allá de la holgura). Para la evidencia y el antes/después."""
    fuentes = [Malla(f) for f in preparacion.get("verdad") or [] if f.get("malla")]
    if not fuentes:
        return None
    malla = fuentes[0]
    rec = Recorte(malla, (0, 0, malla.ancho, malla.alto), 0)
    tinta = rec.rachas([r for rs in malla.rachas.values() for r in rs])
    propio = idn.HiloPropio(pattern, mapa)
    cubierto = rec.lienzo()
    for valor, rachas in malla.rachas.items():
        suyos = _objetos_de_pieza(objetos, malla.piezas[valor - 1]["id"])
        if suyos:
            cubierto = ImageChops.lighter(cubierto, ImageChops.multiply(rec.rachas(rachas), rec.hilo(propio.de(set(suyos)))))
    hilo = rec.hilo(idn._todos_los_tramos(pattern, mapa))
    fuera = ImageChops.subtract(hilo, _dilatar(tinta, max(1, round(HOLGURA_FUERA_MM / malla.paso))))
    return {"malla": malla, "recorte": rec, "tinta": tinta, "cubierto": cubierto, "hilo": hilo, "fuera": fuera, "propio": propio}


def imagen(pattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], preparacion: dict[str, Any], medida: dict[str, Any] | None, destino, escala: int = 2) -> None:
    """El mapa de cobertura (el de siempre, ahora contra la VERDAD y con la identidad exacta):
    gris claro = verdad, gris oscuro = verdad cubierta por hilo PROPIO, rojo = verdad sin hilo propio,
    naranja = hilo fuera de la verdad (más allá de la holgura), y el id de cada región significativa."""
    m = mascaras(pattern, mapa, objetos, preparacion)
    if m is None:
        return
    malla, rec, tinta, cubierto, fuera = m["malla"], m["recorte"], m["tinta"], m["cubierto"], m["fuera"]
    lienzo = Image.new("RGB", (rec.w, rec.h), "#ffffff")
    lienzo.paste((222, 222, 222), mask=tinta)
    lienzo.paste((70, 70, 70), mask=cubierto)
    lienzo.paste((226, 36, 36), mask=ImageChops.subtract(tinta, cubierto))
    lienzo.paste((255, 165, 0), mask=fuera)
    lienzo = lienzo.resize((rec.w * escala, rec.h * escala), Image.NEAREST)
    if medida:
        d = ImageDraw.Draw(lienzo)
        for r in medida.get("regions") or []:
            if not r.get("significant"):
                continue
            x0, y0, x1, y1 = r["bboxMm"]
            a = ((x0 - malla.x0) / malla.paso * escala, (y0 - malla.y0) / malla.paso * escala)
            b = ((x1 - malla.x0) / malla.paso * escala, (y1 - malla.y0) / malla.paso * escala)
            d.rectangle([a, b], outline=(0, 90, 200), width=2)
            d.text((a[0], max(0, a[1] - 11)), f"{r['id']} {r['cause']}", fill=(0, 60, 160))
    lienzo.save(destino)


# ─── Para la reparación ──────────────────────────────────────────────────

def mallas(preparacion: dict[str, Any]) -> dict[str, Malla]:
    return {f.get("id"): Malla(f) for f in preparacion.get("verdad") or [] if f.get("malla")}


def sin_hilo_en(pattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], malla: Malla, pieza: str, rachas) -> float:
    """Cuánto de unas celdas de la verdad (mm²) sigue sin hilo PROPIO de la pieza en este cosido."""
    if not rachas:
        return 0.0
    caja = (min(a for _, a, _ in rachas), min(j for j, _, _ in rachas), max(b for _, _, b in rachas), max(j for j, _, _ in rachas) + 1)
    rec = Recorte(malla, caja, 2)
    zona = rec.rachas(rachas)
    suyos = _objetos_de_pieza(objetos, pieza)
    hilo = rec.hilo(idn.HiloPropio(pattern, mapa).de(set(suyos))) if suyos else rec.lienzo()
    return round(malla.mm2(_cuenta(ImageChops.subtract(zona, hilo))), 4)


def fuera_cerca(pattern, mapa: dict[str, Any], malla: Malla, bbox_mm, margen_mm: float = 1.0) -> float:
    """El hilo (de todos) fuera de la tinta de la verdad, más allá de la holgura, dentro de una caja en mm
    y `margen_mm` alrededor: el naranja local de una reparación."""
    x0, y0, x1, y1 = bbox_mm
    caja = (max(0, math.floor((x0 - margen_mm - malla.x0) / malla.paso)), max(0, math.floor((y0 - margen_mm - malla.y0) / malla.paso)),
            min(malla.ancho, math.ceil((x1 + margen_mm - malla.x0) / malla.paso)), min(malla.alto, math.ceil((y1 + margen_mm - malla.y0) / malla.paso)))
    holgura = max(1, round(HOLGURA_FUERA_MM / malla.paso))
    rec = Recorte(malla, caja, holgura)
    tinta = rec.rachas([r for rs in malla.rachas.values() for r in rs])
    fuera = ImageChops.subtract(rec.hilo(idn._todos_los_tramos(pattern, mapa)), _dilatar(tinta, holgura))
    # Sólo lo de dentro de la caja (el margen de la holgura es para dilatar bien, no para contar).
    dentro = rec.lienzo()
    ImageDraw.Draw(dentro).rectangle([caja[0] - rec.i0, caja[1] - rec.j0, caja[2] - rec.i0 - 1, caja[3] - rec.j0 - 1], fill=255)
    return round(malla.mm2(_cuenta(ImageChops.multiply(fuera, dentro))), 4)


def contornos(rachas, malla: Malla, tolerancia_mm: float | None = None) -> list[list[tuple[float, float]]]:
    """El contorno de unas celdas como anillos en mm (exterior y huecos; par-impar), por las aristas
    de celda que separan dentro de fuera, simplificado a 3/4 de celda (la escalera de la rejilla)."""
    dentro = {(i, j) for j, a, b in rachas for i in range(a, b)}
    siguiente: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for i, j in dentro:
        # Aristas con el interior a la derecha (sentido horario con la y hacia abajo).
        if (i, j - 1) not in dentro:
            siguiente.setdefault((i, j), []).append((i + 1, j))
        if (i + 1, j) not in dentro:
            siguiente.setdefault((i + 1, j), []).append((i + 1, j + 1))
        if (i, j + 1) not in dentro:
            siguiente.setdefault((i + 1, j + 1), []).append((i, j + 1))
        if (i - 1, j) not in dentro:
            siguiente.setdefault((i, j + 1), []).append((i, j))
    anillos = []
    for inicio in sorted(siguiente):
        while siguiente.get(inicio):
            anillo = [inicio]
            actual, previo = inicio, None
            while True:
                opciones = siguiente[actual]
                if len(opciones) > 1 and previo is not None:
                    # En un vértice de dos pasos (dos celdas en diagonal), girar a la derecha: separa los anillos.
                    dx, dy = actual[0] - previo[0], actual[1] - previo[1]
                    derecha = (actual[0] - dy, actual[1] + dx)
                    elegido = derecha if derecha in opciones else opciones[0]
                else:
                    elegido = opciones[0]
                opciones.remove(elegido)
                previo, actual = actual, elegido
                if actual == inicio:
                    break
                anillo.append(actual)
            tol = (tolerancia_mm if tolerancia_mm is not None else 0.75 * malla.paso) / malla.paso
            anillo = _simplificar_anillo(anillo, tol)
            if len(anillo) >= 3:
                anillos.append([(round(malla.x0 + x * malla.paso, 4), round(malla.y0 + y * malla.paso, 4)) for x, y in anillo])
    return anillos


def _dp(puntos, tolerancia: float):
    """Douglas–Peucker iterativo (sin recursión: un contorno de escalera tiene miles de vértices)."""
    if len(puntos) < 3:
        return list(puntos)
    guardar = [False] * len(puntos)
    guardar[0] = guardar[-1] = True
    pila = [(0, len(puntos) - 1)]
    while pila:
        a, b = pila.pop()
        mejor, k_mejor = -1.0, -1
        for k in range(a + 1, b):
            d = idn._dist_seg(puntos[k], puntos[a], puntos[b])
            if d > mejor:
                mejor, k_mejor = d, k
        if mejor > tolerancia:
            guardar[k_mejor] = True
            pila += [(a, k_mejor), (k_mejor, b)]
    return [p for p, g in zip(puntos, guardar) if g]


def _simplificar_anillo(anillo, tolerancia: float):
    """Douglas–Peucker de un anillo cerrado: se parte por su vértice más lejano del primero."""
    if len(anillo) < 4:
        return anillo
    b = max(range(len(anillo)), key=lambda k: (anillo[k][0] - anillo[0][0]) ** 2 + (anillo[k][1] - anillo[0][1]) ** 2)
    ida = _dp(anillo[: b + 1], tolerancia)
    vuelta = _dp(anillo[b:] + anillo[:1], tolerancia)
    return ida[:-1] + vuelta[:-1]


# ─── Para construir mallas (pruebas y sintéticos; la de producción la hace el núcleo) ──

def codificar_capa(valores) -> str:
    """Lo mismo que `codificarCapa` de verdad/malla.ts: rachas (valor, largo) en varints y base64."""
    salida = bytearray()

    def varint(v: int) -> None:
        while v >= 0x80:
            salida.append((v & 0x7F) | 0x80)
            v >>= 7
        salida.append(v)
    k, n = 0, len(valores)
    while k < n:
        v = valores[k]
        m = 1
        while k + m < n and valores[k + m] == v:
            m += 1
        varint(int(v))
        varint(m)
        k += m
    return base64.b64encode(bytes(salida)).decode()


def malla_de_poligonos(piezas: list[dict[str, Any]], caja: tuple[float, float, float, float], paso: float = 0.05, colores: list[str] | None = None) -> dict[str, Any]:
    """Una malla de verdad pintando polígonos (anillos par-impar) por pieza, en su orden (la de después
    tapa a la de antes). `piezas`: [{id, anillos, estructural?, color?}]."""
    x0, y0, x1, y1 = caja
    ancho, alto = max(1, round((x1 - x0) / paso)), max(1, round((y1 - y0) / paso))
    capa = bytearray(ancho * alto)
    capa_color = bytearray(ancho * alto)
    # V6.5.0: con "confianza" (0–100) en alguna pieza, la malla es la de una imagen con evidencia de color.
    con_confianza = any("confianza" in p for p in piezas)
    capa_confianza = bytearray(ancho * alto) if con_confianza else None
    lista_colores = list(colores or ["tinta"])
    for k, p in enumerate(piezas, 1):
        color = lista_colores.index(p["color"]) + 1 if p.get("color") in lista_colores else 1
        confianza = int(p.get("confianza", 100))
        # Scanline por los centros de celda, par-impar (lo mismo que `pintarAnillos` en rejilla.ts).
        cruces: dict[int, list[float]] = {}
        for anillo in p["anillos"]:
            for a, b in zip(anillo, anillo[1:] + anillo[:1]):
                if a[1] == b[1]:
                    continue
                bajo, alto_ = (a, b) if a[1] < b[1] else (b, a)
                desde = max(0, math.ceil((bajo[1] - y0) / paso - 0.5))
                hasta = min(alto - 1, math.ceil((alto_[1] - y0) / paso - 0.5) - 1)
                for j in range(desde, hasta + 1):
                    y = y0 + (j + 0.5) * paso
                    cruces.setdefault(j, []).append(bajo[0] + (y - bajo[1]) * (alto_[0] - bajo[0]) / (alto_[1] - bajo[1]))
        for j, xs in cruces.items():
            xs.sort()
            for q in range(0, len(xs) - 1, 2):
                i0 = max(0, math.ceil((xs[q] - x0) / paso - 0.5))
                i1 = min(ancho - 1, math.ceil((xs[q + 1] - x0) / paso - 0.5) - 1)
                for i in range(i0, i1 + 1):
                    capa[j * ancho + i] = k
                    capa_color[j * ancho + i] = color
                    if capa_confianza is not None:
                        capa_confianza[j * ancho + i] = confianza
    areas = {k: 0 for k in range(1, len(piezas) + 1)}
    for v in capa:
        if v:
            areas[v] += 1
    return {
        "x0": x0, "y0": y0, "paso": paso, "ancho": ancho, "alto": alto,
        "capaPiezas": codificar_capa(capa), "capaColores": codificar_capa(capa_color),
        "piezas": [{"id": p["id"], "estructural": p.get("estructural", True), "incierto": p.get("incierto", False), "anchoMm": p.get("anchoMm", 1.0), "areaMm2": round(areas[k] * paso * paso, 3)} for k, p in enumerate(piezas, 1)],
        "colores": lista_colores,
        **({"capaConfianzaColor": codificar_capa(capa_confianza)} if capa_confianza is not None else {}),
    }
