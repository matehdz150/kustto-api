"""V6.4.3: la COBERTURA contra la verdad y su reparación, COVERAGE FAST.

Sin Ink/Stitch: el digitalizador simulado de V6.4.1 (con un `_simulaHueco` de
prueba que deja sin coser una caja del objeto: lo que haría un Ink/Stitch que
no llega) y el juicio real del motor (`juzgar_cosido`, con `cobertura.medir`).
La verdad de cada sintético es una malla pintada desde sus polígonos
(`cobertura.malla_de_poligonos`, el mismo formato que exporta el núcleo).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_cobertura_v643.py'
"""
from __future__ import annotations

import copy
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyembroidery as pe  # noqa: E402

import cobertura as cob  # noqa: E402
import identidad as idn  # noqa: E402
import motor  # noqa: E402
import reparacion as rep  # noqa: E402
import test_reparacion_v641 as t41  # noqa: E402

Punto = tuple[float, float]
CAJA = (0.0, 0.0, 70.0, 55.0)


def _relleno_por_filas(o: dict) -> list[list[Punto]]:
    """El relleno de V6.4.1 fila a fila, cada tramo de fila aparte (saltando entre tramos): Ink/Stitch
    viaja por dentro de la forma, no cruza un counter en línea recta como el simulador de V6.4.1."""
    anillos = idn._subpaths(o["geometry"]["d"])
    ys = [p[1] for a in anillos for p in a]
    filas: list[list[Punto]] = []
    y, derecha = min(ys) + 0.225, True
    while y < max(ys):
        cortes = sorted(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]) for a in anillos for p, q in zip(a, a[1:] + a[:1]) if (p[1] <= y < q[1]) or (q[1] <= y < p[1]))
        tramos = [(cortes[i] + 0.1, cortes[i + 1] - 0.1) for i in range(0, len(cortes) - 1, 2) if cortes[i + 1] - cortes[i] > 0.2]
        for x0, x1 in (tramos if derecha else [(b, a) for a, b in reversed(tramos)]):
            # Puntadas cada 1 mm (no 4): un hueco de prueba corta el tramo donde está, no 4 mm más allá.
            filas.append([(x0, y)] + t41._partir((x0, y), (x1, y), 1.0))
        y += 0.45
        derecha = not derecha
    return filas


def digitalizar(design: dict) -> tuple[pe.EmbPattern, dict]:
    """El digitalizador de V6.4.1, con huecos de prueba: las puntadas dentro de `_simulaHueco`
    ([x0, x1, y0, y1]) no se cosen; el elemento sigue en varios rangos con saltos en medio."""
    patron = pe.EmbPattern()
    elementos = []
    for k, o in enumerate(motor.ordered_objects(design)):
        tipo = o["stitch"]["type"]
        cadenas = [t41._satin(o)] if tipo == "satin" else [t41._corrido(o)] if tipo == "running" else _relleno_por_filas(o)
        hueco = o["stitch"].get("_simulaHueco")
        tramos: list[list[Punto]] = []
        for puntos in cadenas:
            tramos.append([])
            for p in puntos:
                if hueco and hueco[0] <= p[0] <= hueco[1] and hueco[2] <= p[1] <= hueco[3]:
                    if tramos[-1]:
                        tramos.append([])
                    continue
                tramos[-1].append(p)
        tramos = [t for t in tramos if t]
        rangos, n = [], 0
        for t in tramos:
            if patron.stitches:
                patron.add_stitch_absolute(pe.TRIM, *patron.stitches[-1][:2])
            patron.add_stitch_absolute(pe.JUMP, round(t[0][0] * 10), round(t[0][1] * 10))
            a = len(patron.stitches)
            for x, y in t:
                patron.add_stitch_absolute(pe.STITCH, round(x * 10), round(y * 10))
            rangos.append([a, len(patron.stitches) - 1])
            n += len(t)
        elementos.append({"elemento": k, "puntadas": n, "remates": 0, "rangos": rangos, "verificacion": {"estado": "completo"}})
    mapa = {"verificado": True, "elementos": elementos, "sinPuntadas": [e["elemento"] for e in elementos if not e["puntadas"]], "incompletos": [], "enlaces": [], "comandos": {}, "marco": {"dx": 0.0, "dy": 0.0, "residuoMm": 1e-6, "redondeoDelDstMm": 0.05}}
    return patron, mapa


class Coser(t41.Coser):
    def __call__(self, design: dict, carpeta: Path | None = None) -> dict:
        self.llamadas += 1
        patron, mapa = digitalizar(design)
        directorio = self.tmp / f"c{self.llamadas}"
        directorio.mkdir(parents=True, exist_ok=True)
        cosido = motor.juzgar_cosido(design, directorio, None, patron, motor.metricas_de_dst(patron), mapa, "", {})
        return {**cosido, "dst": None, "engine_ms": 0.0, "cacheHit": False, "cacheKey": None}


