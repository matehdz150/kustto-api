"""V6.4.2: la reparación de la GEOMETRÍA del satin (correspondencia rail↔rail), SATIN GEOMETRY FAST.

La correspondencia la calcula el núcleo de TypeScript (`nucleo.cjs satin`, ver
`packages/bordado/src/correspondencia.ts`); aquí se prueba cómo la consume la
reparación, con el digitalizador simulado de V6.4.1 (que empareja como
Ink/Stitch: en proporción entre rungs) y el juicio real del motor.

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_satin_v642.py'
"""
from __future__ import annotations

import json
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import identidad as idn  # noqa: E402
import reparacion as rep  # noqa: E402
from test_reparacion_v641 import Coser, candidato, diseno, objeto, pieza, rep as _rep, reparar, sano, transformar  # noqa: E402, F401

Punto = tuple[float, float]


def ondulado(x0: float, x1: float, y: float, amplitud: float = 1.5, periodo: float = 3.0, hasta: float | None = None, n: int = 400) -> list[Punto]:
    """Un rail con un tramo ondulado (de x0 a `hasta`) y el resto recto: recorre mucho más que su vecino."""
    hasta = x1 if hasta is None else hasta
    puntos = []
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        puntos.append((x, y + (amplitud * math.sin(2 * math.pi * (x - x0) / periodo) if x <= hasta else 0.0)))
    return puntos


def satin_de(r1: list[Punto], r2: list[Punto]) -> str:
    return rep.d_de([r1, r2])


def mal_emparejado(ancho: float = 3.5) -> dict:
    """Un satin de `ancho` mm cuyo rail de abajo ondula la primera mitad (1.5 mm cada 3 mm): recorre
    casi el doble que el de arriba, la proporción de Ink/Stitch empareja A(x) con B muy atrás y las
    pasadas salen en abanico y largas (SATIN_PASS_TOO_WIDE: un 32 % de más de 6.4 mm)."""
    a = [(10 + 40 * k / 20, 10.0) for k in range(21)]
    b = ondulado(10, 50, 10 + ancho, hasta=30)
    return diseno([objeto("m", "satin", satin_de(a, b))], [pieza("m", 10, 50, 10 + ancho / 2, ancho)])


def curvo() -> dict:
    """Un satin curvo bueno (arcos concéntricos de 5 y 8 mm)."""
    r1 = [(30 + 5 * math.cos(math.pi * k / 40), 30 - 5 * math.sin(math.pi * k / 40)) for k in range(41)]
    r2 = [(30 + 8 * math.cos(math.pi * k / 40), 30 - 8 * math.sin(math.pi * k / 40)) for k in range(41)]
    sondas = [[30 + 6.5 * math.cos(math.pi * (k + 0.5) / 8), 30 - 6.5 * math.sin(math.pi * (k + 0.5) / 8)] for k in range(8)]
    return diseno([objeto("k", "satin", satin_de(r1, r2))], [{"id": "p-k", "sondas": sondas, "anchoMm": 3, "incierto": False, "enIR": "conservada"}])


def recto_bueno() -> dict:
    return diseno([objeto("s", "satin", satin_de([(10.0, 10.0), (30.0, 10.0)], [(10.0, 12.0), (30.0, 12.0)]))], [pieza("s", 10, 30, 11, 2)])


def estrategia_elegida(informe: dict) -> list:
    return [(o["objectId"], candidato(informe, o["objectId"], o["selected"])["strategy"] if o["selected"] else None) for o in informe["objects"]]


