"""V6.7.0: dónde entra la aguja en un corrido fino (FAST).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_puntadas_v670.py'
"""
from __future__ import annotations

import math
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402
import puntadas as pt  # noqa: E402
import reparacion as rep  # noqa: E402
import test_cobertura_v643 as t  # noqa: E402
import test_reparacion_v641 as t41  # noqa: E402


def circulo(r: float, n: int = 400, c: tuple[float, float] = (0.0, 0.0)) -> list[tuple[float, float]]:
    return [(c[0] + r * math.cos(2 * math.pi * i / n), c[1] + r * math.sin(2 * math.pi * i / n)) for i in range(n)] + [(c[0] + r, c[1])]


def largos(p: list[tuple[float, float]]) -> list[float]:
    return [math.dist(a, b) for a, b in zip(p, p[1:])]


class Reparto(unittest.TestCase):
    def test_una_o_sale_pareja_y_centrada(self) -> None:
        # Una "O" de 2.6 mm: puntadas iguales, ninguna por debajo de la mínima, y
        # el hilo a los dos lados del eje (radio medio = el del eje), no todo dentro.
        p = pt.penetraciones(circulo(1.3), 2.2)
        l = largos(p)
        media = sum(l) / len(l)
        self.assertLess(max(abs(x - media) for x in l) / media, 0.1)
        self.assertGreaterEqual(min(l), pt.PUNTADA_MINIMA_MM - 1e-6)
        radios = [math.hypot(*q) for q in p[1:-1]]
        medios = [math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for a, b in zip(p, p[1:])]
        self.assertGreater(min(radios), 1.3)
        self.assertLess(max(medios), 1.3)
        self.assertLess(max(max(radios) - 1.3, 1.3 - min(medios)), pt.FLECHA_MM)

    def test_mas_puntadas_que_ink_stitch_en_curva(self) -> None:
        # Con flecha de un octavo de hilo, una "O" de 2.6 mm lleva más de 9 lados
        # (lo que da la tolerancia de 0.1 mm con los vértices sobre el eje).
        self.assertGreater(len(pt.penetraciones(circulo(1.3), 2.2)) - 1, 9)

    def test_en_recto_puntadas_iguales_de_hasta_el_largo(self) -> None:
        p = pt.penetraciones([(0.0, 0.0), (10.0, 0.0)], 2.2)
        self.assertEqual(len(p) - 1, math.ceil(10 / 2.2))
        for x in largos(p):
            self.assertAlmostEqual(x, 10 / 5, delta=0.03)

    def test_la_esquina_lleva_puntada(self) -> None:
        # Una "L": la aguja entra en el vértice, no lo redondea.
        eje = [(0.0, 3.0), (0.0, 0.0), (3.0, 0.0)]
        p = pt.penetraciones(eje, 2.2)
        self.assertLess(min(math.dist(q, (0.0, 0.0)) for q in p), 0.03)

    def test_los_extremos_no_se_mueven(self) -> None:
        eje = [(i / 20, 0.4 * math.sin(i / 20)) for i in range(80)]
        p = pt.penetraciones(eje, 2.2)
        self.assertEqual(p[0], eje[0])
        self.assertEqual(p[-1], eje[-1])

    def test_en_una_curva_cerrada_manda_la_tolerancia(self) -> None:
        # Radio 0.35 mm: con la mínima de 0.6 la cuerda se saldría ~0.13 mm del eje;
        # con la tolerancia del corrido (0.1) la puntada se acorta, no más que casi cero.
        # Las dos de las puntas son las del remate (ver el test siguiente): la tolerancia, en las de dentro.
        eje = circulo(0.35, 300)
        p = pt.penetraciones(eje, 2.2, tolerancia=0.1)
        dentro = p[1:-1]
        medios = [math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for a, b in zip(dentro, dentro[1:])]
        radios = [math.hypot(*q) for q in dentro]
        self.assertLessEqual(max(0.35 - min(medios), max(radios) - 0.35), 0.1 + 1e-6)
        self.assertGreaterEqual(min(largos(p)), pt.PUNTADA_CASI_CERO_MM - 1e-6)

    def test_la_primera_y_la_ultima_dan_para_el_remate(self) -> None:
        # Un arco cerrado (radio 0.5 mm, 2.5 mm de largo) con la tolerancia de 0.1: sin la regla, la
        # primera puntada sale de ~0.4 mm y el remate de Ink/Stitch se iría en recta al nodo siguiente.
        eje = [(0.5 * math.sin(i / 100 * 5), 0.5 - 0.5 * math.cos(i / 100 * 5)) for i in range(101)]
        p = pt.penetraciones(eje, 2.2, tolerancia=0.1)
        l = largos(p)
        self.assertGreaterEqual(l[0], pt.REMATE_MINIMO_MM - 1e-6)
        self.assertGreaterEqual(l[-1], pt.REMATE_MINIMO_MM - 1e-6)

    def test_no_centra_hacia_otra_pieza(self) -> None:
        # Otra pieza a 0.45 mm por fuera de la "O", a la derecha: ahí el vértice se queda en el eje.
        vecina = (1.3 + 0.45, 0.0)
        holgura = lambda q: math.dist(q, vecina)  # noqa: E731
        cerca = pt.penetraciones(circulo(1.3), 2.2, holgura=holgura)
        # Del lado de la vecina, en el eje (sin centrar); del otro lado sí se centra.
        derecha = [q for q in cerca[1:-1] if q[0] > 1.0]
        self.assertTrue(derecha)
        self.assertTrue(all(math.hypot(*q) <= 1.3 + 1e-3 for q in derecha))
        self.assertTrue(any(math.hypot(*q) > 1.3 + 1e-3 for q in cerca[1:-1] if q[0] < 0))

    def test_un_corrido_mas_corto_que_la_minima_es_una_puntada(self) -> None:
        self.assertEqual(pt.penetraciones([(0.0, 0.0), (0.2, 0.1), (0.4, 0.0)], 2.2), [(0.0, 0.0), (0.4, 0.0)])


