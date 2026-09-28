"""V6.4: el validador de técnica (`tecnica.py`), con casos sintéticos y propiedades.

Sin Ink/Stitch: el DST y el mapa de identidad (qué rangos del DST son de cada
elemento) se escriben a mano. Los casos reales (la estrella, los logos) están
en `pruebas-bordado/v6.4` (TARGETED y E2E).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_tecnica_v64.py'
"""
from __future__ import annotations

import json
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyembroidery as pe  # noqa: E402

import motor  # noqa: E402
import tecnica  # noqa: E402
from test_identidad_v63 import Corrida  # noqa: E402
from test_solape_v5 import V5  # noqa: E402

Punto = tuple[float, float]


def d_de(subtrazos: list[list[Punto]]) -> str:
    return "".join("M" + "L".join(f"{x:.4f} {y:.4f}" for x, y in s) for s in subtrazos)


class Caso:
    """Objetos con su geometría (subtrazos en mm) y sus puntadas propias; un DST y un mapa exactos."""

    def __init__(self) -> None:
        self.objetos: list[dict] = []
        self.geometrias: list[list[list[Punto]]] = []
        self.puntadas: list[list[Punto]] = []

    def agregar(self, tipo: str, subtrazos: list[list[Punto]], puntadas: list[Punto], **stitch) -> "Caso":
        k = len(self.objetos)
        self.objetos.append({"id": f"o{k}", "identity": {"id": f"ir-{k}"}, "stitch": {"type": tipo, **stitch}, "geometry": {"kind": "path", "d": ""}})
        self.geometrias.append(subtrazos)
        self.puntadas.append(puntadas)
        return self

    def transformado(self, f) -> "Caso":
        otro = Caso()
        for o, g, p in zip(self.objetos, self.geometrias, self.puntadas):
            otro.agregar(o["stitch"]["type"], [[f(q) for q in s] for s in g], [f(q) for q in p], **{k: v for k, v in o["stitch"].items() if k != "type"})
        return otro

    def validar(self, incompletos: set[int] | None = None) -> dict:
        patron = pe.EmbPattern()
        elementos = []
        for k, (o, g, puntos) in enumerate(zip(self.objetos, self.geometrias, self.puntadas)):
            o["geometry"]["d"] = d_de(g)
            if patron.stitches:
                patron.add_stitch_absolute(pe.TRIM, *patron.stitches[-1][:2])
            patron.add_stitch_absolute(pe.JUMP, round(puntos[0][0] * 10), round(puntos[0][1] * 10))
            a = len(patron.stitches)
            for x, y in puntos:
                patron.add_stitch_absolute(pe.STITCH, round(x * 10), round(y * 10))
            estado = "sin-verificar" if k in (incompletos or set()) else "completo"
            elementos.append({"elemento": k, "puntadas": len(puntos), "rangos": [[a, len(patron.stitches) - 1]], "verificacion": {"estado": estado}})
        return tecnica.validar(patron, {"marco": {"dx": 0, "dy": 0}, "elementos": elementos}, self.objetos)


def por_id(r: dict, ident: str) -> dict:
    return next(o for o in r["objects"] if o["objectId"] == ident)


def codigos(r: dict, ident: str) -> list[str]:
    return sorted(i["code"] for i in por_id(r, ident)["issues"] if i["severity"] != "info")


# ─── Generadores de puntadas (la forma que les da Ink/Stitch, sin sus remates) ───

def rails(y0: float, y1: float, x0: float = 10, x1: float = 30) -> list[list[Punto]]:
    """Una columna horizontal: rail de arriba, rail de abajo y dos travesaños en las puntas."""
    medio = (x0 + x1) / 2
    return [[(x0, y0), (medio, y0), (x1, y0)], [(x0, y1), (medio, y1), (x1, y1)], [(x0, y0), (x0, y1)], [(x1, y0), (x1, y1)]]