def rect(x0: float, y0: float, x1: float, y1: float) -> list[Punto]:
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def diseno(objetos: list[dict], verdad: list[dict], estructura=None, counters=None, colores=("#112233",), paso: float = 0.1, sondas: dict | None = None) -> dict:
    """Un diseño con su verdad: `verdad` = [{id, anillos, estructural?, color?}] (la malla) y, para las
    comprobaciones de V6.1, sus sondas (una fila por el centro de su caja)."""
    piezas = []
    for p in verdad:
        xs = [x for a in p["anillos"] for x, _ in a]
        ys = [y for a in p["anillos"] for _, y in a]
        y = (min(ys) + max(ys)) / 2
        piezas.append({"id": p["id"], "sondas": (sondas or {}).get(p["id"]) or t41.sondas(min(xs), max(xs), y), "anchoMm": 1.0, "incierto": False, "enIR": "conservada"} if p.get("estructural", True) else None)
    d = t41.diseno(objetos, [x for x in piezas if x], estructura=estructura, counters=counters)
    d["colors"] = [{"id": f"c{k}", "sourceHex": h, "displayHex": h} for k, h in enumerate(colores)]
    d["preparation"]["verdad"][0]["malla"] = cob.malla_de_poligonos(verdad, CAJA, paso, list(colores))
    return d


def reparar(design: dict, **kw) -> tuple[dict, Coser]:
    coser = Coser()
    base = coser(design)
    informe = rep.reparar(design, base, coser.tmp / "rep", coser, **kw)
    return informe, coser


def medida(design: dict) -> dict:
    return Coser()(design)["plan_metrics"]["coverage"]


def region(cov: dict, pieza: str) -> dict:
    return max((r for r in cov["regions"] if r["pieceId"] == pieza), key=lambda r: r["areaMm2"])


def pieza(cov: dict, pid: str) -> dict:
    return next(p for p in cov["pieces"] if p["pieceId"] == pid)


# ─── Los sintéticos ──────────────────────────────────────────────────────

def linea_perdida() -> dict:
    """A: la verdad tiene una línea de 20 mm (0.3 de ancho, con su eje); el IR cose sólo la mitad."""
    o = t41.objeto("L", "running", rep.d_de([[(10.0, 30.0), (20.0, 30.0)]]))
    eje = rep.d_de([[(10.0 + k, 30.0) for k in range(21)]])
    return diseno([o], [{"id": "p-L", "anillos": [rect(10, 29.85, 30, 30.15)]}], estructura=[{"id": "g-L", "largoMm": 20, "ejes": [eje], "uniones": []}])


def satin_sin_cubrir(hueco=(20, 26, 0, 99)) -> dict:
    """B: un satin de 2 mm cuyo hilo no llega a un tramo de su columna."""
    o = t41.objeto("S", "satin", t41.satin_rails(10, 30, 10, 12), _simulaHueco=list(hueco))
    return diseno([o], [{"id": "p-S", "anillos": [rect(10, 10, 30, 12)]}])


def relleno_con_hueco() -> dict:
    """C: un relleno de 10 × 10 con un hueco interior sin coser."""
    o = t41.objeto("F", "fill", rep.d_de([rect(40, 10, 50, 20)], cerrar=True), _simulaHueco=[43, 47, 13, 17])
    return diseno([o], [{"id": "p-F", "anillos": [rect(40, 10, 50, 20)]}])


def borde() -> dict:
    """D: la verdad es 0.4 mm más alta que la columna: sólo queda un filo sin hilo."""
    o = t41.objeto("E", "satin", t41.satin_rails(40, 60, 30, 32))
    return diseno([o], [{"id": "p-E", "anillos": [rect(40, 30, 60, 32.4)]}])


def anillo() -> dict:
    """E: un anillo (counter en el centro) cuyo relleno no llega a su banda izquierda."""
    anillos = [rect(10, 40, 20, 50), rect(13, 43, 17, 47)]
    o = t41.objeto("R", "fill", rep.d_de(anillos, cerrar=True), _simulaHueco=[9, 12.5, 39, 51])
    return diseno([o], [{"id": "p-R", "anillos": anillos}], counters=[{"id": "h1", "polo": [15, 45], "anchoMm": 4, "enIR": "conservada", "incierto": False}], sondas={"p-R": [[11.5, 45], [18.5, 45], [15, 41.5], [15, 48.5], [11.5, 41.5], [18.5, 48.5], [11.5, 48.5], [18.5, 41.5]]})