class Remapeo(unittest.TestCase):
    def test_el_simulador_reproduce_el_abanico(self) -> None:
        c = Coser()(mal_emparejado())
        self.assertEqual(rep._errores_de_tecnica(c), {"m": ["SATIN_PASS_TOO_WIDE"]})

    def test_remapeo_antes_que_split(self) -> None:
        informe, coser = reparar(mal_emparejado())
        o = informe["objects"][0]
        self.assertEqual([c["strategy"] for c in o["candidates"]], ["original", "split-satin", "satin-remapped", "split-satin-remapped", "fill"])
        c = candidato(informe, "m", "C")
        self.assertTrue(c["accepted"], c["rejections"])
        # C (un satin bien emparejado) gana a D (el mismo, partido) y a B (el split legado): con la misma
        # forma, sus pasadas son más transversales (geometría) y no añade una columna.
        d, b = candidato(informe, "m", "D"), candidato(informe, "m", "B")
        self.assertEqual(o["selected"], "C")
        for otro in (d, b):
            if otro["accepted"]:
                self.assertLess(c["metrics"]["satinObliquityP95Deg"], otro["metrics"]["satinObliquityP95Deg"])
        self.assertEqual(len(c["modifiedObjects"]), 1)
        # Los rails del satin remapeado son los originales, intactos; cambian los rungs.
        original = mal_emparejado()["objects"][0]
        nuevo = next(x for x in informe["design"]["objects"] if x["id"] == "m-r0")
        viejos, nuevos = idn._subpaths(original["geometry"]["d"]), idn._subpaths(nuevo["geometry"]["d"])
        for k in (0, 1):
            self.assertEqual(len(viejos[k]), len(nuevos[k]))
            self.assertLess(max(math.dist(p, q) for p, q in zip(viejos[k], nuevos[k])), 0.001)
        self.assertGreater(len(nuevos) - 2, 5)
        # La geometría cosida: la oblicuidad baja y la pasada entra.
        a = candidato(informe, "m", "A")
        self.assertLess(c["metrics"]["satinObliquityP95Deg"], a["metrics"]["satinObliquityP95Deg"])
        import tecnica
        self.assertLess(c["metrics"]["satinPassMaxMm"], tecnica.SATIN_PASADA_MAXIMA_MM)
        self.assertLess(c["metrics"]["satinPassMaxMm"], a["metrics"]["satinPassMaxMm"] - 3)
        self.assertGreater(c["parameters"]["pairingShiftMm"], rep.REMAPEO_MINIMO_MM)

    def test_ancho_de_verdad_remapeo_y_despues_split(self) -> None:
        # Mal emparejado Y de 9 mm: C remapea pero sigue ancho; D parte la correspondencia NUEVA.
        informe, _ = reparar(mal_emparejado(9.0))
        c, d = candidato(informe, "m", "C"), candidato(informe, "m", "D")
        self.assertFalse(c["accepted"])
        self.assertTrue(any("SATIN_PASS_TOO_WIDE" in r for r in c["rejections"]))
        self.assertTrue(d["accepted"], d["rejections"])
        # D se dimensionó con lo que MIDIÓ C al coserse (retroalimentación, una sola generación).
        self.assertEqual(d["parameters"]["measuredRemappedPassMm"], c["metrics"]["satinPassMaxMm"])
        self.assertEqual(d["parameters"]["columns"], math.ceil(max(d["parameters"]["predictedPassMm"], c["metrics"]["satinPassMaxMm"]) / rep.OBJETIVO_PASADA_MM))
        # Y gana al split legado por geometría (la misma forma, secciones transversales).
        b = candidato(informe, "m", "B")
        if b["accepted"]:
            self.assertLessEqual(d["metrics"]["satinObliquityP95Deg"], b["metrics"]["satinObliquityP95Deg"])
        self.assertEqual(informe["objects"][0]["selected"], "D")

    def test_columna_recta_remapear_no_cambia_nada(self) -> None:
        from test_reparacion_v641 import ancho
        informe, coser = reparar(ancho())
        for cid in ("C", "D"):
            self.assertIn("remapear no cambia nada", candidato(informe, "w", cid)["rejections"][0])
        self.assertEqual(informe["objects"][0]["selected"], "B")

    def test_la_pasada_medida_dimensiona_el_split_legado(self) -> None:
        # La geometría predice ~2 mm; el DST ya cosió 7.4 (lo de discovery-80): se parte en 2.
        o = objeto("q", "satin", satin_de([(10.0, 10.0), (20.0, 10.0)], [(10.0, 12.0), (20.0, 12.0)]))
        parametros, nuevos = rep.satin_dividido(o, {"disparador": {"measurement": {"coverPassMm": {"max": 7.4}}}})
        self.assertEqual((parametros["columns"], parametros["sizedBy"], len(nuevos)), (2, "dst", 2))
        self.assertAlmostEqual(parametros["maxGeometricPassMm"], 2.0, places=2)
        # Sin medición, la geometría manda (2 mm no se parte).
        with self.assertRaises(rep.SinCandidato):
            rep.satin_dividido(o, {})

    def test_sanos_no_se_tocan(self) -> None:
        for d in (curvo(), recto_bueno()):
            informe, coser = reparar(d)
            self.assertFalse(informe["attempted"])
            self.assertIs(informe["design"], d)
            self.assertEqual(coser.llamadas, 1)

    def test_warning_no_dispara_por_geometria(self) -> None:
        # Un satin sano con oblicuidad alta (cuña) no se repara: la geometría sólo elige, no dispara.
        d = diseno([objeto("u", "satin", satin_de([(10.0, 10.0), (30.0, 10.0)], [(10.0, 11.0), (30.0, 14.0)]))], [pieza("u", 10, 30, 11.5, 2.5)])
        informe, _ = reparar(d)
        self.assertFalse(informe["attempted"])