def zigzag(y0: float, y1: float, x0: float = 10, x1: float = 30, paso: float = 0.21, partir: float | None = None) -> list[Punto]:
    """La cubierta de un satin: de un rail al otro cada `paso` (0.42 mm entre piernas iguales).
    Con `partir`, una pasada más larga se parte en tramos colineales (lo que hace el motor)."""
    puntos: list[Punto] = [(x0, y0)]
    x, arriba = x0, False
    while x + paso <= x1 + 1e-9:
        x += paso
        destino = (x, y0 if arriba else y1)
        if partir:
            origen = puntos[-1]
            n = math.ceil(math.dist(origen, destino) / partir)
            puntos += [(origen[0] + (destino[0] - origen[0]) * i / n, origen[1] + (destino[1] - origen[1]) * i / n) for i in range(1, n)]
        puntos.append(destino)
        arriba = not arriba
    return puntos


def a_lo_largo(y0: float, y1: float, x0: float = 10, x1: float = 30) -> list[Punto]:
    """Un satin mal cosido: va y viene a lo largo de la columna, pegado a sus bordes, sin cruzarla."""
    puntos: list[Punto] = []
    for i, y in enumerate([y0 + 0.1, y1 - 0.1] * 3):
        xs = [x0 + 2 * k for k in range(int((x1 - x0) / 2) + 1)]
        puntos += [(x, y) for x in (xs if i % 2 == 0 else xs[::-1])]
    return puntos


def corrido(trazado: list[Punto], paso: float = 2.2, pasadas: int = 1, desvio: float = 0.0) -> list[Punto]:
    """Un corrido por un trazado, `pasadas` veces (ida, vuelta, ida...) y apartado `desvio` mm en y."""
    ida: list[Punto] = [trazado[0]]
    for p, q in zip(trazado, trazado[1:]):
        n = max(1, math.ceil(math.dist(p, q) / paso))
        ida += [(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n) for i in range(1, n + 1)]
    puntos = list(ida)
    for k in range(1, pasadas):
        puntos += (ida[::-1] if k % 2 else ida)[1:]
    return [(x, y + desvio) for x, y in puntos]


def tatami(x0: float, y0: float, x1: float, y1: float, filas: float = 0.45, largo: float = 4.0, hasta: float = 1.0) -> list[Punto]:
    """Un relleno de filas horizontales cada `filas` mm; sólo hasta la fracción `hasta` del alto."""
    puntos: list[Punto] = []
    y, derecha = y0 + filas / 2, True
    while y < y0 + (y1 - y0) * hasta:
        xs = [x0 + 0.2 + i * largo for i in range(int((x1 - x0 - 0.4) / largo) + 1)] + [x1 - 0.2]
        puntos += [(x, y) for x in (xs if derecha else xs[::-1])]
        y += filas
        derecha = not derecha
    return puntos