def anillo_perdido() -> dict:
    """E': el mismo anillo, pero el IR sólo tiene la C de la derecha: la banda izquierda se perdió."""
    anillos = [rect(10, 40, 20, 50), rect(13, 43, 17, 47)]
    ce = [(13.0, 40.0), (20.0, 40.0), (20.0, 50.0), (13.0, 50.0), (13.0, 47.0), (17.0, 47.0), (17.0, 43.0), (13.0, 43.0)]
    o = t41.objeto("R", "fill", rep.d_de([ce], cerrar=True))
    return diseno([o], [{"id": "p-R", "anillos": anillos}], counters=[{"id": "h1", "polo": [15, 45], "anchoMm": 4, "enIR": "conservada", "incierto": False}], sondas={"p-R": [[11.5, 45], [18.5, 45], [15, 41.5], [15, 48.5], [18.5, 41.5], [18.5, 48.5]]})


def otro_color() -> dict:
    """F: A (color 0) sin cubrir en su centro; B (color 1, otra pieza) cose justo encima."""
    a = t41.objeto("A", "fill", rep.d_de([rect(10, 20, 20, 24)], cerrar=True), _simulaHueco=[12, 18, 19, 25])
    b = t41.objeto("B", "fill", rep.d_de([rect(10, 20, 20, 24)], cerrar=True))
    b["colorId"] = "c1"
    return diseno([a, b], [{"id": "p-A", "anillos": [rect(10, 20, 20, 24)], "color": "#112233"}, {"id": "p-B", "anillos": [rect(40, 40, 46, 44)], "color": "#aa0000"}], colores=("#112233", "#aa0000"))


def micro() -> dict:
    """G: un punto de 0.4 × 0.4 mm que la verdad tiene por detalle, sin objeto; y algo cosido al lado."""
    o = t41.objeto("S", "satin", t41.satin_rails(10, 30, 10, 12))
    return diseno([o], [{"id": "p-S", "anillos": [rect(10, 10, 30, 12)]}, {"id": "p-m", "anillos": [rect(40, 40, 40.4, 40.4)], "estructural": False}])


def cubrir_con(margen: float):
    """H (trampa de overdraw): un relleno que tapa la región y `margen` mm alrededor."""
    def generador(o, contexto):
        x0, y0, x1, y1 = contexto["region"]["bboxMm"]
        anillo_ = rect(x0 - margen, y0 - margen, x1 + margen, y1 + margen)
        return {"margen": margen}, [{"geometry": {"kind": "path", "d": rep.d_de([anillo_], cerrar=True), "fillRule": "evenodd"}, "stitch": {"type": "fill", **rep.RELLENO_V5, "underlay": False, "trimAfter": False}, "colorId": "c0", "_puntos": anillo_}]
    return generador


# ─── Medida ──────────────────────────────────────────────────────────────