class Propiedades(unittest.TestCase):
    def test_traslacion_y_rotacion(self) -> None:
        a, _ = reparar(mal_emparejado())
        for f in (lambda p: (p[0] + 13.2, p[1] + 21.7),
                  lambda p: (45 - (p[1] - 30), 30 + (p[0] - 30)),  # 90°
                  lambda p: (45 + (p[0] - 30) * math.cos(math.radians(30)) - (p[1] - 12) * math.sin(math.radians(30)), 30 + (p[0] - 30) * math.sin(math.radians(30)) + (p[1] - 12) * math.cos(math.radians(30))),
                  lambda p: (45 + (p[0] - 30) * math.cos(math.radians(137)) - (p[1] - 12) * math.sin(math.radians(137)), 30 + (p[0] - 30) * math.sin(math.radians(137)) + (p[1] - 12) * math.cos(math.radians(137)))):
            b, _ = reparar(transformar(mal_emparejado(), f))
            self.assertEqual(estrategia_elegida(a), estrategia_elegida(b))
            ca, cb = candidato(a, "m", "C"), candidato(b, "m", "C")
            self.assertAlmostEqual(ca["metrics"]["satinObliquityP95Deg"], cb["metrics"]["satinObliquityP95Deg"], delta=3)

    def test_inversion_y_cambio_de_rails(self) -> None:
        base = mal_emparejado()
        r1, r2 = idn._subpaths(base["objects"][0]["geometry"]["d"])[:2]
        a, _ = reparar(base)
        for nuevos in ([r1[::-1], r2[::-1]], [r2, r1]):
            d = json.loads(json.dumps(base))
            d["objects"][0]["geometry"]["d"] = rep.d_de(nuevos)
            b, _ = reparar(d)
            self.assertEqual(estrategia_elegida(a), estrategia_elegida(b))
            ca, cb = candidato(a, "m", "C"), candidato(b, "m", "C")
            self.assertAlmostEqual(ca["metrics"]["satinPassMaxMm"], cb["metrics"]["satinPassMaxMm"], delta=0.3)
            # La distorsión de área del borde ondulado se mueve unas centésimas con el redondeo del DST.
            self.assertAlmostEqual(ca["metrics"]["geometryDistortion"], cb["metrics"]["geometryDistortion"], delta=0.05)

    def test_determinista(self) -> None:
        limpio = lambda i: json.dumps({k: v for k, v in i.items() if k != "ms"}, sort_keys=True, default=str)  # noqa: E731
        a, _ = reparar(mal_emparejado(9.0))
        b, _ = reparar(mal_emparejado(9.0))
        self.assertEqual(limpio(a), limpio(b))
        self.assertEqual(json.dumps(a["design"], sort_keys=True), json.dumps(b["design"], sort_keys=True))

    def test_el_nucleo_se_pide_una_vez_por_objeto(self) -> None:
        llamadas = []
        original = rep.subprocess.run

        def contar(*args, **kw):
            llamadas.append(args[0][2] if args and len(args[0]) > 2 else None)
            return original(*args, **kw)
        rep.subprocess.run = contar
        try:
            reparar(mal_emparejado(9.0))
        finally:
            rep.subprocess.run = original
        self.assertEqual(llamadas, ["satin"])


if __name__ == "__main__":
    unittest.main()
