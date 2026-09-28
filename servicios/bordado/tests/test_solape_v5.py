"""El solape de v5 separa la técnica de la puntada del solape de verdad.

Patrones sintéticos, sin Ink/Stitch: las puntadas se escriben a mano con la
forma que Ink/Stitch les da (remates de cuatro puntadas cortas de ida y
vuelta, bean que repite cada puntada, center-walk que va y vuelve), y el
diseño es el que las produciría. Así cada prueba aísla un caso.

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_solape_v5.py'
"""
from __future__ import annotations

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyembroidery as pe  # noqa: E402

import motor  # noqa: E402
from quality import analyze_overlap_breakdown, analyze_stitch_plan, atribuir_puntadas, cobertura_de_estructura  # noqa: E402

V5 = "experimental-vector-v5-2026-09-25"
V4 = "experimental-hybrid-v4-2026-09-06"


def objeto(ident: str, tipo: str, d: str, *, corta: bool = False, color: str = "c0", **stitch) -> dict:
    return {"id": ident, "colorId": color, "geometry": {"kind": "path", "d": d}, "stitch": {"type": tipo, "trimAfter": corta, **stitch}}


class Patron:
    """Un DST a mano, en mm."""

    def __init__(self) -> None:
        self.p = pe.EmbPattern()

    def puntada(self, x: float, y: float) -> "Patron":
        self.p.add_stitch_absolute(pe.STITCH, round(x * 10), round(y * 10))
        return self

    def corte(self) -> "Patron":
        self.p.add_stitch_absolute(pe.TRIM, *self._ultima())
        return self

    def salto(self, x: float, y: float) -> "Patron":
        self.p.add_stitch_absolute(pe.JUMP, round(x * 10), round(y * 10))
        return self

    def _ultima(self) -> tuple[int, int]:
        x, y, _ = self.p.stitches[-1]
        return int(x), int(y)

    def remate(self, x: float, y: float, dx: float, dy: float) -> "Patron":
        """Cuatro puntadas cortas de ida y vuelta, como las de Ink/Stitch."""
        for k in (0, 1, 0, 1, 0):
            self.puntada(x + dx * k, y + dy * k)
        return self

    def recta(self, a: tuple[float, float], b: tuple[float, float], paso: float = 2.0, bean: bool = False) -> "Patron":
        n = max(1, math.ceil(math.dist(a, b) / paso))
        puntos = [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n + 1)]
        for i in range(1, len(puntos)):
            self.puntada(*puntos[i])
            if bean:
                self.puntada(*puntos[i - 1])
                self.puntada(*puntos[i])
        return self


def medir(patron: Patron, objetos: list[dict], perfil: str = V5) -> tuple[dict, list[str]]:
    detalle: dict = {}
    plan = analyze_stitch_plan(patron.p, detalle=detalle)
    plan["overlapBreakdown"] = analyze_overlap_breakdown(patron.p, objetos, detalle)
    codigos = [i["code"] for i in motor.quality_issues({"profileVersion": perfil, "objects": objetos}, {}, plan)]
    return plan, codigos


def corrido_con_remates(patron: Patron, a: tuple[float, float], b: tuple[float, float], *, bean: bool, pasadas: int = 1) -> Patron:
    patron.puntada(*a).remate(a[0], a[1], 0.4, 0)
    ida = True
    for _ in range(pasadas):
        patron.recta(a if ida else b, b if ida else a, bean=bean)
        ida = not ida
    fin = b if pasadas % 2 else a
    return patron.remate(fin[0], fin[1], -0.4 if pasadas % 2 else 0.4, 0)