class Medir(unittest.TestCase):
    def test_a_linea_perdida_se_localiza_con_su_eje(self) -> None:
        cov = medida(linea_perdida())
        r = region(cov, "p-L")
        self.assertEqual(r["cause"], "LOST_STRUCTURE")
        self.assertEqual(r["recoverability"], "RECOVERABLE")
        self.assertEqual(r["truthAxisGroups"], ["g-L"])
        self.assertGreater(r["lengthMm"], 8)
        self.assertAlmostEqual(pieza(cov, "p-L")["own"]["recall"], 0.5, delta=0.1)

    def test_b_satin_sin_cubrir_atribuido_a_su_satin(self) -> None:
        cov = medida(satin_sin_cubrir())
        r = region(cov, "p-S")
        self.assertEqual((r["cause"], r["object"]), ("UNDERCOVERED_SATIN", "S"))
        self.assertEqual(r["attribution"][0]["objectId"], "S")
        self.assertGreater(r["attribution"][0]["share"], 0.9)
        self.assertTrue(r["significant"])

    def test_c_hueco_de_relleno_se_detecta(self) -> None:
        cov = medida(relleno_con_hueco())
        r = region(cov, "p-F")
        self.assertEqual(r["cause"], "UNDERCOVERED_FILL")
        self.assertAlmostEqual(r["areaMm2"], 18, delta=4)  # 4 × 4 del hueco, más lo que la puntada de 1 mm salta

    def test_d_solo_el_filo_es_borde(self) -> None:
        cov = medida(borde())
        self.assertTrue(all(r["cause"] in ("EDGE_UNDERCOVERAGE", "MICRO_DETAIL") for r in cov["regions"]), [(r["cause"], r["widthMm"]) for r in cov["regions"]])
        self.assertEqual(cov["significantUncoveredMm2"], 0)

    def test_f_el_hilo_de_otro_no_cubre_a(self) -> None:
        cov = medida(otro_color())
        r = region(cov, "p-A")
        self.assertEqual(r["cause"], "UNDERCOVERED_FILL")
        self.assertGreater(r["physicallyCoveredRatio"], 0.9)  # físicamente hay hilo (de B) …
        a = pieza(cov, "p-A")
        self.assertLess(a["own"]["recall"], a["physical"]["recall"] - 0.3)  # … pero no es SU hilo
        self.assertGreater(pieza(cov, "p-B")["own"]["outsideMm2"], 10)  # y el de B cae fuera de SU pieza

    def test_g_micro_detalle_no_se_repara(self) -> None:
        cov = medida(micro())
        # 0.16 mm² < una huella de hilo: cuenta en `causes`, sin entrada propia en la lista de regiones.
        self.assertFalse([r for r in cov["regions"] if r["pieceId"] == "p-m"])
        self.assertEqual(cov["causes"]["MICRO_DETAIL"]["regions"], 1)
        self.assertAlmostEqual(cov["causes"]["MICRO_DETAIL"]["areaMm2"], 0.16, delta=0.01)
        self.assertEqual(cov["significantUncoveredMm2"], 0)
        informe, _ = reparar(micro())
        self.assertFalse(informe["coverage"]["attempted"])

    def test_global_a_los_dos_lados(self) -> None:
        g = medida(satin_sin_cubrir())["global"]
        for lado in ("own", "physical"):
            self.assertIn("recall", g[lado])
            self.assertIn("precision", g[lado])
            self.assertIn("outsideMm2", g[lado])
        self.assertAlmostEqual(g["originalAreaMm2"], 40, delta=0.5)
        self.assertGreater(g["own"]["threadAreaMm2"], 0)
        self.assertEqual(g["own"]["outsideRatio"], round(g["own"]["outsideMm2"] / g["own"]["threadAreaMm2"], 4))

    def test_por_grupo_objeto_y_region(self) -> None:
        cov = medida(otro_color())
        grupos = {x["groupId"]: x for x in cov["groups"]}
        objetos = {x["objectId"]: x for x in cov["objects"]}
        self.assertLess(grupos["g-A"]["ownRecall"], 0.8)  # A, sin su hilo en el centro
        self.assertGreater(objetos["B"]["outsideMm2"], 10)  # B cose fuera de SU pieza
        self.assertEqual(objetos["A"]["outsideMm2"], 0)
        r = region(cov, "p-A")
        self.assertEqual(r["truthGroupIds"], ["g-A"])
        self.assertFalse(r["isolated"])
        self.assertIn("destino", r["lineage"])
        # Las incidencias, informativas: no cambian el estado.
        codigos = {i["code"]: i["severity"] for i in cob.incidencias(medida(linea_perdida()))}
        self.assertEqual(codigos, {"COVERAGE_LOST": "info"})
        self.assertGreaterEqual(cov["classificationMs"], 0)


# ─── Reparación ──────────────────────────────────────────────────────────

