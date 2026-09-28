"""V6.9.0: un logo complejo en v5 no se rechaza por contar sus columnas, y medir su cobertura no
multiplica el lienzo entero por cada objeto (FAST).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_complejos_v690.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import cobertura as cob  # noqa: E402
import motor  # noqa: E402
import reparacion as rep  # noqa: E402
import test_reparacion_v641 as t41  # noqa: E402


def escudo(satins: int) -> dict:
    """Un diseño v5 con `satins` columnas cortas de satin por rails (lo que v5 hace de cada letra)."""
    objetos = []
    for k in range(satins):
        x = 2 + (k % 40) * 2.1
        y = 2 + (k // 40) * 2.1
        d = rep.d_de([[(x, y), (x + 1.5, y)], [(x, y + 1), (x + 1.5, y + 1)]])
        objetos.append(t41.objeto(f"s{k}", "satin", d))
    return t41.diseno(objetos, [])


class TopesDeV5(unittest.TestCase):
    def test_un_escudo_de_250_columnas_no_es_demasiado_complejo(self) -> None:
        # Con los topes de v2 (320 componentes, 2 por satin) esto era TOO_COMPLEX: 500 "componentes".
        estado, _, razones = motor.early_analysis(escudo(250))
        self.assertNotIn("TOO_COMPLEX", [r["code"] for r in razones])
        self.assertNotEqual(estado, "REJECTED")

    def test_un_satin_por_rails_cuenta_una_vez(self) -> None:
        # 700 columnas pasan del tope de objetos (600): se rechaza, y por eso y no por contarlas dobles.
        with self.assertRaises(ValueError):
            motor.validate_design(escudo(700), "", canonical_hash_verified=True)
        estado, _, razones = motor.early_analysis(escudo(599))
        self.assertNotIn("TOO_COMPLEX", [r["code"] for r in razones])

    def test_los_perfiles_anteriores_no_cambian(self) -> None:
        for version in ("experimental-v2-2026-09-06", "experimental-v3-2026-09-06", "experimental-hybrid-v4-2026-09-06"):
            self.assertEqual(motor.PROFILES[version]["maxComponents"], 320)
            self.assertEqual(motor.PROFILES[version]["maxObjects"], 300)


class ConteoEnLaCaja(unittest.TestCase):
    """Contar el producto en la caja de lo que no es cero da la MISMA cuenta que en el lienzo entero."""

    def test_el_producto_recortado_cuenta_lo_mismo(self) -> None:
        import random

        from PIL import Image, ImageChops, ImageDraw

        azar = random.Random(7)

        def figura(forma: str) -> Image.Image:
            im = Image.new("L", (300, 200), 0)
            d = ImageDraw.Draw(im)
            for _ in range(4):
                x, y = azar.randrange(280), azar.randrange(180)
                caja = [x, y, x + azar.randrange(2, 60), y + azar.randrange(2, 40)]
                (d.rectangle if forma == "caja" else d.ellipse)(caja, fill=255)
            return im

        for _ in range(40):
            region, ir = figura("caja"), figura("elipse")
            todo = cob._cuenta(ImageChops.multiply(region, ir))
            caja = cob._caja_comun(region.getbbox(), ir.getbbox())
            self.assertEqual(cob._cuenta_producto(region, ir, caja), todo)
            self.assertEqual(cob._cuenta_producto(region, ir, region.getbbox()), todo)
            c = ir.getbbox()
            recortada = (c, ir.crop(c) if c else None)
            self.assertEqual(cob._toca_recortada(region, region.getbbox(), recortada), todo > 0)

    def test_cajas_que_no_se_tocan(self) -> None:
        self.assertIsNone(cob._caja_comun((0, 0, 10, 10), (10, 0, 20, 10)))
        self.assertIsNone(cob._caja_comun(None, (0, 0, 1, 1)))
        self.assertEqual(cob._caja_comun((0, 0, 10, 10), (5, 5, 20, 20)), (5, 5, 10, 10))


if __name__ == "__main__":
    unittest.main()
