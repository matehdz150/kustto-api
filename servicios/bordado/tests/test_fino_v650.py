"""V6.5.0: la parte del motor de las estructuras finas (FAST).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_fino_v650.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import cobertura as cob  # noqa: E402
import reparacion as rep  # noqa: E402
import test_cobertura_v643 as t  # noqa: E402
import test_reparacion_v641 as t41  # noqa: E402


def area_perdida_raster(confianza: int | None, color: str = "#112233") -> dict:
    """La mitad derecha de un rectángulo sin IR, con la verdad de una IMAGEN: sin color de SVG, con la
    evidencia de color de V6.5.0 (el hilo de la tinta del píxel y su confianza, o "mezcla")."""
    o = t41.objeto("F", "fill", rep.d_de([t.rect(10, 20, 20, 26)], cerrar=True))
    o["colorId"] = "c0"
    d = t.diseno([o], [{"id": "p-F", "anillos": [t.rect(10, 20, 30, 26)]}], sondas={"p-F": [[12, 23], [18, 23], [22, 23], [28, 23]]})
    pieza = {"id": "p-F", "anillos": [t.rect(10, 20, 30, 26)], "color": color}
    if confianza is not None:
        pieza["confianza"] = confianza
    # Los objetos de la pieza, de DOS colores: la pieza no afirma color por sí sola (sin la evidencia, None).
    otro = t41.objeto("G", "fill", rep.d_de([t.rect(10, 26, 12, 26.5)], cerrar=True))
    otro["colorId"] = "c1"
    otro["identity"]["pieces"] = ["p-F"]
    d["objects"].append(otro)
    d["colors"].append({"id": "c1", "sourceHex": "#aa0000", "displayHex": "#aa0000"})
    d["preparation"]["verdad"][0]["malla"] = cob.malla_de_poligonos([pieza], t.CAJA, 0.1, ["#112233", "mezcla"])
    return d


class EvidenciaDeColorRaster(unittest.TestCase):
    def test_con_evidencia_alta_el_color_se_afirma(self) -> None:
        r = t.region(t.medida(area_perdida_raster(90)), "p-F")
        self.assertEqual(r["color"]["evidence"], "raster-color")
        self.assertEqual(r["color"]["colorId"], "c0")
        self.assertEqual(r["recoverability"], "RECOVERABLE")

    def test_con_evidencia_baja_no(self) -> None:
        r = t.region(t.medida(area_perdida_raster(30)), "p-F")
        self.assertIsNone(r["color"]["colorId"])
        self.assertEqual(r["color"]["evidence"], "raster-color-low-confidence")

    def test_la_mezcla_no_es_un_color(self) -> None:
        r = t.region(t.medida(area_perdida_raster(90, color="mezcla")), "p-F")
        self.assertIsNone(r["color"]["colorId"])
        self.assertEqual(r["color"]["evidence"], "raster-color-mixed")
        self.assertNotEqual(r["recoverability"], "RECOVERABLE")

    def test_sin_evidencia_raster_se_queda_como_antes(self) -> None:
        # Una malla sin capa de confianza es la de un SVG: el color de la verdad, como en V6.4.3.
        r = t.region(t.medida(area_perdida_raster(None)), "p-F")
        self.assertEqual(r["color"]["evidence"], "truth-color")

    def test_el_antialias_del_borde_no_vota(self) -> None:
        """Una región de 20 × 10 celdas: 15 columnas del hilo (confianza 90) y 5 de mezcla (el antialias
        de su borde, un 25 %). La mezcla no es evidencia de ningún hilo: el color se afirma."""
        r = cob._color_de_region(MallaFalsa(15, 5), [(j, 0, 20) for j in range(10)], [], {"#112233": "c0"})
        self.assertEqual((r["colorId"], r["evidence"]), ("c0", "raster-color"))

    def test_un_degradado_sigue_sin_color(self) -> None:
        """Casi toda la región es mezcla (6 de cada 20 columnas del hilo): no se afirma ningún hilo."""
        r = cob._color_de_region(MallaFalsa(6, 14), [(j, 0, 20) for j in range(10)], [], {"#112233": "c0"})
        self.assertEqual((r["colorId"], r["evidence"]), (None, "raster-color-mixed"))


class MallaFalsa:
    """Lo que `_color_de_region` lee de una malla raster: por fila, `hilo` celdas del color 2 (#112233,
    confianza 90) y luego `mezcla` celdas del color 1 ("mezcla", confianza 0)."""

    def __init__(self, hilo: int, mezcla: int) -> None:
        self.colores = ["mezcla", "#112233"]
        self.rachas_confianza = True
        self.hilo, self.mezcla = hilo, mezcla

    def color_por_fila(self):
        return {j: [(2, 0, self.hilo), (1, self.hilo, self.hilo + self.mezcla)] for j in range(10)}

    def confianza_por_fila(self):
        return {j: [(90, 0, self.hilo)] for j in range(10)}


if __name__ == "__main__":
    unittest.main()


def linea_medio_cosida(importancia: str | None) -> dict:
    """Una estructura fina de 20 mm (su eje) de la que el IR sólo cose la mitad, con su importancia."""
    o = t41.objeto("L", "running", rep.d_de([[(10.0, 30.0), (20.0, 30.0)]]))
    eje = rep.d_de([[(10.0 + k, 30.0) for k in range(21)]])
    g = {"id": "g-L", "largoMm": 20, "ejes": [eje], "uniones": [], "clase": "LINEAR"}
    if importancia:
        g["importancia"] = importancia
    return t.diseno([o], [{"id": "p-L", "anillos": [t.rect(10, 29.85, 30, 30.15)]}], estructura=[g])


class CoberturaDeTrazo(unittest.TestCase):
    def test_por_estructura_con_lo_que_falta_y_la_distancia_al_eje(self) -> None:
        trazo = t.Coser()(linea_medio_cosida("supporting"))["plan_metrics"]["strokeCoverage"]
        g = next(x for x in trazo["perGroup"] if x["id"] == "g-L")
        self.assertAlmostEqual(g["coverageRatio"], 0.5, delta=0.06)
        self.assertAlmostEqual(g["missingLengthMm"], 10, delta=1.2)
        self.assertGreaterEqual(g["longestMissingSegmentMm"], 8)
        self.assertIsNotNone(g["meanCenterlineDistanceMm"])
        self.assertLessEqual(g["maxCenterlineDistanceMm"], 0.3)
        self.assertEqual((g["class"], g["importance"]), ("LINEAR", "supporting"))
        self.assertIn("g-L", trazo["incomplete"])

    def test_lo_decorativo_incompleto_es_un_dato(self) -> None:
        trazo = t.Coser()(linea_medio_cosida("decorative"))["plan_metrics"]["strokeCoverage"]
        self.assertNotIn("g-L", trazo["incomplete"])
        self.assertIn("g-L", trazo["incompleteDecorative"])

    def test_sin_importancia_como_antes(self) -> None:
        # Una preparación anterior a V6.5.0 (sin importancia): incompleta es revisión, como siempre.
        trazo = t.Coser()(linea_medio_cosida(None))["plan_metrics"]["strokeCoverage"]
        self.assertIn("g-L", trazo["incomplete"])