class Reparar(unittest.TestCase):
    def test_a_linea_perdida_se_recupera_por_el_eje(self) -> None:
        informe, _ = reparar(linea_perdida())
        c = informe["coverage"]
        self.assertTrue(c["selected"])
        t = c["triggers"][0]
        self.assertEqual((t["cause"], t["selected"]), ("LOST_STRUCTURE", "B"))
        b = t["candidates"][0]
        self.assertEqual(b["strategy"], "running-truth-axis")
        self.assertLess(b["coverage"]["local"]["uncoveredAfterMm2"], 0.5 * b["coverage"]["local"]["uncoveredBeforeMm2"])
        self.assertLessEqual(b["coverage"]["local"]["outsideAfterMm2"], b["coverage"]["local"]["outsideBeforeMm2"] + 0.1)  # sin naranja nuevo
        nuevo = next(o for o in informe["design"]["objects"] if o.get("repair", {}).get("recovered"))
        self.assertEqual(nuevo["stitch"]["type"], "running")
        self.assertEqual(nuevo["identity"]["pieces"], ["p-L"])
        self.assertEqual(nuevo["identity"]["groups"], ["g-L"])
        # El objeto que ya había sigue igual (se añade, no se toca).
        self.assertEqual(next(o for o in informe["design"]["objects"] if o["id"] == "L"), linea_perdida()["objects"][0])
        self.assertGreater(c["after"]["own"]["recall"], c["before"]["own"]["recall"] + 0.3)

    def test_b_satin_sin_cubrir_se_repara(self) -> None:
        informe, _ = reparar(satin_sin_cubrir())
        t = informe["coverage"]["triggers"][0]
        self.assertEqual(t["cause"], "UNDERCOVERED_SATIN")
        self.assertIn("remapear no cambia nada", t["candidates"][0]["rejections"][0])  # columna recta
        c = t["candidates"][1]
        self.assertEqual((c["strategy"], t["selected"]), ("fill", "C"))
        # El relleno simulado deja su filo de 0.2 mm (su primera fila a 0.225 del borde): no es 100 %.
        self.assertGreater(informe["coverage"]["after"]["own"]["recall"], informe["coverage"]["before"]["own"]["recall"] + 0.15)
        self.assertEqual(c["coverage"]["global"]["significantAfterMm2"], 0)

    def test_c_sin_estrategia_de_relleno_no_se_intenta(self) -> None:
        informe, coser = reparar(relleno_con_hueco())
        self.assertFalse(informe["coverage"]["attempted"])
        self.assertEqual(coser.llamadas, 1)

    def test_e_tapar_el_counter_se_rechaza(self) -> None:
        estrategias = {**rep.COBERTURA_ESTRATEGIAS, "UNDERCOVERED_FILL": ("tapar",)}
        rep_orig = rep.COBERTURA_ESTRATEGIAS
        rep.COBERTURA_ESTRATEGIAS = estrategias
        try:
            def tapar(o, contexto):
                return {}, [{"geometry": {"kind": "path", "d": rep.d_de([rect(10, 40, 20, 50)], cerrar=True), "fillRule": "evenodd"}, "stitch": {"type": "fill", **rep.RELLENO_V5, "underlay": False, "trimAfter": False}, "colorId": "c0", "_puntos": rect(10, 40, 20, 50)}]
            informe, _ = reparar(anillo(), generadores={"tapar": tapar})
        finally:
            rep.COBERTURA_ESTRATEGIAS = rep_orig
        b = informe["coverage"]["triggers"][0]["candidates"][0]
        self.assertFalse(b["accepted"])
        self.assertTrue(any("TOPOLOGY_HOLE_LOST" in r for r in b["rejections"]), b["rejections"])
        self.assertGreater(b["coverage"]["global"]["recallAfter"], b["coverage"]["global"]["recallBefore"])  # el recall SÍ sube
        self.assertFalse(informe["coverage"]["selected"])

    def test_e_recuperar_el_anillo_respeta_su_counter(self) -> None:
        # La forma de lo recuperado es la de la VERDAD (su contorno, con el counter fuera): no lo tapa.
        cov = medida(anillo_perdido())
        r = region(cov, "p-R")
        self.assertEqual((r["cause"], r["recoverability"], r["nearCounter"]), ("LOST_STRUCTURE", "RECOVERABLE", True))
        informe, _ = reparar(anillo_perdido())
        t = informe["coverage"]["triggers"][0]
        self.assertIn("no-candidate", t["candidates"][0]["rejections"][0])  # sin eje, no hay corrido
        c = t["candidates"][1]
        self.assertEqual(c["strategy"], "fill-truth-region")
        self.assertTrue(c["accepted"], c["rejections"])
        self.assertEqual(c["validation"]["structureRegressions"], {})
        self.assertNotIn("TOPOLOGY_HOLE_LOST", informe["after"]["structureIssues"])
        self.assertGreater(informe["coverage"]["after"]["own"]["recall"], informe["coverage"]["before"]["own"]["recall"] + 0.2)

    def test_h_la_trampa_de_overdraw_pierde(self) -> None:
        estrategias = {**rep.COBERTURA_ESTRATEGIAS, "UNDERCOVERED_SATIN": ("gordo", "fill")}
        rep_orig = rep.COBERTURA_ESTRATEGIAS
        rep.COBERTURA_ESTRATEGIAS = estrategias
        try:
            informe, _ = reparar(satin_sin_cubrir(), generadores={"gordo": cubrir_con(4.0)})
        finally:
            rep.COBERTURA_ESTRATEGIAS = rep_orig
        t = informe["coverage"]["triggers"][0]
        b, c = t["candidates"]
        self.assertFalse(b["accepted"])
        self.assertTrue(any("overdraw" in r for r in b["rejections"]), b["rejections"])
        self.assertGreater(b["coverage"]["local"]["outsideAfterMm2"], b["coverage"]["local"]["outsideBeforeMm2"] + 10)  # el naranja, junto a la región
        self.assertEqual(t["selected"], "C")

    def test_presupuesto_de_reparaciones(self) -> None:
        # Siete líneas perdidas: se intentan las MAX_REPARACIONES_DE_COBERTURA de más área, el resto se aplaza.
        objetos, verdad, estructura = [], [], []
        for k in range(rep.MAX_REPARACIONES_DE_COBERTURA + 2):
            y = 5.0 + 6 * k
            o = t41.objeto(f"L{k}", "running", rep.d_de([[(10.0, y), (20.0, y)]]))
            objetos.append(o)
            verdad.append({"id": f"p-L{k}", "anillos": [rect(10, y - 0.15, 30 + k, y + 0.15)]})
            estructura.append({"id": f"g-L{k}", "largoMm": 20 + k, "ejes": [rep.d_de([[(10.0 + i, y) for i in range(21 + k)]])], "uniones": []})
        d = diseno(objetos, verdad, estructura=estructura)
        informe, _ = reparar(d)
        c = informe["coverage"]
        self.assertEqual(len(c["triggers"]), rep.MAX_REPARACIONES_DE_COBERTURA)
        self.assertEqual(len(c["deferred"]), 2)
        self.assertIn("presupuesto", c["deferred"][0]["reason"])
        # Los aplazados son los de MENOS área (las líneas más cortas).
        self.assertEqual(sorted(x["regions"][0] for x in c["deferred"]), ["p-L0-u1", "p-L1-u1"])

    def test_un_error_de_tecnica_nuevo_se_rechaza_sin_recursion(self) -> None:
        # La "recuperación" es un satin colapsado: trae SATIN_COLLAPSED y no abre una ronda de técnica.
        estrategias = {**rep.COBERTURA_ESTRATEGIAS, "LOST_STRUCTURE": ("colapsa",)}
        rep_orig = rep.COBERTURA_ESTRATEGIAS
        rep.COBERTURA_ESTRATEGIAS = estrategias
        try:
            def colapsa(o, contexto):
                d = t41.satin_rails(20, 30, 29.95, 30.05)
                return {}, [{"geometry": {"kind": "path", "d": d}, "stitch": dict(t41.objeto("x", "satin", d)["stitch"]), "quality": {"averageWidthMm": 0.1}, "colorId": "c0", "_puntos": [p for s_ in idn._subpaths(d) for p in s_]}]
            informe, coser = reparar(linea_perdida(), generadores={"colapsa": colapsa})
        finally:
            rep.COBERTURA_ESTRATEGIAS = rep_orig
        b = informe["coverage"]["triggers"][0]["candidates"][0]
        self.assertFalse(b["accepted"])
        self.assertTrue(any("ERROR nuevo" in r and "SATIN_COLLAPSED" in r for r in b["rejections"]), b["rejections"])
        self.assertEqual(coser.llamadas, 2)  # el de partida y el candidato: nada más
        self.assertFalse(informe["selected"])

    def test_lo_tapado_por_otro_hilo_no_se_repara(self) -> None:
        # La mitad perdida de la línea de A ya tiene encima el corrido de B (otro color, otra pieza).
        d = linea_perdida()
        b = t41.objeto("B", "running", rep.d_de([[(20.5, 30.0), (30.0, 30.0)]]))
        b["colorId"] = "c1"
        d["objects"].append(b)
        d["colors"].append({"id": "c1", "sourceHex": "#aa0000", "displayHex": "#aa0000"})
        cov = medida(d)
        r = region(cov, "p-L")
        self.assertEqual(r["cause"], "LOST_STRUCTURE")  # el hilo de B no cubre A …
        self.assertGreater(r["physicallyCoveredRatio"], 0.8)  # … aunque físicamente haya hilo
        informe, coser = reparar(d)
        self.assertFalse(informe["coverage"]["attempted"])
        self.assertIn("hilo de otro objeto", informe["coverage"]["skipped"][0]["reason"])
        self.assertEqual(coser.llamadas, 1)

    def test_sanos_no_se_tocan(self) -> None:
        for d in (borde(), micro()):
            informe, coser = reparar(d)
            self.assertFalse(informe["selected"])
            self.assertIs(informe["design"], d)
            self.assertEqual(coser.llamadas, 1)


