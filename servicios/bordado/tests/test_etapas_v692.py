"""V6.9.2: las etapas del previsualizador del editor sólo miran (FAST, sin Ink/Stitch).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_etapas_v692.py'
"""
from __future__ import annotations

import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import motor  # noqa: E402
import pyembroidery as pe  # noqa: E402


def diseno() -> dict:
    return {
        "schemaVersion": 1, "sourceSnapshotHash": "a" * 64, "productId": "p1", "sideId": "front",
        "physical": {"widthMm": 90, "heightMm": 60}, "bounds": {"xMm": 5, "yMm": 5, "widthMm": 70, "heightMm": 40},
        "colors": [{"id": "c0", "sourceHex": "#171717", "displayHex": "#171717", "order": 0}],
        "objects": [{"id": "forma", "sourceObjectId": "forma", "sourceType": "vector", "classification": "logo", "colorId": "c0", "geometry": {"kind": "path", "d": "M10 10 L70 10 L70 40 L10 40 Z", "fillRule": "evenodd"}, "stitch": {"type": "fill"}, "bounds": {"xMm": 10, "yMm": 10, "widthMm": 60, "heightMm": 30}, "nodeCount": 4}],
        "metrics": {"componentCount": 1, "nodeCount": 4}, "profileVersion": "experimental-v2-2026-09-06", "engineVersion": "inkstitch-3.3.0",
    }


def ink_stitch_falso(_svg: Path, dst: Path) -> float:
    """Un relleno de filas, determinista: lo que haría Ink/Stitch con el rectángulo."""
    patron = pe.EmbPattern()
    # Desde el origen: los límites de la cabecera de un DST cuentan desde (0, 0).
    for fila in range(0, 300, 4):
        x0, x1 = (0, 600) if fila % 8 == 0 else (600, 0)
        for x in range(x0, x1, 30 if x1 > x0 else -30):
            patron.add_stitch_absolute(pe.STITCH, x, fila)
    patron.add_command(pe.END)
    pe.write_dst(patron, str(dst))
    return 1.0


def correr(etapas: bool) -> tuple[dict, str, Path, tempfile.TemporaryDirectory]:
    d = diseno()
    h = hashlib.sha256(json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    carpeta = tempfile.TemporaryDirectory()
    err = io.StringIO()
    with contextlib.redirect_stderr(err):
        r = motor.process_design(d, h, Path(carpeta.name), ink_stitch_falso, etapas=etapas)
    return r, err.getvalue(), Path(carpeta.name), carpeta


class Etapas(unittest.TestCase):
    def test_sin_etapas_no_se_anuncia_nada(self) -> None:
        r, err, carpeta, c = correr(False)
        self.addCleanup(c.cleanup)
        self.assertNotIn("ETAPA ", err)
        self.assertFalse((carpeta / motor.ETAPA_PUNTADAS).exists())
        self.assertNotIn("embroidered", r["artifacts"])

    def test_la_etapa_de_puntadas_se_anuncia_con_su_imagen_escrita(self) -> None:
        r, err, carpeta, c = correr(True)
        self.addCleanup(c.cleanup)
        lineas = [json.loads(x[len("ETAPA "):]) for x in err.splitlines() if x.startswith("ETAPA ")]
        self.assertEqual(lineas, [{"etapa": "puntadas", "archivo": motor.ETAPA_PUNTADAS}])
        self.assertEqual((carpeta / motor.ETAPA_PUNTADAS).read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        self.assertIn(r["status"], ("READY", "REVIEW"))

    def test_con_o_sin_etapas_el_dst_y_el_veredicto_son_los_mismos(self) -> None:
        r0, _e0, c0, a = correr(False)
        r1, _e1, c1, b = correr(True)
        self.addCleanup(a.cleanup)
        self.addCleanup(b.cleanup)
        self.assertEqual((c0 / "design.dst").read_bytes(), (c1 / "design.dst").read_bytes())
        self.assertEqual((r0["status"], r0["decision"], r0["confidence"]), (r1["status"], r1["decision"], r1["confidence"]))
        self.assertEqual([i["code"] for i in r0["issues"]], [i["code"] for i in r1["issues"]])


if __name__ == "__main__":
    unittest.main()
