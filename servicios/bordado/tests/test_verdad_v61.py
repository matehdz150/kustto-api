"""V6.1: la verdad estructural ORIGINAL buscada en el DST.

Patrones sintéticos, sin Ink/Stitch: un DST escrito a mano y la verdad que
mandaría la preparación (sondas de cada pieza, polo de cada counter). Cada
prueba aísla un caso: la pieza está, falta, el counter se tapa, y la
alineación DST-diseño no permite afirmarlo.

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_verdad_v61.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402
from quality import topologia_en_dst  # noqa: E402
from test_solape_v5 import V5, Patron, objeto  # noqa: E402


def barra(patron: Patron, y: float, x0: float = 10, x1: float = 30) -> Patron:
    """Un satin horizontal de 2 mm de alto hecho a zigzag (0.4 mm de paso)."""
    x = x0
    arriba = True
    patron.puntada(x0, y - 1)
    while x <= x1:
        patron.puntada(x, y - 1 if arriba else y + 1)
        arriba = not arriba
        x += 0.4
    return patron


def verdad(componentes: list[dict], counters: list[dict] | None = None) -> list[dict]:
    return [{"id": "o0", "origen": "svg", "resolucionMm": 0.03, "componentes": componentes, "counters": counters or []}]


def pieza(ident: str, y: float, *, en_ir: str = "conservada", incierto: bool = False) -> dict:
    return {"id": ident, "sondas": [[x, y] for x in (12, 16, 20, 24, 28)], "anchoMm": 2, "incierto": incierto, "enIR": en_ir}


def codigos(plan: dict) -> list[str]:
    return [i["code"] for i in motor.quality_issues({"profileVersion": V5, "objects": []}, {}, plan)]


class VerdadEnDst(unittest.TestCase):
    def setUp(self) -> None:
        # Dos barras en el diseño; el objeto de cada una define la caja del diseño.
        self.objetos = [
            objeto("a", "satin", "M10 9 L30 9 M10 11 L30 11"),
            objeto("b", "satin", "M10 19 L30 19 M10 21 L30 21"),
        ]

    def test_pieza_cosida_no_es_perdida(self):
        p = barra(barra(Patron(), 10).salto(10, 19), 20)
        r = topologia_en_dst(p.p, self.objetos, verdad([pieza("a", 10), pieza("b", 20)]))
        self.assertTrue(r["evaluated"])
        self.assertEqual(r["componentsLost"], [])
        self.assertEqual(r["inconclusive"], [])
        self.assertNotIn("TOPOLOGY_COMPONENT_LOST", codigos({"structuralTruth": r}))

    def test_pieza_sin_hilo_es_perdida_en_el_dst(self):
        # El DST sólo cose la barra de arriba, pero la caja de las puntadas
        # coincide con la del diseño (un punto suelto abajo): la alineación es
        # buena y la ausencia se afirma.
        p = barra(Patron(), 10).salto(10, 21).puntada(10, 21).salto(30, 21).puntada(30, 21)
        r = topologia_en_dst(p.p, self.objetos, verdad([pieza("a", 10), pieza("b", 20)]))
        self.assertEqual([x["id"] for x in r["componentsLost"]], ["b"])
        self.assertIn("TOPOLOGY_COMPONENT_LOST", codigos({"structuralTruth": r}))

    def test_lo_que_ya_diverge_en_el_ir_no_se_juzga_otra_vez(self):
        p = barra(Patron(), 10).salto(10, 21).puntada(10, 21).salto(30, 21).puntada(30, 21)
        r = topologia_en_dst(p.p, self.objetos, verdad([pieza("a", 10), pieza("b", 20, en_ir="divergente")]))
        self.assertEqual(r["componentsLost"], [])
        self.assertEqual(r["evaluatedFeatures"]["components"], 1)

    def test_pieza_incierta_sin_hilo_es_inconclusa(self):
        p = barra(Patron(), 10).salto(10, 21).puntada(10, 21).salto(30, 21).puntada(30, 21)
        r = topologia_en_dst(p.p, self.objetos, verdad([pieza("a", 10), pieza("b", 20, incierto=True)]))
        self.assertEqual(r["componentsLost"], [])
        self.assertEqual([x["id"] for x in r["inconclusive"]], ["b"])
        self.assertIn("STRUCTURE_UNCERTAIN", codigos({"structuralTruth": r}))

    def test_counter_tapado(self):
        # Un anillo con su counter en (20, 20): el DST pasa hilo por el centro.
        objetos = [objeto("o", "fill", "M16 16 L24 16 L24 24 L16 24 Z")]
        p = Patron().puntada(16, 16).puntada(24, 16).puntada(24, 24).puntada(16, 24).puntada(16, 16).puntada(20, 20).puntada(24, 20)
        r = topologia_en_dst(p.p, objetos, verdad([], [{"id": "h", "polo": [20, 20], "anchoMm": 3, "incierto": False, "enIR": "conservada"}]))
        self.assertEqual([x["id"] for x in r["countersLost"]], ["h"])
        self.assertIn("TOPOLOGY_HOLE_LOST", codigos({"structuralTruth": r}))

    def test_counter_abierto(self):
        objetos = [objeto("o", "fill", "M16 16 L24 16 L24 24 L16 24 Z")]
        p = Patron().puntada(16, 16).puntada(24, 16).puntada(24, 24).puntada(16, 24).puntada(16, 16)
        r = topologia_en_dst(p.p, objetos, verdad([], [{"id": "h", "polo": [20, 20], "anchoMm": 3, "incierto": False, "enIR": "conservada"}]))
        self.assertEqual(r["countersLost"], [])
        self.assertEqual(r["inconclusive"], [])

    def test_alineacion_dudosa_da_inconcluso_y_no_perdida(self):
        # Las puntadas miden 1.2 mm más que el diseño a lo ancho: el centrado
        # puede errar 0.6 mm y un hilo a 0.35 mm del polo no se puede afirmar.
        objetos = [objeto("o", "fill", "M16 16 L24 16 L24 24 L16 24 Z")]
        p = Patron().puntada(15.4, 16).puntada(24.6, 16).puntada(24.6, 24).puntada(15.4, 24).puntada(15.4, 16).puntada(20.35, 20).puntada(20.35, 21)
        r = topologia_en_dst(p.p, objetos, verdad([], [{"id": "h", "polo": [20, 20], "anchoMm": 3, "incierto": False, "enIR": "conservada"}]))
        self.assertGreater(r["alignmentUncertaintyMm"], 0.35)
        self.assertEqual(r["countersLost"], [])
        self.assertEqual([x["id"] for x in r["inconclusive"]], ["h"])

    def test_sin_verdad_no_se_evalua(self):
        self.assertEqual(topologia_en_dst(Patron().puntada(0, 0).p, self.objetos, []), {"evaluated": False})


if __name__ == "__main__":
    unittest.main()