class Puntuacion(unittest.TestCase):
    def cand(self, cid, estructura=0, tecnica=0, perdidas=0, significativa=0.0, recall=0.9, fuera=0.0, distorsion=0.0):
        return {"id": cid, "validation": {"structureRegressions": {"X": ["a"] * estructura}, "techniqueErrors": tecnica}, "lostPieces": perdidas,
                "coverage": {"global": {"significantAfterMm2": significativa, "recallAfter": recall, "outsideAfterMm2": fuera}},
                "metrics": {"geometryDistortion": distorsion}, "modifiedObjects": ["x"]}

    def test_orden_lexicografico(self) -> None:
        p = rep.puntuacion_de_cobertura
        # Un +10 % de recall no compensa nada de lo que va antes.
        self.assertLess(p(self.cand("B", recall=0.8)), p(self.cand("C", estructura=1, recall=0.9)))
        self.assertLess(p(self.cand("B", recall=0.8)), p(self.cand("C", tecnica=1, recall=0.9)))
        self.assertLess(p(self.cand("B", recall=0.8)), p(self.cand("C", perdidas=1, recall=0.9)))
        self.assertLess(p(self.cand("B", recall=0.8)), p(self.cand("C", significativa=1.0, recall=0.9)))
        # A igual rojo significativo, más recall; a igual recall, menos hilo fuera; luego, menos distorsión.
        self.assertLess(p(self.cand("C", recall=0.95)), p(self.cand("B", recall=0.9)))
        self.assertLess(p(self.cand("C", fuera=0.5)), p(self.cand("B", fuera=2.0)))
        self.assertLess(p(self.cand("C", distorsion=0.01)), p(self.cand("B", distorsion=0.2)))
        # Empate: el id decide (determinista).
        self.assertLess(p(self.cand("B")), p(self.cand("C")))

    def test_un_solo_selector(self) -> None:
        # Técnica y cobertura eligen con la misma puntuación: un candidato de técnica que deja 3 mm² sin
        # hilo pierde contra otro de la misma distorsión (mismo escalón) que no deja nada.
        self.assertIs(rep.puntuacion_de_cobertura, rep.puntuacion)
        tecnica = lambda cid, sig, geo: {"id": cid, "validation": {"structureRegressions": {}, "techniqueErrors": 0}, "coverage": {"global": {"significantAfterMm2": sig, "recallAfter": 0.99, "outsideAfterMm2": 1.0}}, "metrics": {"geometryDistortion": 0.06, "techniqueChanged": False, "satinObliquityP95Deg": geo, "stitchDeltaRatio": 0.0}, "modifiedObjects": ["x"]}  # noqa: E731
        self.assertLess(rep.puntuacion(tecnica("D", 0.0, 30.0)), rep.puntuacion(tecnica("C", 3.0, 5.0)))
        # Sin cobertura medida (una preparación sin malla), el orden es el de V6.4.2: gana la geometría.
        sin = lambda cid, geo: {**tecnica(cid, 0, geo), "coverage": {"global": {}}}  # noqa: E731
        self.assertLess(rep.puntuacion(sin("C", 5.0)), rep.puntuacion(sin("B", 30.0)))


