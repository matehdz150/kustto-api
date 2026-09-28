"""V6.3 — IDENTIDAD OBJETO -> PUNTADAS, exacta y demostrable.

QUÉ CONSERVA INK/STITCH 3.3.0 (medido, ver pruebas-bordado/v6.3/INFORME.md):

  - El `id` de cada <path> NO llega a ninguna salida (DST, JSON, CSV): el
    DST no tiene dónde, y el JSON de pyembroidery sólo trae puntadas,
    comandos e hilos.
  - SÍ conserva el ORDEN DEL DOCUMENTO: cada elemento genera sus puntadas en
    el orden en que aparece, y el plan es la concatenación de esas
    puntadas con remates, saltos, cortes y cambios de color entre medias.
  - Las puntadas propias de un elemento DEPENDEN DE SU CONTEXTO (dónde
    acabó el anterior, dónde empieza el siguiente, si el anterior es del
    mismo color): no se pueden regenerar elemento a elemento.

LA FRONTERA DETERMINISTA. Como el id no sobrevive, la relación se
reconstruye con corridas privadas del MISMO documento que no cambian el
contexto de ningún elemento:

  1. PRODUCCIÓN: el DST de siempre, intacto (es lo que se cose).
  2. ESPEJO: el mismo SVG en JSON: el mismo plan con coordenadas en coma
     flotante. Sus puntadas (STITCH) son, una a una y en orden, las del DST
     (se comprueba: mismo número y |Δ| ≤ 0.5 unidades, el redondeo del DST).
  3. IDENTIDAD: el mismo SVG con `stop_after` en cada elemento (un STOP que
     marca dónde acaba), sin remates (`ties="3"`) y con el origen de Ink/Stitch
     en (0, 0): mismos colores, mismos vecinos, mismo contexto. Entre dos STOP
     están las puntadas PROPIAS de un elemento, en coordenadas absolutas del
     documento.
  4. Si algún elemento no produce puntadas, no deja STOP: una cuarta corrida
     con un color distinto por elemento dice cuáles producen (su `threadlist`),
     sin ambigüedad.

Cada segmento de IDENTIDAD aparece, en orden y CONTIGUO, en el ESPEJO,
igual en coma flotante salvo una traslación única (el centrado de Ink/Stitch)
que se comprueba en todas las puntadas. No hay proximidad ni cajas: la
identidad es el orden del documento, y la igualdad exacta es la prueba.

Lo que no es igual se declara, no se adivina:

  - Sin remates en la corrida de identidad, la entrada o la salida de un
    elemento (1–2 puntadas) puede cambiar con su vecino: se busca su NÚCLEO
    exacto (`RECORTE`) y el elemento queda `recortado`; si ni así, `sin
    verificar`. Sus veredictos negativos pasan a inconclusos
    (`identity-incomplete`); el resto del mapa sigue siendo exacto.
  - Los remates de producción se atribuyen POR SECUENCIA: la racha sin
    dueño pegada a un elemento y cerrada por un comando es suya. Entre dos
    elementos sin comando, la racha es ambigua y no es de ninguno.
  - Si no se puede demostrar ni el marco, `SinIdentidad`: el motor vuelve a
    la heurística vieja y la marca `attribution: heuristic`.

El marco (DST → documento) sale de flotantes idénticos: su residuo es 1e-5
mm. El redondeo del DST a 0.1 mm no es incertidumbre de alineación: es lo
que cose la máquina, y es lo que se mide.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

import pyembroidery as pe

#: Cuánto puede diferir una puntada del DST de su gemela del espejo: el redondeo a 0.1 mm.
CUANTO_DST = 0.5 + 1e-6
#: Igualdad en coma flotante entre la corrida de identidad y el espejo (unidades de 0.1 mm).
EPSILON = 1e-4
#: Hasta cuántas puntadas de enlace (remates, traslados) se buscan entre dos elementos.
VENTANA = 20_000
#: Puntadas de contexto por punta que pueden no coincidir (la entrada/salida de un
#: elemento depende del remate vecino, que la corrida de identidad no lleva).
RECORTE = 2
#: Un núcleo exacto tiene al menos esto (y la mitad del segmento): menos no prueba nada.
NUCLEO_MINIMO = 3

NOMBRES = {pe.STITCH: "STITCH", pe.JUMP: "JUMP", pe.TRIM: "TRIM", pe.COLOR_CHANGE: "COLOR_CHANGE", pe.STOP: "STOP", pe.END: "END"}

ORIGEN = '<defs><symbol id="inkstitch_origin"><circle r="1"/></symbol></defs><use xlink:href="#inkstitch_origin" x="0" y="0" />'


def svg_de_identidad(svg: str) -> str:
    """El mismo documento con un STOP tras cada elemento, sin remates y con origen en (0, 0)."""
    t = svg.replace("<path ", '<path inkstitch:stop_after="true" inkstitch:ties="3" ')
    t = t.replace('xmlns:inkstitch="http://inkstitch.org/namespace"', 'xmlns:inkstitch="http://inkstitch.org/namespace" xmlns:xlink="http://www.w3.org/1999/xlink"', 1)
    return t.replace("</svg>", f"{ORIGEN}</svg>")


def color_de(indice: int) -> str:
    """Un color distinto por elemento, determinista (hash multiplicativo de Knuth)."""
    return f"#{(indice * 2654435761) & 0xffffff:06x}"


def svg_de_colores(svg: str) -> str:
    """El mismo documento con el color de cada elemento sustituido por uno propio (sólo para saber quién produce)."""
    lineas = svg.split("\n")
    k = 0
    for i, linea in enumerate(lineas):
        if not linea.startswith("<path "):
            continue
        c = color_de(k)
        linea = re.sub(r'stroke="#[0-9a-fA-F]{6}"', f'stroke="{c}"', linea)
        linea = re.sub(r'fill="#[0-9a-fA-F]{6}"', f'fill="{c}"', linea)
        lineas[i] = linea
        k += 1
    return "\n".join(lineas)


def _leer_json(ruta: Path) -> dict[str, Any]:
    return json.loads(ruta.read_text(encoding="utf-8"))


def _stitch(registro: list[Any]) -> bool:
    return registro[2] == "STITCH"


class SinIdentidad(Exception):
    """El mapa no se pudo demostrar: la atribución no es autoritativa."""


def mapear(pattern: pe.EmbPattern, espejo: dict[str, Any], identidad: dict[str, Any], elementos: int, colores: dict[str, Any] | None = None) -> dict[str, Any]:
    """El mapa exacto: por elemento (orden del documento), sus puntadas propias en índices del DST."""
    dst = [(float(x), float(y), int(c) & pe.COMMAND_MASK) for x, y, c in pattern.stitches]
    dst_stitch = [i for i, r in enumerate(dst) if r[2] == pe.STITCH]
    esp = [r for r in espejo["stitches"] if _stitch(r)]
    # 1. El espejo es el mismo plan que el DST: puntada a puntada, dentro del redondeo.
    if len(esp) != len(dst_stitch):
        raise SinIdentidad(f"el espejo tiene {len(esp)} puntadas y el DST {len(dst_stitch)}")
    for k, i in enumerate(dst_stitch):
        if abs(esp[k][0] - dst[i][0]) > CUANTO_DST or abs(esp[k][1] - dst[i][1]) > CUANTO_DST:
            raise SinIdentidad(f"la puntada {i} del DST no es la {k} del espejo")
    # 2. Los segmentos de la corrida de identidad (entre STOP): las puntadas propias de cada elemento que produce.
    segmentos: list[list[tuple[float, float]]] = [[]]
    for x, y, c in identidad["stitches"]:
        if str(c).startswith("STOP"):
            segmentos.append([])
        elif c == "STITCH":
            segmentos[-1].append((x, y))
    paradas = len(segmentos) - 1
    if paradas == elementos:
        # Un STOP por elemento: el segmento k es del elemento k, también si
        # está vacío (un elemento que deja su STOP sin coser nada).
        productores = list(range(elementos))
        segmentos = segmentos[:elementos]
    else:
        # Faltan STOP: los elementos que no producen nada no dejan ninguno.
        segmentos = [s for s in segmentos if s]
        if colores is None:
            raise SinIdentidad("faltan elementos y no hay corrida de colores")
        por_color = {color_de(k): k for k in range(elementos)}
        productores = [por_color.get(str(t.get("color", "")).lower(), -1) for t in colores.get("threadlist", [])]
        if -1 in productores or productores != sorted(productores) or len(productores) != len(segmentos):
            raise SinIdentidad("la corrida de colores no identifica a los productores")
    # 3. Cada segmento, contiguo y en orden, en el espejo: igual salvo UNA
    # traslación, la misma para todos. Si no aparece entero, su NÚCLEO exacto
    # (sin hasta RECORTE puntadas por punta: la entrada o la salida, que
    # dependen del remate vecino que la corrida de identidad no tiene). Si
    # tampoco, el elemento queda SIN VERIFICAR; el resto del mapa sigue.
    d: tuple[float, float] | None = None
    pos = 0
    por_elemento: dict[int, list[int]] = {}
    estado: dict[int, dict[str, Any]] = {}

    def buscar(seg: list[tuple[float, float]], desde: int) -> int:
        n = len(seg)
        for j in range(desde, min(len(esp) - n, desde + VENTANA) + 1):
            dx, dy = (esp[j][0] - seg[0][0], esp[j][1] - seg[0][1]) if d is None else d
            if all(abs(esp[j + t][0] - seg[t][0] - dx) < EPSILON and abs(esp[j + t][1] - seg[t][1] - dy) < EPSILON for t in range(n)):
                return j
        return -1

    for e, seg in zip(productores, segmentos):
        n = len(seg)
        if not n:
            continue
        hallado, p, q = buscar(seg, pos), 0, 0
        if hallado < 0 and d is not None:
            for p, q in sorted(((a, b) for a in range(RECORTE + 1) for b in range(RECORTE + 1) if a + b), key=sum):
                nucleo = seg[p:n - q]
                if len(nucleo) >= NUCLEO_MINIMO and 2 * len(nucleo) >= n:
                    hallado = buscar(nucleo, pos)
                    if hallado >= 0:
                        break
        if hallado < 0:
            estado[e] = {"estado": "sin-verificar", "identidad": n}
            continue
        if d is None:
            d = (esp[hallado][0] - seg[p][0], esp[hallado][1] - seg[p][1])
        m = n - p - q
        por_elemento[e] = [dst_stitch[k] for k in range(hallado, hallado + m)]
        estado[e] = {"estado": "recortado", "identidad": n, "recortadas": [p, q]} if p or q else {"estado": "completo"}
        pos = hallado + m
    if d is None:
        raise SinIdentidad("ningún elemento aparece entero en la producción")
    sin_verificar = [e for e, x in estado.items() if x["estado"] == "sin-verificar"]
    if len(sin_verificar) * 2 > max(1, len(estado)):
        raise SinIdentidad(f"{len(sin_verificar)} de {len(estado)} elementos no aparecen en la producción")
    # 3b. REMATES POR SECUENCIA. La corrida de identidad va sin remates, así
    # que los de producción quedan sin dueño. Una racha de puntadas sin dueño
    # PEGADA a las de un elemento y cerrada del otro lado por un comando
    # (salto, corte, cambio de color, fin) es de ese elemento: su remate de
    # salida o de entrada (o, entre dos trozos suyos, sus puntadas de
    # contexto). Entre dos elementos distintos sin comando en medio es
    # ambigua (remate de uno + enlace + remate del otro): sigue sin dueño.
    # Es el orden del DST, no la geometría.
    dueno: dict[int, int] = {i: e for e, idx in por_elemento.items() for i in idx}
    remates: dict[int, int] = {}
    i = 0
    while i < len(dst):
        if dst[i][2] != pe.STITCH or i in dueno:
            i += 1
            continue
        j = i
        while j + 1 < len(dst) and dst[j + 1][2] == pe.STITCH and (j + 1) not in dueno:
            j += 1
        izq = dueno.get(i - 1) if i > 0 and dst[i - 1][2] == pe.STITCH else None
        der = dueno.get(j + 1) if j + 1 < len(dst) and dst[j + 1][2] == pe.STITCH else None
        izq_comando = i == 0 or dst[i - 1][2] != pe.STITCH
        der_comando = j + 1 >= len(dst) or dst[j + 1][2] != pe.STITCH
        e = izq if izq is not None and (der_comando or der == izq) else der if der is not None and izq_comando else None
        if e is not None:
            for k in range(i, j + 1):
                remates[k] = e
        i = j + 1
    for k, e in remates.items():
        dueno[k] = e
        por_elemento.setdefault(e, []).append(k)
    for e in por_elemento:
        por_elemento[e].sort()
    # 4. Rangos en índices del DST y lo que no es de nadie (enlaces y comandos).
    salida = []
    for e in range(elementos):
        idx = por_elemento.get(e, [])
        rangos: list[list[int]] = []
        for i in idx:
            if rangos and i == rangos[-1][1] + 1:
                rangos[-1][1] = i
            else:
                rangos.append([i, i])
        salida.append({"elemento": e, "puntadas": len(idx), "remates": sum(1 for k in idx if k in remates), "rangos": rangos, "verificacion": estado.get(e, {"estado": "completo"})})
    enlaces = []
    anterior = -1
    for i, (x, y, c) in enumerate(dst):
        if i in dueno:
            anterior = dueno[i]
        elif c == pe.STITCH:
            enlaces.append(i)
    comandos: dict[str, list[int]] = {}
    for i, (_, _, c) in enumerate(dst):
        if c != pe.STITCH:
            comandos.setdefault(NOMBRES.get(c, str(c)), []).append(i)
    return {
        "verificado": True,
        "elementos": salida,
        "sinPuntadas": [e for e in range(elementos) if e not in por_elemento and e not in sin_verificar],
        # Lo que no se pudo demostrar entero: sus veredictos negativos no son firmes.
        "incompletos": sorted(e for e, x in estado.items() if x["estado"] != "completo"),
        "enlaces": enlaces,
        "comandos": comandos,
        # DST (0.1 mm, centrado) -> documento (mm): (x - dx) / 10. La traslación
        # sale de flotantes idénticos (espejo e identidad), verificada en TODAS
        # las puntadas propias: su residuo es EPSILON (1e-5 mm). El redondeo del
        # DST a 0.1 mm (±0.05 mm frente al plan) NO es incertidumbre: las
        # puntadas redondeadas son lo que cose la máquina, y es lo que se mide.
        "marco": {"dx": d[0], "dy": d[1], "residuoMm": EPSILON / 10, "redondeoDelDstMm": 0.05},
    }


#: V6.4.1: la versión del mecanismo de identidad; forma parte de la clave de caché de un cosido.
MECANISMO = "v6.3-stop_after-identity"

Motor = Callable[[Path, Path, str], None]


def correr_inkstitch(svg: Path, salida: Path, formato: str) -> None:
    """Ink/Stitch sobre `svg`, con la salida en `formato` (json para las corridas privadas)."""
    from motor import INKSTITCH, ENGINE_TIMEOUT, ensure_display  # evita el ciclo al importar

    ensure_display()
    with salida.open("wb") as o:
        r = subprocess.run([INKSTITCH, "--extension=output", f"--format={formato}", str(svg)], stdout=o, stderr=subprocess.PIPE, timeout=ENGINE_TIMEOUT, check=False, env=os.environ.copy())
    if r.returncode != 0 or not salida.exists() or salida.stat().st_size < 10:
        raise SinIdentidad(f"Ink/Stitch falló en la corrida {salida.name}")


def identidad_del_dst(svg: Path, pattern: pe.EmbPattern, carpeta: Path, elementos: int, motor: Motor = correr_inkstitch) -> dict[str, Any]:
    """Las corridas privadas (en paralelo) y el mapa. Nunca toca el DST de producción."""
    texto = svg.read_text(encoding="utf-8")
    (carpeta / "privado-identidad.svg").write_text(svg_de_identidad(texto), encoding="utf-8")
    with ThreadPoolExecutor(max_workers=2) as hilos:
        a = hilos.submit(motor, svg, carpeta / "privado-espejo.json", "json")
        b = hilos.submit(motor, carpeta / "privado-identidad.svg", carpeta / "privado-identidad.json", "json")
        a.result()
        b.result()
    espejo = _leer_json(carpeta / "privado-espejo.json")
    ident = _leer_json(carpeta / "privado-identidad.json")
    colores = None
    paradas = sum(1 for r in ident["stitches"] if str(r[2]).startswith("STOP"))
    if paradas < elementos:
        (carpeta / "privado-colores.svg").write_text(svg_de_colores(texto), encoding="utf-8")
        motor(carpeta / "privado-colores.svg", carpeta / "privado-colores.json", "json")
        colores = _leer_json(carpeta / "privado-colores.json")
    return mapear(pattern, espejo, ident, elementos, colores)


# ─── Comprobaciones del DST POR IDENTIDAD ─────────────────────────────────
#
# Con el mapa, las puntadas de una estructura son EXACTAMENTE las de los
# objetos cuyo linaje (`identity.groups` / `identity.pieces`, que pone la
# preparación) la incluye. Las de otro objeto, otro color u otro grupo no
# pueden cubrirla: no están en su lista. La única cosa física que sí mira
# todas las puntadas es un counter: la tela la tapa cualquier hilo.

import math  # noqa: E402
from array import array  # noqa: E402
from collections import defaultdict  # noqa: E402

from PIL import Image, ImageChops, ImageDraw, ImageFilter  # noqa: E402

#: Del eje al hilo más cercano (la misma de `cobertura_de_estructura`).
TOLERANCIA_DE_EJE_MM = 0.3
COBERTURA_MINIMA = 0.9
#: Una rama estructural sin la mitad de su eje cosida está perdida (la regla de `compararEstructura`).
FRACCION_DE_RAMA = 0.5
HILO_MM = 0.4
HILO_MEDIO_MM = 0.2
COUNTER_MINIMO_MM = 0.2
HUECO_MINIMO_MM2 = 0.01
#: Resolución de la imagen del hilo: 10 px por mm (0.1 mm, la del DST).
PX_POR_MM = 10


def _dist_seg(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2))
    return math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)


def hilos_por_elemento(pattern: pe.EmbPattern, mapa: dict[str, Any]) -> dict[int, list[tuple[tuple[float, float], tuple[float, float]]]]:
    """Por elemento, sus tramos de hilo en mm del documento: de una puntada propia a la siguiente dentro de un rango."""
    dx, dy = mapa["marco"]["dx"], mapa["marco"]["dy"]
    mm = lambda i: ((pattern.stitches[i][0] - dx) / 10, (pattern.stitches[i][1] - dy) / 10)  # noqa: E731
    salida: dict[int, list[tuple[tuple[float, float], tuple[float, float]]]] = {}
    for e in mapa["elementos"]:
        tramos = []
        for a, b in e["rangos"]:
            for i in range(a, b):
                tramos.append((mm(i), mm(i + 1)))
            if a == b:
                tramos.append((mm(a), mm(a)))
        salida[e["elemento"]] = tramos
    return salida


class HiloPropio:
    """El hilo de un CONJUNTO de elementos (los de una pieza o un grupo), por la secuencia del DST.

    Un tramo (de una puntada a la siguiente, sin comando entre medias) es del
    conjunto si sus dos puntas lo son: una puntada con dueño, si su dueño
    está en el conjunto; una sin dueño (conexión ambigua), si los DOS
    elementos que la rodean en su racha están en el conjunto. Así cuentan las
    transiciones y conexiones entre objetos de la misma pieza (el hilo que va
    de uno a otro), y nunca el hilo que llega de fuera. Una puntada propia
    sin ningún tramo del conjunto cuenta como un punto.
    """

    def __init__(self, pattern: pe.EmbPattern, mapa: dict[str, Any]) -> None:
        dx, dy = mapa["marco"]["dx"], mapa["marco"]["dy"]
        self.mm = [((float(x) - dx) / 10, (float(y) - dy) / 10) for x, y, _ in pattern.stitches]
        es = [int(c) & pe.COMMAND_MASK == pe.STITCH for _, _, c in pattern.stitches]
        dueno = {i: e["elemento"] for e in mapa["elementos"] for a, b in e["rangos"] for i in range(a, b + 1)}
        n = len(es)
        # Dueños efectivos de cada puntada: el suyo, o los dos que rodean su racha sin dueño.
        self.duenos: list[frozenset | None] = [None] * n
        i = 0
        while i < n:
            if not es[i]:
                i += 1
                continue
            if i in dueno:
                self.duenos[i] = frozenset((dueno[i],))
                i += 1
                continue
            j = i
            while j + 1 < n and es[j + 1] and (j + 1) not in dueno:
                j += 1
            izq = dueno.get(i - 1) if i > 0 and es[i - 1] else None
            der = dueno.get(j + 1) if j + 1 < n and es[j + 1] else None
            if izq is not None and der is not None:
                for k in range(i, j + 1):
                    self.duenos[k] = frozenset((izq, der))
            i = j + 1
        # Índice por elemento: los tramos y las puntadas que lo tocan. Así
        # el hilo de un conjunto cuesta lo que sus puntadas, no todo el DST.
        self.tramos_de: dict[int, list[tuple[int, int]]] = defaultdict(list)
        for i in range(1, n):
            if es[i] and es[i - 1] and self.duenos[i] is not None and self.duenos[i - 1] is not None:
                for e in self.duenos[i] | self.duenos[i - 1]:
                    self.tramos_de[e].append((i - 1, i))
        self.puntadas_de: dict[int, list[int]] = defaultdict(list)
        for i, e in dueno.items():
            self.puntadas_de[e].append(i)

    def de(self, conjunto: set[int]) -> list[tuple[tuple[float, float], tuple[float, float]]]:
        if not conjunto:
            return []
        dentro = lambda i: self.duenos[i] <= conjunto  # noqa: E731
        vistos: set[tuple[int, int]] = set()
        tramos, tocadas = [], set()
        for e in sorted(conjunto):
            for a, b in self.tramos_de.get(e, ()):
                if (a, b) not in vistos and dentro(a) and dentro(b):
                    vistos.add((a, b))
                    tramos.append((a, b))
                    tocadas.update((a, b))
        tramos.sort()
        salida = [(self.mm[a], self.mm[b]) for a, b in tramos]
        salida += [(self.mm[i], self.mm[i]) for e in sorted(conjunto) for i in self.puntadas_de.get(e, ()) if i not in tocadas]
        return salida


class _Indice:
    """Tramos en celdas de 1 mm, para buscar el más cercano sin recorrerlos todos."""

    def __init__(self, tramos: list[tuple[tuple[float, float], tuple[float, float]]], margen: float) -> None:
        self.celdas: dict[tuple[int, int], list[tuple[tuple[float, float], tuple[float, float]]]] = defaultdict(list)
        for a, b in tramos:
            for cx in range(math.floor(min(a[0], b[0]) - margen), math.floor(max(a[0], b[0]) + margen) + 1):
                for cy in range(math.floor(min(a[1], b[1]) - margen), math.floor(max(a[1], b[1]) + margen) + 1):
                    self.celdas[(cx, cy)].append((a, b))

    def distancia(self, p: tuple[float, float]) -> float:
        return min((_dist_seg(p, a, b) for a, b in self.celdas.get((math.floor(p[0]), math.floor(p[1])), ())), default=math.inf)


def _subpaths(d: str) -> list[list[tuple[float, float]]]:
    from quality import _subpaths as sp  # el mismo lector de paths del motor

    return sp(d) or []


def _objetos_de(objetos: list[dict[str, Any]], clave: str, id_: str) -> list[int]:
    """Los elementos (orden del documento) cuyo linaje incluye `id_`; nunca un traslado."""
    return [k for k, o in enumerate(objetos) if id_ in ((o.get("identity") or {}).get(clave) or []) and (o.get("identity") or {}).get("role") != "travel"]


def cobertura_exacta(pattern: pe.EmbPattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], estructura: list[dict[str, Any]]) -> dict[str, Any]:
    """La cobertura de eje de cada grupo, SÓLO con las puntadas de sus propios objetos."""
    propio = HiloPropio(pattern, mapa)
    puntadas = {e["elemento"]: e["puntadas"] for e in mapa["elementos"]}
    incompletos = set(mapa.get("incompletos") or [])
    grupos = []
    total = cubierta = 0.0
    for g in estructura:
        suyos = _objetos_de(objetos, "groups", str(g.get("id")))
        indice = _Indice(propio.de(set(suyos)), TOLERANCIA_DE_EJE_MM)
        largo = hilo = hueco = maximo = 0.0
        ramas_perdidas = 0
        # V6.5.0: a qué distancia del eje original va el hilo propio donde lo cubre (media y máxima).
        distancias: list[float] = []
        for d in g.get("ejes") or []:
            for linea in _subpaths(d):
                largo_rama = cubierta_rama = 0.0
                # V6.5.0: el hueco se acumula a lo largo de TODA la rama; antes volvía a 0 en cada
                # segmento del eje (0.2 mm) y el "hueco mayor" nunca pasaba de ahí.
                hueco = 0.0
                for i in range(1, len(linea)):
                    a, b = linea[i - 1], linea[i]
                    l = math.dist(a, b)
                    n = max(1, math.ceil(l / 0.1))
                    for k in range(n):
                        t = (k + 0.5) / n
                        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                        paso = l / n
                        largo += paso
                        largo_rama += paso
                        d_eje = indice.distancia(p)
                        if d_eje <= TOLERANCIA_DE_EJE_MM:
                            hilo += paso
                            cubierta_rama += paso
                            hueco = 0.0
                            distancias.append(d_eje)
                        else:
                            hueco += paso
                            maximo = max(maximo, hueco)
                if largo_rama >= 1 and cubierta_rama < FRACCION_DE_RAMA * largo_rama:
                    ramas_perdidas += 1
        ratio = hilo / largo if largo > 0 else 1.0
        desconectadas = _uniones_desconectadas(g, propio.de(set(suyos)), indice)
        grupos.append({"id": g.get("id"), "junctionsDisconnected": desconectadas, "identityIncomplete": any(k in incompletos for k in suyos), "objects": [objetos[k].get("id") for k in suyos], "ownStitches": sum(puntadas.get(k, 0) for k in suyos), "sourceLengthMm": round(largo, 2), "coveredLengthMm": round(hilo, 2), "coverageRatio": round(ratio, 4), "longestMissingSegmentMm": round(maximo, 2), "branchesLost": ramas_perdidas,
                       # V6.5.0 (StrokeCoverage): lo que falta, cuánto se aparta el hilo del eje, y la estructura fina que es.
                       "missingLengthMm": round(largo - hilo, 2), "meanCenterlineDistanceMm": round(sum(distancias) / len(distancias), 3) if distancias else None, "maxCenterlineDistanceMm": round(max(distancias), 3) if distancias else None,
                       **({"class": g["clase"]} if g.get("clase") else {}), **({"importance": g["importancia"]} if g.get("importancia") else {})})
        total += largo
        cubierta += hilo
    return {
        "attribution": "identity",
        "groups": len(grupos),
        "sourceLengthMm": round(total, 2),
        "coveredLengthMm": round(cubierta, 2),
        "coverageRatio": round(cubierta / total, 4) if total > 0 else 1.0,
        "worstGroups": sorted(grupos, key=lambda g: g["coverageRatio"])[:5],
        # Un veredicto negativo con un objeto sin identidad entera no es firme.
        # V6.5.0: una estructura decorativa (sólo puntas que se afilan) incompleta es un dato, no una revisión.
        "incomplete": [g["id"] for g in grupos if g["sourceLengthMm"] >= 1 and g["coverageRatio"] < COBERTURA_MINIMA and not g["identityIncomplete"] and g.get("importance") != "decorative"],
        "incompleteDecorative": [g["id"] for g in grupos if g["sourceLengthMm"] >= 1 and g["coverageRatio"] < COBERTURA_MINIMA and not g["identityIncomplete"] and g.get("importance") == "decorative"],
        "branchesLost": [g["id"] for g in grupos if g["branchesLost"] and not g["identityIncomplete"]],
        "junctionsDisconnected": [{"group": g["id"], **u} for g in grupos if not g["identityIncomplete"] for u in g["junctionsDisconnected"]],
        "inconclusive": [g["id"] for g in grupos if g["identityIncomplete"] and ((g["sourceLengthMm"] >= 1 and g["coverageRatio"] < COBERTURA_MINIMA) or g["branchesLost"] or g["junctionsDisconnected"])],
        "perGroup": grupos,
    }


def _a_lo_largo(linea: list[tuple[float, float]], distancia: float) -> tuple[float, float] | None:
    """El punto de una polilínea a `distancia` de su comienzo, medido a lo largo; None si es más corta."""
    for a, b in zip(linea, linea[1:]):
        l = math.dist(a, b)
        if l >= distancia and l > 0:
            t = distancia / l
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        distancia -= l
    return None


def _uniones_desconectadas(grupo: dict[str, Any], propios, indice: "_Indice") -> list[dict[str, Any]]:
    """Uniones (T, Y, X) del grupo cuyas ramas cosidas caen en trozos distintos de SU hilo.

    Cada rama que sale de la unión se mira desde un ancho de hilo (HILO_MM)
    de ella —más cerca, el propio nudo de hilo de la unión las junta todas—
    en su primer punto con hilo propio. Una rama sin hilo propio en todo su
    largo no cuenta (eso es cobertura de eje, no unión).
    """
    uniones = grupo.get("uniones") or []
    if not uniones or not propios:
        return []
    lineas = [linea for d in grupo.get("ejes") or [] for linea in _subpaths(d) if len(linea) >= 2]
    xs = [p[0] for t in propios for p in t]
    ys = [p[1] for t in propios for p in t]
    caja = (min(xs) - 0.5, min(ys) - 0.5, max(xs) + 0.5, max(ys) + 0.5)
    piezas = _componentes(_imagen(propios, caja), 1)
    if len(piezas) < 2:
        return []
    radio = round(TOLERANCIA_DE_EJE_MM * PX_POR_MM)

    def pieza_de(p: tuple[float, float]) -> int | None:
        cx, cy = round((p[0] - caja[0]) * PX_POR_MM + 1), round((p[1] - caja[1]) * PX_POR_MM + 1)
        for k, im in enumerate(piezas):
            for dy in range(-radio, radio + 1):
                for dx in range(-radio, radio + 1):
                    x, y = cx + dx, cy + dy
                    if dx * dx + dy * dy <= radio * radio and 0 <= x < im.width and 0 <= y < im.height and im.getpixel((x, y)) == 255:
                        return k
        return None

    salida = []
    for u in uniones:
        j = (float(u[0]), float(u[1]))
        partes = set()
        for linea in lineas:
            for extremo in (linea, linea[::-1]):
                if math.dist(extremo[0], j) <= TOLERANCIA_DE_EJE_MM:
                    paso = HILO_MM
                    while (p := _a_lo_largo(extremo, paso)) is not None:
                        if indice.distancia(p) <= TOLERANCIA_DE_EJE_MM:
                            k = pieza_de(p)
                            if k is not None:
                                partes.add(k)
                            break
                        paso += 0.1
        if len(partes) >= 2:
            salida.append({"at": [round(j[0], 2), round(j[1], 2)], "parts": len(partes)})
    return salida


def _imagen(tramos, caja, px: int = PX_POR_MM, ancho_mm: float = HILO_MM) -> Image.Image:
    """El hilo (0.4 mm, o `ancho_mm`) de unos tramos, en una imagen de la caja dada (mm)."""
    x0, y0, x1, y1 = caja
    ancho, alto = max(1, math.ceil((x1 - x0) * px) + 2), max(1, math.ceil((y1 - y0) * px) + 2)
    im = Image.new("L", (ancho, alto), 0)
    dib = ImageDraw.Draw(im)
    grosor = max(1, round(ancho_mm * px))
    for a, b in tramos:
        pa = ((a[0] - x0) * px + 1, (a[1] - y0) * px + 1)
        pb = ((b[0] - x0) * px + 1, (b[1] - y0) * px + 1)
        dib.line([pa, pb], fill=255, width=grosor)
        dib.ellipse([pb[0] - grosor / 2, pb[1] - grosor / 2, pb[0] + grosor / 2, pb[1] + grosor / 2], fill=255)
    return im


def _componentes(im: Image.Image, minimo_px: int) -> list[Image.Image]:
    """Las piezas conexas de una imagen binaria (cada una como imagen), con relleno por inundación de Pillow."""
    trabajo = im.copy()
    piezas = []
    while True:
        caja = trabajo.getbbox()
        if not caja:
            break
        semilla = next(((x, caja[1]) for x in range(caja[0], caja[2]) if trabajo.getpixel((x, caja[1])) == 255), None)
        if semilla is None:
            break
        antes = trabajo.copy()
        ImageDraw.floodfill(trabajo, semilla, 0, thresh=0)
        pieza = ImageChops.difference(antes, trabajo)
        if pieza.histogram()[255] >= minimo_px:
            piezas.append(pieza)
    return piezas


def topologia_exacta(pattern: pe.EmbPattern, mapa: dict[str, Any], objetos: list[dict[str, Any]], verdad: list[dict[str, Any]]) -> dict[str, Any]:
    """Piezas y counters de la verdad en el DST, por identidad.

    Pieza perdida: sus objetos no tienen puntadas propias, o sus sondas no
    tienen hilo PROPIO cerca. Partida: su hilo propio forma dos o más piezas
    (también una unión que se desconecta). Fusionada: el hilo propio de dos
    piezas separadas en el original se toca. Counter perdido: hilo (de
    cualquiera: la tela la tapa cualquier hilo) sobre su polo. Counter nuevo:
    un hueco cerrado del hilo que no es ni un counter del original ni uno del
    IR. Lo único incierto que queda es el redondeo del DST (0.05 mm) y lo que
    la verdad ya marcó incierto.
    """
    propio = HiloPropio(pattern, mapa)
    puntadas = {e["elemento"]: e["puntadas"] for e in mapa["elementos"]}
    incompletos = set(mapa.get("incompletos") or [])
    # Lo único que separa la verdad (mm del documento) del hilo medido es el
    # residuo del marco: con identidad, la alineación deja de ser una duda.
    u = float(mapa["marco"]["residuoMm"])
    todos = _todos_los_tramos(pattern, mapa)
    indice_todos = _Indice(todos, TOLERANCIA_DE_EJE_MM + u)
    perdidas, tapados, inconclusas, partidas, fusionadas, nuevos = [], [], [], [], [], []
    evaluadas = {"components": 0, "counters": 0}
    polos_conocidos: list[tuple[float, ...]] = []
    for fuente in verdad:
        # Fusiones sólo dentro de una fuente: dos fuentes (logo y texto) pueden
        # solaparse ya en el original.
        mascaras: dict[str, tuple[Image.Image, tuple[float, float, float, float]]] = {}
        for c in fuente.get("componentes") or []:
            if c.get("enIR") != "conservada":
                continue
            evaluadas["components"] += 1
            suyos = _objetos_de(objetos, "pieces", str(c.get("id")))
            propios = propio.de(set(suyos))
            registro = {"id": c.get("id"), "kind": "piece", "objects": [objetos[k].get("id") for k in suyos], "ownStitches": sum(puntadas.get(k, 0) for k in suyos)}
            dudosa = any(k in incompletos for k in suyos)
            if not propios and dudosa:
                inconclusas.append({**registro, "kind": "component", "cause": "identity-incomplete"})
                continue
            if not propios:
                # Ninguno de sus objetos dejó una puntada: perdida, sin duda posible.
                perdidas.append({**registro, "cause": "no-own-stitches"})
                continue
            indice = _Indice(propios, TOLERANCIA_DE_EJE_MM + u)
            d = [indice.distancia((float(x), float(y))) for x, y in c.get("sondas") or []]
            cerca = sum(1 for v in d if v <= TOLERANCIA_DE_EJE_MM)
            if d and cerca * 2 < len(d):
                dudosas = sum(1 for v in d if v <= TOLERANCIA_DE_EJE_MM + u)
                if c.get("incierto") or dudosa:
                    inconclusas.append({**registro, "kind": "component", "cause": "truth-uncertain" if c.get("incierto") else "identity-incomplete"})
                elif dudosas * 2 >= len(d):
                    inconclusas.append({**registro, "kind": "component", "cause": "frame-residual"})
                else:
                    perdidas.append({**registro, "cause": "probes-without-own-thread", "probesWithThread": cerca, "probes": len(d)})
                continue
            # Partida: el hilo propio, como imagen, en más de una pieza.
            xs = [p[0] for t in propios for p in t]
            ys = [p[1] for t in propios for p in t]
            caja = (min(xs) - 0.5, min(ys) - 0.5, max(xs) + 0.5, max(ys) + 0.5)
            im = _imagen(propios, caja)
            mascaras[str(c.get("id"))] = (im, caja)
            piezas = _componentes(im, max(1, round(HUECO_MINIMO_MM2 * PX_POR_MM * PX_POR_MM)))
            if len(piezas) > 1:
                if dudosa:
                    inconclusas.append({**registro, "kind": "component-split", "cause": "identity-incomplete"})
                else:
                    partidas.append({**registro, "parts": len(piezas)})
        # Fusionadas: el hilo propio de dos piezas conservadas se toca. Sólo si
        # sus objetos son distintos: un objeto que cose las dos ya las unía en
        # el IR (frontera IR, no DST).
        suyos_de = {str(c.get("id")): set(_objetos_de(objetos, "pieces", str(c.get("id")))) for c in fuente.get("componentes") or []}
        ids = sorted(mascaras)
        for i, a in enumerate(ids):
            ia, ca = mascaras[a]
            for b in ids[i + 1:]:
                ib, cb = mascaras[b]
                if suyos_de.get(a, set()) & suyos_de.get(b, set()):
                    continue
                if ca[2] < cb[0] or cb[2] < ca[0] or ca[3] < cb[1] or cb[3] < ca[1]:
                    continue
                caja = (min(ca[0], cb[0]), min(ca[1], cb[1]), max(ca[2], cb[2]), max(ca[3], cb[3]))
                lienzo_a = Image.new("L", (math.ceil((caja[2] - caja[0]) * PX_POR_MM) + 2, math.ceil((caja[3] - caja[1]) * PX_POR_MM) + 2), 0)
                lienzo_b = lienzo_a.copy()
                lienzo_a.paste(ia, (round((ca[0] - caja[0]) * PX_POR_MM), round((ca[1] - caja[1]) * PX_POR_MM)))
                lienzo_b.paste(ib, (round((cb[0] - caja[0]) * PX_POR_MM), round((cb[1] - caja[1]) * PX_POR_MM)))
                if ImageChops.multiply(lienzo_a, lienzo_b).getbbox():
                    fusionadas.append({"ids": [a, b]})
        polos_conocidos += [tuple(h["polo"]) for h in fuente.get("counters") or [] if h.get("polo")] + [tuple(h["polo"]) for h in fuente.get("countersIR") or [] if h.get("polo")]
        for h in fuente.get("counters") or []:
            if h.get("enIR") != "conservada" or not h.get("polo"):
                continue
            evaluadas["counters"] += 1
            v = indice_todos.distancia((float(h["polo"][0]), float(h["polo"][1])))
            libre = v - HILO_MEDIO_MM
            if libre - u >= COUNTER_MINIMO_MM / 2:
                continue
            registro = {"id": h.get("id"), "threadDistanceMm": round(v, 3), "freeRadiusMm": round(libre, 3), "widthMm": h.get("anchoMm")}
            if libre + u < COUNTER_MINIMO_MM / 2 and not h.get("incierto"):
                tapados.append(registro)
            else:
                inconclusas.append({**registro, "kind": "counter", "cause": "truth-uncertain" if h.get("incierto") else "frame-residual"})
    # Grupo perdido (por hilo): un grupo de la verdad cuyos objetos existen en
    # el plan y NINGUNO deja una puntada propia. Las piezas son de tinta (un
    # blanco sobre un rojo es una sola pieza); esto es lo que dice que el
    # blanco desapareció aunque el rojo pase exactamente por encima.
    por_grupo: dict[str, list[int]] = defaultdict(list)
    for k, o in enumerate(objetos):
        ident = o.get("identity") or {}
        if ident.get("role") != "travel":
            for g in ident.get("groups") or []:
                por_grupo[str(g)].append(k)
    evaluadas["groups"] = len(por_grupo)
    for g in sorted(por_grupo):
        if not any(puntadas.get(k) for k in por_grupo[g]):
            if any(k in incompletos for k in por_grupo[g]):
                inconclusas.append({"id": g, "kind": "group", "objects": [objetos[k].get("id") for k in por_grupo[g]], "cause": "identity-incomplete"})
                continue
            perdidas.append({"id": g, "kind": "group", "objects": [objetos[k].get("id") for k in por_grupo[g]], "ownStitches": 0, "cause": "no-own-stitches"})
    # Los huecos del hilo son de toda la tela: una sola vez, con los polos de todas las fuentes.
    nuevos.extend(_counters_nuevos(todos, polos_conocidos, indice_todos))
    # Diagnóstico (no cambia nada): ¿lo cierra una puntada de conexión, que no
    # es de ningún objeto? Es la causa típica (Ink/Stitch une dos objetos del
    # mismo hilo sin cortar y el tramo cruza una abertura).
    dx, dy = mapa["marco"]["dx"], mapa["marco"]["dy"]
    mm = lambda i: ((float(pattern.stitches[i][0]) - dx) / 10, (float(pattern.stitches[i][1]) - dy) / 10)  # noqa: E731
    # Tramo de conexión: de puntada a puntada sin salto, pero no dentro de un
    # mismo elemento (entre dos elementos, o por puntadas de nadie).
    dueno = {i: e["elemento"] for e in mapa["elementos"] for a0, b0 in e["rangos"] for i in range(a0, b0 + 1)}
    es_puntada = lambda i: int(pattern.stitches[i][2]) & pe.COMMAND_MASK == pe.STITCH  # noqa: E731
    conexiones = [(mm(i - 1), mm(i)) for i in range(1, len(pattern.stitches)) if es_puntada(i) and es_puntada(i - 1) and (dueno.get(i) is None or dueno.get(i) != dueno.get(i - 1))]
    for h in nuevos:
        x0, y0, x1, y1 = h["bboxMm"]
        m = HILO_MM
        h["closedByConnection"] = any(min(a[0], b[0]) <= x1 + m and max(a[0], b[0]) >= x0 - m and min(a[1], b[1]) <= y1 + m and max(a[1], b[1]) >= y0 - m for a, b in conexiones)
    return {
        "evaluated": True,
        "attribution": "identity",
        "alignmentUncertaintyMm": u,
        "evaluatedFeatures": evaluadas,
        "componentsLost": perdidas,
        "componentsSplit": partidas,
        "componentsMerged": fusionadas,
        "countersLost": tapados,
        "countersCreated": nuevos,
        "inconclusive": inconclusas,
        "notEvaluated": [],
    }


def _todos_los_tramos(pattern: pe.EmbPattern, mapa: dict[str, Any]) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    """Todo el hilo del DST (de cualquier objeto y de los enlaces), en mm del documento: lo que tapa la tela."""
    dx, dy = mapa["marco"]["dx"], mapa["marco"]["dy"]
    salida = []
    previo = None
    for x, y, c in pattern.stitches:
        k = int(c) & pe.COMMAND_MASK
        p = ((float(x) - dx) / 10, (float(y) - dy) / 10)
        if k == pe.STITCH and previo is not None:
            salida.append((previo, p))
        previo = p if k == pe.STITCH else None
    return salida


def _etiquetas(mascara: Image.Image) -> tuple[array, int]:
    """Componentes (4-conexas) de los píxeles a 255, en UNA pasada (búsqueda en profundidad)."""
    w, h = mascara.size
    datos = mascara.tobytes()
    etiqueta = array("i", bytes(4 * w * h))
    n = 0
    inicio = datos.find(255)
    while inicio >= 0:
        if not etiqueta[inicio]:
            n += 1
            etiqueta[inicio] = n
            pila = [inicio]
            while pila:
                k = pila.pop()
                x = k % w
                for j in ((k - 1) if x > 0 else -1, (k + 1) if x < w - 1 else -1, k - w, k + w):
                    if 0 <= j < w * h and datos[j] == 255 and not etiqueta[j]:
                        etiqueta[j] = n
                        pila.append(j)
        inicio = datos.find(255, inicio + 1)
    return etiqueta, n


#: Resolución de la búsqueda de candidatos a radio libre (px por mm).
PX_DE_CANDIDATOS = 20


def _counters_nuevos(tramos, polos_conocidos: list[tuple[float, ...]], indice: "_Indice") -> list[dict[str, Any]]:
    """Huecos cerrados por el hilo, de counter, que no traían ni el original ni el IR.

    El raster sólo LOCALIZA. Si un hueco es de counter lo dice la MISMA
    regla que un counter perdido, en geometría exacta (las líneas del hilo,
    no sus píxeles): algún punto con radio libre ≥ COUNTER_MINIMO/2 hasta el
    hilo. Erosionar el raster a 0.1 mm no es fiel: entre las filas de un
    tatami el dibujo deja huecos de 1–3 px que sobreviven a la erosión (su
    radio libre real es < 0.08 mm).

      1. Huecos: el hilo (0.4 mm) a 10 px/mm, sin el exterior; componentes
         en una pasada.
      2. Candidatos: los píxeles (a 20 px/mm) que no toca el hilo dibujado
         con 0.05 mm MENOS del radio pedido: todo punto que cumpla la regla
         está entre ellos (el error de dibujo es < 0.05 mm).
      3. Decisión: la distancia EXACTA de cada candidato a las líneas del
         hilo. Sólo cuentan los huecos que no contienen el polo de un counter
         del original o del IR.

    SIN MARGEN DE REDONDEO: el hueco se mide sólo con el DST, que es lo que
    la máquina cose; el redondeo del DST ES la geometría.
    """
    if not tramos:
        return []
    xs = [p[0] for t in tramos for p in t]
    ys = [p[1] for t in tramos for p in t]
    caja = (min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1)
    # Qué está CERRADO lo decide el hilo a 20 px/mm: a 10 px/mm el trazo
    # grueso de Pillow engorda ~0.05 mm por lado y cierra bocas de 0.1 mm.
    px = PX_DE_CANDIDATOS
    fondo = ImageChops.invert(_imagen(tramos, caja, px))
    ImageDraw.floodfill(fondo, (0, 0), 0, thresh=0)  # el exterior (la caja tiene margen)
    etiqueta, n = _etiquetas(fondo)
    if not n:
        return []
    w = fondo.width
    en_hueco = lambda x, y: (lambda i, j: etiqueta[j * w + i] if 0 <= i < w and 0 <= j < fondo.height else 0)(math.floor((x - caja[0]) * px + 1), math.floor((y - caja[1]) * px + 1))  # noqa: E731
    conocidos = {en_hueco(p[0], p[1]) for p in polos_conocidos} - {0}
    exigido = HILO_MEDIO_MM + COUNTER_MINIMO_MM / 2
    candidatos = _imagen(tramos, caja, px, ancho_mm=2 * (exigido - 0.05))
    # El exterior fuera: ensanchar el hilo sólo pone barreras, así que ningún
    # punto de un hueco cerrado queda unido al exterior.
    ImageDraw.floodfill(candidatos, (0, 0), 255, thresh=0)
    datos = candidatos.tobytes()
    cw = candidatos.width
    mejor: dict[int, tuple[float, tuple[float, float]]] = {}
    k = datos.find(0)
    while k >= 0:
        x, y = k % cw, k // cw
        punto = (caja[0] + (x - 1 + 0.5) / px, caja[1] + (y - 1 + 0.5) / px)
        e = etiqueta[k]  # la misma rejilla
        if e and e not in conocidos and (e not in mejor or mejor[e][0] < exigido):
            v = indice.distancia(punto)
            if e not in mejor or v > mejor[e][0]:
                mejor[e] = (v, punto)
        k = datos.find(0, k + 1)
    nuevos = {e for e, (v, _) in mejor.items() if v >= exigido}
    if not nuevos:
        return []
    # Caja y área de los huecos nuevos, en una pasada.
    cajas: dict[int, list[int]] = {}
    for j, e in enumerate(etiqueta):
        if e in nuevos:
            c = cajas.setdefault(e, [j % w, j // w, j % w, j // w, 0])
            x, y = j % w, j // w
            c[0], c[1], c[2], c[3], c[4] = min(c[0], x), min(c[1], y), max(c[2], x), max(c[3], y), c[4] + 1
    salida = []
    for e in sorted(nuevos):
        v, punto = mejor[e]
        x0, y0, x1, y1, area = cajas[e]
        salida.append({
            "bboxMm": [round(caja[0] + (x0 - 1) / px, 2), round(caja[1] + (y0 - 1) / px, 2), round(caja[0] + x1 / px, 2), round(caja[1] + y1 / px, 2)],
            "areaMm2": round(area / (px * px), 3),
            "freeRadiusMm": round(min(v - HILO_MEDIO_MM, 9.99), 3),
            "pole": [round(punto[0], 2), round(punto[1], 2)],
        })
    return salida