def cuadrado(x0: float, y0: float, x1: float, y1: float) -> list[list[Punto]]:
    return [[(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]]


SATIN = {"spacingMm": 0.42, "pullCompensationMm": 0.15, "underlay": True}
LINEA = [(10.0, 20.0), (40.0, 20.0)]


def buenos() -> Caso:
    """Un caso de cada técnica bien cosido, separados en el plano."""
    return (
        Caso()
        .agregar("satin", rails(10, 12), zigzag(10, 12), **SATIN)
        .agregar("running", [LINEA], corrido(LINEA), beanRepeats=0)
        .agregar("running", [[(10, 25), (40, 25)]], corrido([(10, 25), (40, 25)], pasadas=3), beanRepeats=1)
        .agregar("fill", cuadrado(50, 10, 60, 20), tatami(50, 10, 60, 20), maxStitchLengthMm=4, spacingMm=0.45)
    )


# ─── Casos sintéticos: bueno contra malo, por técnica ───────────────────

class Satin(unittest.TestCase):
    def test_bueno_no_se_marca(self) -> None:
        r = Caso().agregar("satin", rails(10, 12), zigzag(10, 12), **SATIN).validar()
        o = por_id(r, "o0")
        self.assertEqual(codigos(r, "o0"), [])
        self.assertEqual(o["measurements"]["railCoverage"], 1.0)
        self.assertGreater(o["measurements"]["crossingRatio"], 0.9)

    def test_longitudinal_no_cruza(self) -> None:
        r = Caso().agregar("satin", rails(10, 12), a_lo_largo(10, 12), **SATIN).validar()
        self.assertIn("SATIN_NOT_CROSSING", codigos(r, "o0"))
        x = next(i for i in por_id(r, "o0")["issues"] if i["code"] == "SATIN_NOT_CROSSING")
        # La incidencia lleva su medida, lo esperado, su confianza, objeto y técnica.
        # Sólo las vueltas de las puntas cruzan la columna.
        self.assertLess(x["measurement"]["railCoverage"], 0.2)
        self.assertEqual((x["objectId"], x["irObject"], x["technique"], x["severity"]), ("o0", "ir-0", "satin", "error"))
        self.assertTrue(x["expected"] and 0 < x["confidence"] <= 1)

    def test_cosido_por_el_centro(self) -> None:
        # Cinco veces por el eje de la columna, sin tocar sus bordes (más de dos idas y vueltas): ni cruza ni es underlay.
        centro = [(x, 11.0) for x in range(10, 31, 2)]
        r = Caso().agregar("satin", rails(10, 12), centro + centro[::-1] + centro + centro[::-1] + centro, **SATIN).validar()
        self.assertGreater(por_id(r, "o0")["measurements"]["centerLengthRatio"], 2)
        self.assertEqual(codigos(r, "o0"), ["SATIN_CENTER_EXCESS", "SATIN_NOT_CROSSING"])
        # Un satin bueno con su underlay de centro (ida y vuelta) no se marca.
        r = Caso().agregar("satin", rails(10, 12), centro + centro[::-1] + zigzag(10, 12), **SATIN).validar()
        self.assertEqual(codigos(r, "o0"), [])

    def test_colapsado(self) -> None:
        # Dos rails a 0.1 mm: la columna no tiene ancho.
        r = Caso().agregar("satin", rails(10, 10.1), zigzag(10, 10.1), **SATIN).validar()
        self.assertIn("SATIN_COLLAPSED", codigos(r, "o0"))

    def test_pasada_demasiado_ancha(self) -> None:
        # 9 mm de rail a rail: el motor parte cada pasada en dos tramos colineales.
        r = Caso().agregar("satin", rails(10, 19), zigzag(10, 19, partir=6.3), **SATIN).validar()
        self.assertIn("SATIN_PASS_TOO_WIDE", codigos(r, "o0"))
        # La misma columna a 5 mm está bien.
        r = Caso().agregar("satin", rails(10, 15), zigzag(10, 15), **SATIN).validar()
        self.assertEqual(codigos(r, "o0"), [])

    def test_curva_no_se_penaliza(self) -> None:
        # Un arco de 180° de 2 mm de ancho: rails concéntricos y la cubierta radial.
        n = 60
        r1 = [(20 + 6 * math.cos(math.pi * i / n), 20 - 6 * math.sin(math.pi * i / n)) for i in range(n + 1)]
        r2 = [(20 + 8 * math.cos(math.pi * i / n), 20 - 8 * math.sin(math.pi * i / n)) for i in range(n + 1)]
        puntos = []
        for i in range(0, 6 * n + 1):
            t = math.pi * i / (6 * n)
            rr = 6 if i % 2 == 0 else 8
            puntos.append((20 + rr * math.cos(t), 20 - rr * math.sin(t)))
        r = Caso().agregar("satin", [r1, r2, [r1[0], r2[0]], [r1[-1], r2[-1]]], puntos, **SATIN).validar()
        self.assertEqual(codigos(r, "o0"), [])

    def test_pocas_puntadas_es_incierto(self) -> None:
        r = Caso().agregar("satin", rails(10, 12, 10, 11), zigzag(10, 12, 10, 11, paso=0.5), **SATIN).validar()
        self.assertEqual(codigos(r, "o0"), [])
        self.assertIn("TECHNIQUE_UNCERTAIN", [i["code"] for i in por_id(r, "o0")["issues"]])


class Corrido(unittest.TestCase):
    def test_bueno_y_bean_no_se_marcan(self) -> None:
        r = buenos().validar()
        self.assertEqual(codigos(r, "o1"), [])
        self.assertEqual(codigos(r, "o2"), [])
        m = por_id(r, "o1")["measurements"]
        self.assertLess(m["axisDistanceMm"]["p95"], 0.1)
        self.assertEqual(m["passes"]["p50"], 1.0)
        self.assertEqual(por_id(r, "o2")["measurements"]["passes"]["p50"], 3.0)

    def test_fuera_del_eje(self) -> None:
        r = Caso().agregar("running", [LINEA], corrido(LINEA, desvio=1.0), beanRepeats=0).validar()
        self.assertIn("RUNNING_OFF_AXIS", codigos(r, "o0"))

    def test_repaso_absurdo(self) -> None:
        # Siete pasadas donde la técnica pide una.
        r = Caso().agregar("running", [LINEA], corrido(LINEA, pasadas=7), beanRepeats=0).validar()
        self.assertIn("RUNNING_EXCESSIVE_RETRACE", codigos(r, "o0"))
        # Las mismas siete, si es un bean de 3 (1 + 2·3), son lo que pide.
        r = Caso().agregar("running", [LINEA], corrido(LINEA, pasadas=7), beanRepeats=3).validar()
        self.assertEqual(codigos(r, "o0"), [])

    def test_corto_no_juzga_el_repaso(self) -> None:
        # 2 mm cosidos cuatro veces: todo es remate. Incierto, no error.
        linea = [(10.0, 20.0), (12.0, 20.0)]
        r = Caso().agregar("running", [linea], corrido(linea, paso=0.5, pasadas=4), beanRepeats=0).validar()
        self.assertEqual(codigos(r, "o0"), [])
        self.assertIn("retrace", [i["measurement"].get("aspect") for i in por_id(r, "o0")["issues"]])

    def test_trazado_degenerado(self) -> None:
        r = Caso().agregar("running", [[(10.0, 10.0)]], [(10, 10), (10.5, 10), (11, 10), (10.5, 10), (10, 10)], beanRepeats=0).validar()
        self.assertEqual(codigos(r, "o0"), ["RUNNING_DEGENERATE_PATH"])
        self.assertEqual(por_id(r, "o0")["measurements"]["pathLengthMm"], 0)
        self.assertEqual(por_id(r, "o0")["verdict"], "pass")  # un WARNING no cambia el veredicto


class Relleno(unittest.TestCase):
    def test_bueno(self) -> None:
        r = buenos().validar()
        m = por_id(r, "o3")["measurements"]
        self.assertEqual(codigos(r, "o3"), [])
        self.assertGreater(m["interiorCoverage"], 0.97)
        self.assertIn(m["dominantAngleDeg"], (5, 175))
        self.assertGreater(m["directionConcentration"], 0.9)

    def test_irregular(self) -> None:
        r = Caso().agregar("fill", cuadrado(50, 10, 60, 20), tatami(50, 10, 60, 20, hasta=0.35), maxStitchLengthMm=4).validar()
        self.assertIn("FILL_COVERAGE_IRREGULAR", codigos(r, "o0"))


class General(unittest.TestCase):
    def test_puntadas_casi_cero(self) -> None:
        # Un corrido que avanza a 0.1 mm: se amontona.
        r = Caso().agregar("running", [LINEA], corrido(LINEA, paso=0.1), beanRepeats=0).validar()
        self.assertIn("STITCH_NEAR_ZERO", codigos(r, "o0"))
        self.assertEqual(por_id(r, "o0")["verdict"], "pass")

    def test_puntada_interna_larga(self) -> None:
        r = Caso().agregar("running", [LINEA], corrido(LINEA, paso=10), beanRepeats=0).validar()
        self.assertIn("STITCH_INTERNAL_TOO_LONG", codigos(r, "o0"))

    def test_saltos_y_conexiones_internas(self) -> None:
        # Un corrido en tres rangos propios: el 1.º y el 2.º separados por un salto, el 2.º y el 3.º
        # por dos puntadas sin dueño (una conexión cosida, visible).
        p = pe.EmbPattern()
        for x in range(10, 21, 2):
            p.add_stitch_absolute(pe.STITCH, x * 10, 200)
        p.add_stitch_absolute(pe.TRIM, 200, 200)
        p.add_stitch_absolute(pe.JUMP, 240, 200)
        a = len(p.stitches)
        for x in range(24, 31, 2):
            p.add_stitch_absolute(pe.STITCH, x * 10, 200)
        b = len(p.stitches) - 1
        p.add_stitch_absolute(pe.STITCH, 300, 230)
        p.add_stitch_absolute(pe.STITCH, 320, 230)
        c = len(p.stitches)
        for x in range(32, 41, 2):
            p.add_stitch_absolute(pe.STITCH, x * 10, 200)
        mapa = {"marco": {"dx": 0, "dy": 0}, "elementos": [{"elemento": 0, "puntadas": 0, "rangos": [[0, 5], [a, b], [c, len(p.stitches) - 1]]}]}
        o = {"id": "o0", "stitch": {"type": "running", "beanRepeats": 0}, "geometry": {"d": "M10 20L40 20"}}
        m = tecnica.validar(p, mapa, [o])["objects"][0]["measurements"]
        self.assertEqual((m["internalJumps"], m["internalConnections"], m["internalConnectionMm"]), (1, 1, 8.0))
        # El salto no es una puntada: nada de más de 3.3 mm dentro de un rango.
        self.assertEqual(m["longInternalStitches"], 0)

    def test_sin_identidad_entera_no_es_error(self) -> None:
        r = Caso().agregar("satin", rails(10, 12), a_lo_largo(10, 12), **SATIN).validar(incompletos={0})
        o = por_id(r, "o0")
        self.assertEqual(o["verdict"], "pass")
        self.assertIn("TECHNIQUE_UNCERTAIN", [i["code"] for i in o["issues"]])


# ─── Propiedades ─────────────────────────────────────────────────────────

def todos_los_malos() -> Caso:
    return (
        Caso()
        .agregar("satin", rails(10, 12), a_lo_largo(10, 12), **SATIN)
        .agregar("satin", rails(30, 39), zigzag(30, 39, partir=6.3), **SATIN)
        .agregar("running", [LINEA], corrido(LINEA, pasadas=7), beanRepeats=0)
        .agregar("running", [[(10, 50), (40, 50)]], corrido([(10, 50), (40, 50)], desvio=1.0), beanRepeats=0)
        .agregar("fill", cuadrado(50, 10, 60, 20), tatami(50, 10, 60, 20, hasta=0.35), maxStitchLengthMm=4)
    )


def resumen(r: dict) -> dict:
    return {o["objectId"]: (o["verdict"], sorted(i["code"] for i in o["issues"])) for o in r["objects"]}


class Propiedades(unittest.TestCase):
    def test_traslacion(self) -> None:
        for caso in (buenos(), todos_los_malos()):
            a = caso.validar()
            # En múltiplos de 0.1 mm (la resolución del DST) la traslación es exacta.
            b = caso.transformado(lambda p: (p[0] + 37.3, p[1] - 12.8)).validar()
            self.assertEqual(resumen(a), resumen(b))
            for oa, ob in zip(a["objects"], b["objects"]):
                for clave in ("railCoverage", "crossingRatio", "retraceRatio", "longPassRatio"):
                    self.assertEqual(oa["measurements"].get(clave), ob["measurements"].get(clave), clave)
                if oa["technique"] == "fill":
                    self.assertAlmostEqual(oa["measurements"]["interiorCoverage"], ob["measurements"]["interiorCoverage"], delta=0.02)

    def test_rotacion(self) -> None:
        for angulo in (90, 30, 137):
            c, s = math.cos(math.radians(angulo)), math.sin(math.radians(angulo))
            gira = lambda p: (100 + (p[0] - 40) * c - (p[1] - 30) * s, 100 + (p[0] - 40) * s + (p[1] - 30) * c)  # noqa: E731
            for caso in (buenos(), todos_los_malos()):
                a, b = caso.validar(), caso.transformado(gira).validar()
                self.assertEqual(resumen(a), resumen(b), f"{angulo}°")
                for oa, ob in zip(a["objects"], b["objects"]):
                    if oa["technique"] == "satin":
                        self.assertAlmostEqual(oa["measurements"]["railCoverage"], ob["measurements"]["railCoverage"], delta=0.05)
                        self.assertAlmostEqual(oa["measurements"]["coverPassMm"]["p50"], ob["measurements"]["coverPassMm"]["p50"], delta=0.15)
                    if oa["technique"] == "fill":
                        self.assertAlmostEqual(oa["measurements"]["interiorCoverage"], ob["measurements"]["interiorCoverage"], delta=0.05)
                        # La dirección dominante gira con el diseño (módulo 180°, con los 10° del histograma).
                        giro = (oa["measurements"]["dominantAngleDeg"] + angulo - ob["measurements"]["dominantAngleDeg"]) % 180
                        self.assertLessEqual(min(giro, 180 - giro), 10)

    def test_escala_en_mm(self) -> None:
        # La técnica se mide en mm físicos, no es invariante a escala: el mismo satin x4 es demasiado ancho.
        chico = Caso().agregar("satin", rails(10, 12), zigzag(10, 12), **SATIN)
        grande = Caso().agregar("satin", rails(10, 18), zigzag(10, 18, partir=6.3), **SATIN)
        self.assertEqual(codigos(chico.validar(), "o0"), [])
        self.assertIn("SATIN_PASS_TOO_WIDE", codigos(grande.validar(), "o0"))
        # Y un satin bueno de 2 mm dibujado 50 veces más chico colapsa.
        mini = Caso().agregar("satin", rails(10, 10.04, 10, 30), zigzag(10, 10.04, 10, 30), **SATIN)
        self.assertIn("SATIN_COLLAPSED", codigos(mini.validar(), "o0"))

    def test_puntadas_ajenas_no_cambian_a(self) -> None:
        # Técnica(A) con B encima (un corrido y un satin mal cosido sobre la columna de A) = Técnica(A) sola.
        sola = Caso().agregar("satin", rails(10, 12), zigzag(10, 12), **SATIN).validar()
        con_b = (
            Caso()
            .agregar("satin", rails(10, 12), zigzag(10, 12), **SATIN)
            .agregar("running", [[(10, 11), (30, 11)]], corrido([(10, 11), (30, 11)], pasadas=9), beanRepeats=0)
            .agregar("satin", rails(10, 12), a_lo_largo(10, 12), **SATIN)
            .validar()
        )
        self.assertEqual(json.dumps(por_id(sola, "o0"), sort_keys=True), json.dumps(por_id(con_b, "o0"), sort_keys=True))
        self.assertEqual(con_b["failed"], ["o1", "o2"])

    def test_determinista(self) -> None:
        a = json.dumps(todos_los_malos().validar(), sort_keys=True)
        b = json.dumps(todos_los_malos().validar(), sort_keys=True)
        self.assertEqual(a, b)

    def test_cada_malo_lo_detecta_su_regla(self) -> None:
        r = todos_los_malos().validar()
        self.assertEqual(
            {o: [c for c in cs if c != "TECHNIQUE_UNCERTAIN"] for o, (_, cs) in resumen(r).items()},
            {"o0": ["SATIN_NOT_CROSSING"], "o1": ["SATIN_PASS_TOO_WIDE"], "o2": ["RUNNING_EXCESSIVE_RETRACE"], "o3": ["RUNNING_OFF_AXIS"], "o4": ["FILL_COVERAGE_IRREGULAR"]},
        )
        self.assertEqual(buenos().validar()["failed"], [])


# ─── El veredicto del motor ──────────────────────────────────────────────

class Veredicto(unittest.TestCase):
    def design(self) -> dict:
        return {"profileVersion": V5, "objects": []}

    def test_error_de_tecnica_es_review_por_tecnica(self) -> None:
        tec = todos_los_malos().validar()
        issues = motor.quality_issues(self.design(), {}, {"technique": tec})
        self.assertTrue(issues and all(i["category"] == "technique" and i["severity"] == "review" for i in issues))
        x = next(i for i in issues if i["code"] == "SATIN_NOT_CROSSING")
        self.assertEqual((x["objectId"], x["technique"]), ("o0", "satin"))
        self.assertIn("railCoverage", x["measurement"])
        self.assertEqual(motor.categoria(x), "technique")
        self.assertEqual(motor.categoria({"code": "TOPOLOGY_COMPONENT_LOST"}), "structure")
        self.assertEqual(motor.categoria({"code": "TOO_MANY_JUMPS"}), "plan")
        self.assertEqual(motor.categoria({"code": "LOOP_BROKEN", "source": "SERVER_STRUCTURAL"}), "structure")

    def test_estructura_bien_tecnica_mal(self) -> None:
        # STRUCTURE PASS (verdad evaluada, nada perdido) con TECHNIQUE FAIL: REVIEW sólo por técnica.
        verdad = {"evaluated": True, "componentsLost": [], "countersLost": [], "componentsSplit": [], "componentsMerged": [], "countersCreated": [], "inconclusive": []}
        issues = motor.quality_issues(self.design(), {}, {"structuralTruth": verdad, "technique": todos_los_malos().validar()})
        self.assertEqual({motor.categoria(i) for i in issues}, {"technique"})

    def test_warning_e_info_no_cambian_el_estado(self) -> None:
        r = Caso().agregar("running", [LINEA], corrido(LINEA, paso=0.1), beanRepeats=0).agregar("satin", rails(10, 12, 10, 11), zigzag(10, 12, 10, 11, paso=0.5), **SATIN).validar()
        self.assertEqual(motor.quality_issues(self.design(), {}, {"technique": r}), [])
        todas = motor.issues_de_tecnica(r)
        self.assertEqual(sorted(i["code"] for i in todas), ["STITCH_NEAR_ZERO", "TECHNIQUE_UNCERTAIN"])
        self.assertTrue(all(i["severity"] == "info" for i in todas))

    def test_razones_de_revision_por_parte(self) -> None:
        issues = [
            {"code": "TOPOLOGY_COMPONENT_MERGED", "severity": "review", "source": "SERVER_STRUCTURAL"},
            *motor.quality_issues(self.design(), {}, {"technique": todos_los_malos().validar()}),
            {"code": "TOO_MANY_JUMPS", "severity": "review"},
            {"code": "OBJECT_NOT_STITCHED", "severity": "info"},
        ]
        r = motor.razones_de_revision(issues)
        self.assertEqual(r["structure"], ["TOPOLOGY_COMPONENT_MERGED"])
        self.assertEqual(r["plan"], ["TOO_MANY_JUMPS"])
        self.assertEqual(r["technique"], ["FILL_COVERAGE_IRREGULAR", "RUNNING_EXCESSIVE_RETRACE", "RUNNING_OFF_AXIS", "SATIN_NOT_CROSSING", "SATIN_PASS_TOO_WIDE"])

    def test_con_el_mapa_de_identidad_real(self) -> None:
        # El mapa de `identidad.mapear` (marco de Ink/Stitch, conexiones sin dueño): A bien y B mal, cada uno con lo suyo.
        buena, mala = zigzag(9, 11), a_lo_largo(19, 21)
        c = Corrida([buena, mala], enlaces={1: [(30, 12), (10, 18)]})
        objetos = [
            {"id": "a", "stitch": {"type": "satin", **SATIN}, "geometry": {"d": d_de(rails(9, 11))}},
            {"id": "b", "stitch": {"type": "satin", **SATIN}, "geometry": {"d": d_de(rails(19, 21))}},
        ]
        r = tecnica.validar(c.pattern, c.mapa(), objetos)
        self.assertEqual(r["failed"], ["b"])
        self.assertEqual(codigos(r, "b"), ["SATIN_NOT_CROSSING"])
        self.assertEqual(por_id(r, "a")["measurements"]["railCoverage"], 1.0)

    def test_otros_perfiles_no_juzgan_tecnica(self) -> None:
        self.assertEqual(motor.quality_issues({"profileVersion": "otro"}, {}, {"technique": todos_los_malos().validar()}), [])


if __name__ == "__main__":
    unittest.main()