# ─── Propiedades ─────────────────────────────────────────────────────────

def mover(d: dict, f) -> dict:
    """El diseño entero por `f` (objetos, verdad, sondas, ejes, counters) y su malla repintada."""
    x = t41.transformar(d, f)
    return x


def rehacer_malla(d: dict, verdad: list[dict], paso: float = 0.1, colores=("#112233",)) -> dict:
    d = copy.deepcopy(d)
    d["preparation"]["verdad"][0]["malla"] = cob.malla_de_poligonos(verdad, CAJA, paso, list(colores))
    return d


def sin_tiempos(x):
    """Lo que tiene que ser idéntico entre dos corridas: todo menos los tiempos (…Ms, ms)."""
    if isinstance(x, dict):
        return {k: sin_tiempos(v) for k, v in x.items() if not (k == "ms" or k.endswith("Ms"))}
    if isinstance(x, list):
        return [sin_tiempos(v) for v in x]
    return x


class Propiedades(unittest.TestCase):
    def _satin_movido(self, f) -> dict:
        # El satin y su hueco también se mueven (el hueco es de prueba: una caja en mm).
        d = satin_sin_cubrir()
        verdad = [{"id": "p-S", "anillos": [[f(p) for p in rect(10, 10, 30, 12)]]}]
        x = rehacer_malla(t41.transformar(d, f), verdad)
        return x

    def test_traslacion(self) -> None:
        a = medida(satin_sin_cubrir())
        f = lambda p: (p[0] + 13.2, p[1] + 4.7)  # noqa: E731
        d = t41.transformar(satin_sin_cubrir(), f)
        d["objects"][0]["stitch"]["_simulaHueco"] = [33.2, 39.2, 0, 99]
        d = rehacer_malla(d, [{"id": "p-S", "anillos": [[f(p) for p in rect(10, 10, 30, 12)]]}])
        b = medida(d)
        self.assertAlmostEqual(a["global"]["own"]["recall"], b["global"]["own"]["recall"], delta=0.01)
        self.assertAlmostEqual(region(a, "p-S")["areaMm2"], region(b, "p-S")["areaMm2"], delta=0.3)
        self.assertEqual(region(a, "p-S")["cause"], region(b, "p-S")["cause"])

    def test_rotacion(self) -> None:
        # En la rejilla mínima de producción (0.05 mm) el recall es estable a ±0.01. En 0.1 mm, a 137°,
        # el redondeo del DST (0.1 mm) contra un trazo de 0.3 deja migas en el filo: son MICRO (no
        # cuentan) y la región perdida, la significativa, no cambia.
        for paso, tolerancia in ((0.05, 0.01), (0.1, 0.06)):
            verdad = [{"id": "p-L", "anillos": [rect(10, 29.85, 30, 30.15)]}]
            a = medida(rehacer_malla(linea_perdida(), verdad, paso))
            for angulo in (30, 90, 137):
                c, s = math.cos(math.radians(angulo)), math.sin(math.radians(angulo))
                f = lambda p: (35 + (p[0] - 20) * c - (p[1] - 30) * s, 27 + (p[0] - 20) * s + (p[1] - 30) * c)  # noqa: E731
                b = medida(rehacer_malla(t41.transformar(linea_perdida(), f), [{"id": "p-L", "anillos": [[f(p) for p in rect(10, 29.85, 30, 30.15)]]}], paso))
                msg = f"{paso} mm, {angulo}°"
                self.assertAlmostEqual(a["global"]["own"]["recall"], b["global"]["own"]["recall"], delta=tolerancia, msg=msg)
                self.assertEqual(region(b, "p-L")["cause"], "LOST_STRUCTURE", msg)
                self.assertAlmostEqual(a["significantUncoveredMm2"], b["significantUncoveredMm2"], delta=0.05 * a["significantUncoveredMm2"], msg=msg)
                self.assertTrue(all(r["cause"] == "MICRO_DETAIL" for r in b["regions"] if r["id"] != region(b, "p-L")["id"]), msg)

    def test_aislamiento_de_identidad(self) -> None:
        # El hilo de otro objeto (otra pieza, otro color) encima de A no cambia la cobertura PROPIA de A.
        d = otro_color()
        sin_b = copy.deepcopy(d)
        sin_b["objects"] = [o for o in d["objects"] if o["id"] != "B"]
        a1, a2 = pieza(medida(d), "p-A"), pieza(medida(sin_b), "p-A")
        self.assertEqual(a1["own"], a2["own"])
        self.assertGreater(a1["physical"]["recall"], a2["physical"]["recall"])

    def test_resolucion(self) -> None:
        d = satin_sin_cubrir()
        verdad = [{"id": "p-S", "anillos": [rect(10, 10, 30, 12)]}]
        r10 = medida(rehacer_malla(d, verdad, 0.1))["global"]["own"]["recall"]
        r05 = medida(rehacer_malla(d, verdad, 0.05))["global"]["own"]["recall"]
        self.assertAlmostEqual(r10, r05, delta=0.015)

    def test_determinista(self) -> None:
        a = json.dumps(medida(satin_sin_cubrir()), sort_keys=True, default=str)
        b = json.dumps(medida(satin_sin_cubrir()), sort_keys=True, default=str)
        self.assertEqual(json.loads(a)["regions"], json.loads(b)["regions"])
        i1, _ = reparar(linea_perdida())
        i2, _ = reparar(linea_perdida())
        self.assertEqual(json.dumps(sin_tiempos(i1["coverage"]), sort_keys=True, default=str), json.dumps(sin_tiempos(i2["coverage"]), sort_keys=True, default=str))
        self.assertEqual(json.dumps(i1["design"], sort_keys=True), json.dumps(i2["design"], sort_keys=True))

    def test_monotonia_hilo_propio_dentro(self) -> None:
        # Añadir hilo PROPIO dentro de la región sin cubrir no puede empeorar el recall.
        d = satin_sin_cubrir()
        antes = medida(d)["global"]["own"]["recall"]
        extra = t41.objeto("S2", "running", rep.d_de([[(21.0, 11.0), (25.0, 11.0)]]))
        extra["identity"] = {"id": "ir-S2", "groups": ["g-S"], "pieces": ["p-S"], "parents": []}
        d2 = copy.deepcopy(d)
        d2["objects"].append(extra)
        self.assertGreaterEqual(medida(d2)["global"]["own"]["recall"], antes)

    def test_hilo_solo_fuera_no_mejora(self) -> None:
        d = satin_sin_cubrir()
        m0 = medida(d)["global"]["own"]
        extra = t41.objeto("S3", "running", rep.d_de([[(10.0, 20.0), (30.0, 20.0)]]))
        extra["identity"] = {"id": "ir-S3", "groups": ["g-S"], "pieces": ["p-S"], "parents": []}
        d2 = copy.deepcopy(d)
        d2["objects"].append(extra)
        m1 = medida(d2)["global"]["own"]
        self.assertEqual(m0["recall"], m1["recall"])
        self.assertGreater(m1["outsideMm2"], m0["outsideMm2"] + 5)


if __name__ == "__main__":
    unittest.main()
