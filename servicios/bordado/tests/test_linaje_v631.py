"""V6.3.1: `identity.json` recorre la cadena entera, de la verdad al DST.

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_linaje_v631.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402

LINAJE = [{
    "id": "o0",
    "nodos": [
        {"id": "o0-ta-a", "etapa": "verdad", "padres": [], "atomo": {"capa": 0, "color": "#c00", "clase": "visible"}},
        {"id": "o0-ta-b", "etapa": "verdad", "padres": [], "atomo": {"capa": 1, "color": "#c00", "clase": "visible"}},
        {"id": "o0-adaptacion-c", "etapa": "adaptacion", "padres": ["o0-ta-a", "o0-ta-b"], "accion": "fusionar"},
        {"id": "ir-1", "etapa": "objetos", "padres": ["o0-adaptacion-c"]},
        {"id": "ir-2", "etapa": "objetos", "padres": ["o0-adaptacion-c"]},
    ],
    "grupos": [
        {"id": "o0-b0-g0", "atomos": ["o0-ta-a"], "destino": "merged", "sucesos": [{"etapa": "adaptacion", "tipo": "merged", "nodos": ["o0-adaptacion-c"]}], "regiones": ["o0-adaptacion-c"], "objetos": ["ir-1", "ir-2"]},
        {"id": "o0-b0-g1", "atomos": ["o0-ta-b"], "destino": "removed", "etapa": "adaptacion", "sucesos": [], "regiones": [], "objetos": []},
    ],
    "piezas": [{"id": "o0-tp0", "atomos": ["o0-ta-a", "o0-ta-b"], "destino": "merged", "sucesos": [], "regiones": [], "objetos": ["ir-2"]}],
    "divergencias": 0,
}]


def objeto(ident: str, grupos: list[str]) -> dict:
    return {"id": ident, "colorId": "c", "stitch": {"type": "fill"}, "identity": {"id": ident, "groups": grupos, "pieces": ["o0-tp0"], "parents": ["o0-adaptacion-c"]}}


class Traza(unittest.TestCase):
    def test_de_la_verdad_a_los_rangos(self):
        design = {"preparation": {"linaje": LINAJE, "estructura": [], "verdad": []}}
        objetos = [objeto("ir-2", ["o0-b0-g0"]), objeto("ir-1", ["o0-b0-g0"])]  # el orden del motor, no el del IR
        mapa = {"elementos": [{"elemento": 0, "puntadas": 10, "rangos": [[20, 29]]}, {"elemento": 1, "puntadas": 5, "rangos": [[3, 7]]}], "marco": {}, "sinPuntadas": [], "incompletos": [], "enlaces": [], "comandos": {}}
        a = motor.artefacto_de_identidad(design, objetos, mapa, "", {})
        self.assertEqual(a["algorithm"], "v6.3.1-exact-lineage")
        traza = {t["id"]: t for t in a["lineage"][0]["truthTrace"]}
        g0 = traza["o0-b0-g0"]
        self.assertEqual(g0["destino"], "merged")
        self.assertEqual(g0["inkstitchElementIds"], [0, 1])
        self.assertEqual(g0["stitchRanges"], [{"start": 3, "end": 7}, {"start": 20, "end": 29}])
        self.assertEqual(traza["o0-b0-g1"]["destino"], "removed")
        self.assertEqual(traza["o0-b0-g1"]["stitchRanges"], [])
        self.assertEqual(traza["o0-tp0"]["inkstitchElementIds"], [0])
        self.assertEqual(len(a["lineage"][0]["nodes"]), 5)


if __name__ == "__main__":
    unittest.main()
