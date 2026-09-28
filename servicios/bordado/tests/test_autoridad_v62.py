"""V6.2: el motor sólo hace caso a la preparación del SERVIDOR.

El diseño que llega al motor lo prepara el núcleo en el servidor desde el
original, y marca sus incidencias `SERVER_STRUCTURAL`. Una incidencia sin esa
procedencia la escribió un navegador: no decide nada. Y cada incidencia sale
con su procedencia (`SERVER_ENGINE`, `SERVER_STRUCTURAL`, `SERVER_DST`).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_autoridad_v62.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402
from test_solape_v5 import V5, objeto  # noqa: E402


def diseno(issues: list[dict]) -> dict:
    return {
        "profileVersion": V5,
        "metrics": {},
        "objects": [{**objeto("a", "running", "M10 10 L20 10"), "classification": "logo", "nodeCount": 2}],
        "preparation": {"profileVersion": V5, "issues": issues},
    }


class AutoridadV62(unittest.TestCase):
    def test_una_incidencia_del_navegador_no_decide(self):
        for source in (None, "CLIENT_PREVIEW", "SERVER_DST", "cualquiera"):
            incidencia = {"code": "TOPOLOGY_COMPONENT_LOST", "message": "x", "severity": "review"}
            if source:
                incidencia["source"] = source
            estado, _, razones = motor.early_analysis(diseno([incidencia]))
            self.assertEqual(estado, "READY", source)
            self.assertEqual(razones, [])

    def test_una_del_servidor_si_y_conserva_su_procedencia(self):
        estado, _, razones = motor.early_analysis(diseno([{"code": "TOPOLOGY_COMPONENT_LOST", "message": "x", "severity": "review", "source": "SERVER_STRUCTURAL"}]))
        self.assertEqual(estado, "REVIEW")
        self.assertEqual([(r["code"], r["source"]) for r in razones], [("TOPOLOGY_COMPONENT_LOST", "SERVER_STRUCTURAL")])

    def test_las_del_dst_salen_marcadas(self):
        plan = {"structuralTruth": {"evaluated": True, "componentsLost": [{"id": "p"}], "countersLost": [], "inconclusive": [], "alignmentUncertaintyMm": 0.1}}
        codigos = [i["code"] for i in motor.quality_issues({"profileVersion": V5, "objects": []}, {}, plan)]
        self.assertIn("TOPOLOGY_COMPONENT_LOST", codigos)


if __name__ == "__main__":
    unittest.main()