def corrido(reparto: str | None, tipo: str = "running") -> dict:
    o = t41.objeto("L", tipo, rep.d_de([[(10.0, 30.0), (20.0, 30.0), (20.0, 35.0)]]))
    o["stitch"]["toleranceMm"] = 0.1 if tipo == "running" else None
    if o["stitch"]["toleranceMm"] is None:
        del o["stitch"]["toleranceMm"]
    if reparto is not None:
        o["stitch"]["placement"] = reparto
    return t.diseno([o], [{"id": "p-L", "anillos": [t.rect(10, 29.8, 20, 30.2)]}])


class EnElMotor(unittest.TestCase):
    def test_con_placement_cada_nodo_es_una_puntada(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            svg = Path(d) / "a.svg"
            motor.build_svg(corrido("curvatura"), svg)
            texto = svg.read_text()
            # Los nodos son las puntadas: tolerancia casi cero (no el modo manual, que no pone remates).
            self.assertNotIn("manual_stitch", texto)
            self.assertIn(f'inkstitch:running_stitch_tolerance_mm="{motor.TOLERANCIA_DE_NODOS_MM}"', texto)
            path = re.search(r'<path id="[^"]*" d="([^"]+)"', texto).group(1)
            # 10 mm en recto (5 puntadas) + la esquina + 5 mm (3 puntadas): 9 nodos.
            self.assertEqual(len(re.findall(r"[ML]", path)), 9)

    def test_un_eje_de_un_punto_se_cose_como_venia(self) -> None:
        o = t41.objeto("P", "running", "M10 30L10 30")
        o["stitch"]["placement"] = "curvatura"
        self.assertIsNone(motor.puntadas_de(o))

    def test_sin_placement_como_siempre(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            svg = Path(d) / "a.svg"
            motor.build_svg(corrido(None), svg)
            texto = svg.read_text()
            self.assertNotIn("manual_stitch", texto)
            self.assertIn('inkstitch:running_stitch_length_mm="2.2"', texto)

    def test_solo_curvatura_y_solo_en_corridos(self) -> None:
        for mal in (corrido("curvatura", "fill"), corrido("a-ojo")):
            with self.assertRaises(ValueError):
                motor.validate_design(mal, "", canonical_hash_verified=True)


if __name__ == "__main__":
    unittest.main()