class SolapeV5(unittest.TestCase):
    def test_bean_no_dispara_solape(self):
        objetos = [objeto("r", "running", "M10 10 L30 10", beanRepeats=1)]
        plan, codigos = medir(corrido_con_remates(Patron(), (10, 10), (30, 10), bean=True), objetos)
        self.assertLess(plan["overlapBreakdown"]["realOverlapDensity"], 0.01)
        self.assertNotIn("EXCESSIVE_OVERLAP", codigos)

    def test_corrido_triple_de_ida_y_vuelta_no_dispara_solape(self):
        # Un corrido que recorre su trazo tres veces (ida, vuelta, ida): un
        # solo objeto, una sola trayectoria. El overlapDensity de antes lo
        # contaba entero.
        objetos = [objeto("r", "running", "M10 10 L30 10 L10 10 L30 10")]
        plan, codigos = medir(corrido_con_remates(Patron(), (10, 10), (30, 10), bean=False, pasadas=3), objetos)
        self.assertGreater(plan["overlapDensity"], 0.25)
        desglose = plan["overlapBreakdown"]
        self.assertGreater(desglose["intentionalRunningRetraceMm"], 10)
        self.assertLess(desglose["realOverlapDensity"], 0.01)
        self.assertNotIn("EXCESSIVE_OVERLAP", codigos)

    def test_remates_no_disparan_solape(self):
        # Corridos cortos con sus remates: casi todo lo que se pisa es el nudo.
        patron = Patron()
        objetos = []
        for k in range(6):
            y = 10 + 3 * k
            corrido_con_remates(patron, (10, y), (12, y), bean=False)
            patron.corte()
            objetos.append(objeto(f"r{k}", "running", f"M10 {y} L12 {y}", corta=k < 5))
        plan, codigos = medir(patron, objetos)
        desglose = plan["overlapBreakdown"]
        self.assertEqual(desglose["attribution"]["method"], "cortes")
        self.assertGreater(desglose["tieInTieOffMm"], 0)
        self.assertLess(desglose["realOverlapDensity"], 0.01)
        self.assertNotIn("EXCESSIVE_OVERLAP", codigos)

    def test_dos_corridos_distintos_si_solapan(self):
        # El mismo trazo en dos objetos seguidos, sin corte: la vuelta es del
        # segundo aunque pise al primero.
        patron = Patron().puntada(10, 10).recta((10, 10), (30, 10)).recta((30, 10), (10, 10))
        objetos = [objeto("a", "running", "M10 10 L30 10"), objeto("b", "running", "M30 10 L10 10")]
        plan, codigos = medir(patron, objetos)
        desglose = plan["overlapBreakdown"]
        self.assertGreater(desglose["realCrossObjectMm"], 10)
        self.assertGreater(desglose["realOverlapDensity"], 0.25)
        self.assertIn("EXCESSIVE_OVERLAP", codigos)

    def test_relleno_duplicado_si_solapa(self):
        patron = Patron()
        objetos = []
        for k in range(2):
            patron.puntada(10, 10)
            for fila in range(11):
                y = 10 + fila * 0.5
                patron.recta((10, y), (20, y)) if fila % 2 == 0 else patron.recta((20, y), (10, y))
                if fila < 10:
                    patron.puntada(20 if fila % 2 == 0 else 10, y + 0.5)
            patron.corte()
            objetos.append(objeto(f"f{k}", "fill", "M10 10 L20 10 L20 15 L10 15 Z", corta=k == 0))
        plan, codigos = medir(patron, objetos)
        desglose = plan["overlapBreakdown"]
        self.assertGreater(desglose["realCrossObjectMm"], 50)
        self.assertGreater(desglose["duplicateObjectOverlapMm2"], 40)
        self.assertIn("EXCESSIVE_OVERLAP", codigos)

    def test_satin_duplicado_si_solapa(self):
        patron = Patron()
        objetos = []
        rails = "M10 10 L30 10 M10 12 L30 12"
        for k in range(2):
            x = 10.0
            patron.puntada(x, 10)
            while x < 30:
                patron.puntada(x, 12)
                x = min(30.0, x + 0.4)
                patron.puntada(x, 10)
            patron.corte()
            objetos.append(objeto(f"s{k}", "satin", rails, corta=k == 0, satinMode="rails", underlay=False))
        plan, codigos = medir(patron, objetos)
        self.assertGreater(plan["overlapBreakdown"]["realCrossObjectMm"], 50)
        self.assertIn("EXCESSIVE_OVERLAP", codigos)

    def test_center_walk_del_mismo_satin_no_dispara(self):
        # Underlay: va por el eje hasta el final y vuelve. Luego la cubierta.
        patron = Patron().puntada(10, 11)
        patron.recta((10, 11), (30, 11)).recta((30, 11), (10, 11))
        x = 10.0
        while x < 30:
            patron.puntada(x, 10)
            patron.puntada(x, 12)
            x += 0.4
        objetos = [objeto("s", "satin", "M10 10 L30 10 M10 12 L30 12", satinMode="rails", underlay=True)]
        plan, codigos = medir(patron, objetos)
        desglose = plan["overlapBreakdown"]
        self.assertGreaterEqual(desglose["underlayRetraceMm"], 8)
        self.assertLess(desglose["realOverlapDensity"], 0.01)
        self.assertNotIn("EXCESSIVE_OVERLAP", codigos)

    def test_v4_sigue_con_la_medida_de_siempre(self):
        objetos = [objeto("r", "running", "M10 10 L30 10 L10 10 L30 10")]
        patron = corrido_con_remates(Patron(), (10, 10), (30, 10), bean=False, pasadas=3)
        _, codigos = medir(patron, objetos, perfil=V4)
        self.assertIn("EXCESSIVE_OVERLAP", codigos)

    def test_atribucion_ancla_en_los_cortes(self):
        patron = Patron()
        corrido_con_remates(patron, (10, 10), (20, 10), bean=False).corte()
        corrido_con_remates(patron, (10, 20), (20, 20), bean=False)
        objetos = [objeto("a", "running", "M10 10 L20 10", corta=True), objeto("b", "running", "M10 20 L20 20")]
        atribucion = atribuir_puntadas(patron.p, objetos)
        self.assertEqual(atribucion["method"], "cortes")
        duenos = [atribucion["owner"][o] for o in sorted(atribucion["owner"])]
        self.assertEqual(duenos, sorted(duenos))
        self.assertEqual(set(duenos), {0, 1})

    def test_traslado_oculto_no_sube_el_umbral_de_saltos(self):
        objetos = [objeto(f"o{k}", "running", "M0 0 L1 0") for k in range(40)]
        objetos += [{**objeto(f"t{k}", "running", "M0 0 L1 0"), "role": "travel"} for k in range(40)]
        plan = {"jumps": 31, "stitchCount": 1000}
        codigos = [i["code"] for i in motor.quality_issues({"profileVersion": V5, "objects": objetos}, {}, plan)]
        self.assertIn("TOO_MANY_JUMPS", codigos)


