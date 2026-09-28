"""V6.6.0: la tolerancia del corrido regularizado llega a Ink/Stitch (FAST).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_regular_v660.py'
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402
import reparacion as rep  # noqa: E402
import test_cobertura_v643 as t  # noqa: E402
import test_reparacion_v641 as t41  # noqa: E402


def corrido(tolerancia: float | None, tipo: str = "running") -> dict:
    o = t41.objeto("L", tipo, rep.d_de([[(10.0, 30.0), (20.0, 30.0), (20.0, 35.0)]]))
    if tolerancia is not None:
        o["stitch"]["toleranceMm"] = tolerancia
    return t.diseno([o], [{"id": "p-L", "anillos": [t.rect(10, 29.8, 20, 30.2)]}])


class ToleranciaDelCorrido(unittest.TestCase):
    def test_llega_al_atributo_de_inkstitch(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            svg = Path(d) / "a.svg"
            motor.build_svg(corrido(0.1), svg)
            self.assertIn('inkstitch:running_stitch_tolerance_mm="0.1"', svg.read_text())

    def test_sin_el_campo_la_de_inkstitch(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            svg = Path(d) / "a.svg"
            motor.build_svg(corrido(None), svg)
            self.assertNotIn("running_stitch_tolerance_mm", svg.read_text())

    def test_solo_en_corridos_y_en_rango(self) -> None:
        for mal in (corrido(0.1, "fill"), corrido(0.001), corrido(5.0)):
            with self.assertRaises(ValueError):
                motor.validate_design(mal, "", canonical_hash_verified=True)


if __name__ == "__main__":
    unittest.main()