class EstructuraEnElDst(unittest.TestCase):
    """El eje de una estructura fina contra lo que de verdad cosió el DST."""

    def test_eje_cosido_cuenta_como_cubierto(self):
        objetos = [objeto("r", "running", "M10 10 L30 10")]
        patron = corrido_con_remates(Patron(), (10, 10), (30, 10), bean=False)
        c = cobertura_de_estructura(patron.p, objetos, [{"id": "g", "ejes": ["M10 10L30 10"]}])
        self.assertGreater(c["coverageRatio"], 0.95)
        self.assertEqual(c["incomplete"], [])

    def test_estructura_sin_hilo_es_incompleta_y_va_a_revision(self):
        # La fuente tenía dos trazos; la adaptación perdió uno y el diseño
        # (y su DST) sólo tienen el otro.
        objetos = [objeto("a", "running", "M10 10 L30 10")]
        patron = corrido_con_remates(Patron(), (10, 10), (30, 10), bean=False)
        estructura = [{"id": "a", "ejes": ["M10 10L30 10"]}, {"id": "b", "ejes": ["M10 20L30 20"]}]
        c = cobertura_de_estructura(patron.p, objetos, estructura)
        self.assertEqual(c["incomplete"], ["b"])
        codigos = [i["code"] for i in motor.quality_issues({"profileVersion": V5, "objects": objetos}, {}, {"strokeCoverage": c})]
        self.assertIn("THIN_STRUCTURE_INCOMPLETE", codigos)


if __name__ == "__main__":
    unittest.main()
