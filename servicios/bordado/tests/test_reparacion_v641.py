"""V6.4.1: la reparación de técnica (`reparacion.py`), REPAIR FAST.

Sin Ink/Stitch: un digitalizador simulado (`digitalizar`) cose cada objeto con la
forma que le da Ink/Stitch (zigzag de rail a rail partido a 6.3 mm, filas de
relleno, corrido cada 2.2 mm) y el MISMO juicio del motor (`juzgar_cosido`:
identidad, verdad, estructura, técnica) mide el resultado. Con Ink/Stitch real,
los casos de `pruebas-bordado/v6.4.1` (REPAIR TARGETED).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_reparacion_v641.py'
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

import identidad as idn  # noqa: E402
import motor  # noqa: E402
import reparacion as rep  # noqa: E402
from test_solape_v5 import V5  # noqa: E402

Punto = tuple[float, float]


# ─── Un digitalizador simulado ───────────────────────────────────────────

def _partir(a: Punto, b: Punto, maximo: float) -> list[Punto]:
    n = max(1, math.ceil(math.dist(a, b) / maximo))
    return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(1, n + 1)]


def _satin(o: dict) -> list[Punto]:
    r1, r2, rungs = rep.rails_y_rungs(o)
    # zigzag_spacing de Ink/Stitch es de zig a zig: una pierna cada media separación.
    ps, _ = rep.pares(r1, r2, rungs, paso=float(o["stitch"].get("spacingMm", 0.42)) / 2)
    zig = [a if i % 2 == 0 else b for i, (a, b) in enumerate(ps)]
    puntos = [zig[0]]
    for q in zig[1:]:
        puntos += _partir(puntos[-1], q, 6.3)  # max_stitch_length de v5
    return puntos


def _corrido(o: dict) -> list[Punto]:
    puntos: list[Punto] = []
    pasadas = 1 + 2 * int(o["stitch"].get("beanRepeats", 1))
    for linea in idn._subpaths(o["geometry"]["d"]):
        if len(linea) < 2 or sum(math.dist(p, q) for p, q in zip(linea, linea[1:])) < 1e-6:
            continue
        ida = [linea[0]]
        for q in linea[1:]:
            ida += _partir(ida[-1], q, 2.2)
        camino = list(ida)
        for k in range(1, pasadas):
            camino += (ida[::-1] if k % 2 else ida)[1:]
        puntos += camino
    return puntos


def _relleno(o: dict) -> list[Punto]:
    anillos = idn._subpaths(o["geometry"]["d"])
    ys = [p[1] for a in anillos for p in a]
    puntos: list[Punto] = []
    y, derecha = min(ys) + 0.225, True
    while y < max(ys):
        cortes = []
        for a in anillos:
            for p, q in zip(a, a[1:] + a[:1]):
                if (p[1] <= y < q[1]) or (q[1] <= y < p[1]):
                    cortes.append(p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]))
        cortes.sort()
        tramos = [(cortes[i] + 0.1, cortes[i + 1] - 0.1) for i in range(0, len(cortes) - 1, 2) if cortes[i + 1] - cortes[i] > 0.2]
        for x0, x1 in (tramos if derecha else [(b, a) for a, b in reversed(tramos)]):
            fila = [(x0, y)] + _partir((x0, y), (x1, y), 4.0)
            puntos += fila
        y += 0.45
        derecha = not derecha
    return puntos


def digitalizar(design: dict) -> tuple[pe.EmbPattern, dict]:
    """El DST y el mapa de identidad exacto (rangos por elemento) de un diseño, sin Ink/Stitch."""
    patron = pe.EmbPattern()
    elementos = []
    for k, o in enumerate(motor.ordered_objects(design)):
        tipo = o["stitch"]["type"]
        puntos = _satin(o) if tipo == "satin" else _corrido(o) if tipo == "running" else _relleno(o)
        if not puntos:
            elementos.append({"elemento": k, "puntadas": 0, "remates": 0, "rangos": [], "verificacion": {"estado": "completo"}})
            continue
        if patron.stitches:
            patron.add_stitch_absolute(pe.TRIM, *patron.stitches[-1][:2])
        patron.add_stitch_absolute(pe.JUMP, round(puntos[0][0] * 10), round(puntos[0][1] * 10))
        a = len(patron.stitches)
        for x, y in puntos:
            patron.add_stitch_absolute(pe.STITCH, round(x * 10), round(y * 10))
        elementos.append({"elemento": k, "puntadas": len(puntos), "remates": 0, "rangos": [[a, len(patron.stitches) - 1]], "verificacion": {"estado": "completo"}})
    mapa = {"verificado": True, "elementos": elementos, "sinPuntadas": [e["elemento"] for e in elementos if not e["puntadas"]], "incompletos": [], "enlaces": [], "comandos": {}, "marco": {"dx": 0.0, "dy": 0.0, "residuoMm": 1e-6, "redondeoDelDstMm": 0.05}}
    return patron, mapa


class Coser:
    """El `coser` de motor.py con el digitalizador simulado; cuenta cuántas veces se llama."""

    def __init__(self) -> None:
        self.llamadas = 0
        self.tmp = Path(tempfile.mkdtemp())

    def __call__(self, design: dict, carpeta: Path | None = None) -> dict:
        self.llamadas += 1
        patron, mapa = digitalizar(design)
        directorio = self.tmp / f"c{self.llamadas}"
        directorio.mkdir(parents=True, exist_ok=True)
        cosido = motor.juzgar_cosido(design, directorio, None, patron, motor.metricas_de_dst(patron), mapa, "", {})
        return {**cosido, "dst": None, "engine_ms": 0.0, "cacheHit": False, "cacheKey": None}


# ─── Diseños sintéticos (con su verdad, su estructura y su linaje) ──────

def satin_rails(x0: float, x1: float, y0: float, y1: float) -> str:
    arriba = [(x0 + (x1 - x0) * i / 8, y0) for i in range(9)]
    abajo = [(x0 + (x1 - x0) * i / 8, y1) for i in range(9)]
    rungs = [[(x, y0 - 0.12), (x, y1 + 0.12)] for x in (x0 + 0.5, (x0 + x1) / 2, x1 - 0.5)]
    return rep.d_de([arriba, abajo, *rungs])


def objeto(ident: str, tipo: str, d: str, **stitch) -> dict:
    base = {"satin": {"type": "satin", "satinMode": "rails", "spacingMm": 0.42, "pullCompensationMm": 0.15, "underlay": True, "trimAfter": False},
            "running": {"type": "running", "strokeWidthMm": 0.3, "maxStitchLengthMm": 4, "trimAfter": False, "beanRepeats": 0},
            "fill": {"type": "fill", "spacingMm": 0.45, "angleDeg": 45, "maxStitchLengthMm": 4, "underlay": True, "pullCompensationMm": 0.15, "trimAfter": False}}[tipo]
    puntos = [p for s in idn._subpaths(d) for p in s]
    geometry = {"kind": "path", "d": d, **({"fillRule": "evenodd"} if tipo == "fill" else {})}
    return {"id": ident, "sourceObjectId": "t", "sourceType": "vector", "classification": "logo", "colorId": "c0", "geometry": geometry, "stitch": {**base, **stitch},
            "bounds": rep._caja(puntos), "nodeCount": rep._nodos(d), "identity": {"id": f"ir-{ident}", "groups": [f"g-{ident}"], "pieces": [f"p-{ident}"], "parents": [f"a-{ident}"]}}


def sondas(x0: float, x1: float, y: float) -> list[list[float]]:
    return [[x0 + (x1 - x0) * (i + 0.5) / 8, y] for i in range(8)]


def diseno(objetos: list[dict], piezas: list[dict], estructura: list[dict] | None = None, counters: list[dict] | None = None) -> dict:
    nodos = [{"id": f"a-{o['id']}", "etapa": "area", "padres": []} for o in objetos] + [{"id": o["identity"]["id"], "etapa": "objetos", "padres": [f"a-{o['id']}"]} for o in objetos]
    return {
        "schemaVersion": 1, "engineVersion": "inkstitch-3.3.0", "profileVersion": V5,
        "physical": {"widthMm": 90, "heightMm": 60}, "bounds": {"xMm": 1, "yMm": 1, "widthMm": 88, "heightMm": 58},
        "colors": [{"id": "c0", "sourceHex": "#112233", "displayHex": "#112233"}],
        "objects": objetos, "metrics": {},
        "preparation": {
            "profileVersion": V5, "issues": [], "estructura": estructura or [],
            "verdad": [{"id": "o0", "origen": "svg", "resolucionMm": 0.02, "componentes": piezas, "counters": counters or [], "countersIR": []}],
            "linaje": [{"id": "o0", "nodos": nodos,
                        "grupos": [{"id": f"g-{o['id']}", "destino": "preserved", "sucesos": [], "objetos": [o["identity"]["id"]]} for o in objetos],
                        "piezas": [{"id": f"p-{o['id']}", "destino": "preserved", "sucesos": [], "objetos": [o["identity"]["id"]]} for o in objetos]}],
        },
    }


def pieza(ident: str, x0: float, x1: float, y: float, ancho: float) -> dict:
    return {"id": f"p-{ident}", "sondas": sondas(x0, x1, y), "anchoMm": ancho, "incierto": False, "enIR": "conservada"}


def ancho() -> dict:
    """Un satin de 9 mm de rail a rail (SATIN_PASS_TOO_WIDE)."""
    return diseno([objeto("w", "satin", satin_rails(10, 30, 10, 19))], [pieza("w", 10, 30, 14.5, 9)])


def colapsado(con_eje: bool = True) -> dict:
    """Un satin de 0.1 mm (SATIN_COLLAPSED) sobre el eje de un trazo fino de la verdad."""
    eje = rep.d_de([[(10 + 2 * i, 30.0) for i in range(11)]])
    return diseno([objeto("c", "satin", satin_rails(10, 30, 29.95, 30.05))], [pieza("c", 10, 30, 30, 0.1)],
                  estructura=[{"id": "g-c", "largoMm": 20, "ejes": [eje] if con_eje else [], "uniones": []}])


def sano(ident: str, tipo: str, y: float) -> tuple[dict, dict]:
    if tipo == "satin":
        return objeto(ident, "satin", satin_rails(40, 60, y, y + 2)), pieza(ident, 40, 60, y + 1, 2)
    if tipo == "running":
        return objeto(ident, "running", rep.d_de([[(40, y), (60, y)]])), pieza(ident, 40, 60, y, 0.3)
    return objeto(ident, "fill", rep.d_de([[(40, y), (50, y), (50, y + 8), (40, y + 8)]], cerrar=True)), {"id": f"p-{ident}", "sondas": [[42 + 2 * i, y + 4] for i in range(4)], "anchoMm": 8, "incierto": False, "enIR": "conservada"}


def con(design: dict, *extras: tuple[dict, dict]) -> dict:
    d = copy.deepcopy(design)
    for o, p in extras:
        d["objects"].append(o)
        d["preparation"]["verdad"][0]["componentes"].append(p)
        l = d["preparation"]["linaje"][0]
        l["nodos"] += [{"id": f"a-{o['id']}", "etapa": "area", "padres": []}, {"id": o["identity"]["id"], "etapa": "objetos", "padres": [f"a-{o['id']}"]}]
        l["grupos"].append({"id": f"g-{o['id']}", "destino": "preserved", "sucesos": [], "objetos": [o["identity"]["id"]]})
        l["piezas"].append({"id": f"p-{o['id']}", "destino": "preserved", "sucesos": [], "objetos": [o["identity"]["id"]]})
    return d


def transformar(design: dict, f) -> dict:
    """El diseño entero (geometría, verdad, estructura) por la transformación `f`."""
    d = copy.deepcopy(design)
    for o in d["objects"]:
        subs = [[f(p) for p in s] for s in idn._subpaths(o["geometry"]["d"])]
        o["geometry"]["d"] = rep.d_de(subs, cerrar=o["stitch"]["type"] == "fill")
        o["bounds"] = rep._caja([p for s in subs for p in s])
    for c in d["preparation"]["verdad"][0]["componentes"]:
        c["sondas"] = [list(f(tuple(s))) for s in c["sondas"]]
    for h in d["preparation"]["verdad"][0]["counters"]:
        h["polo"] = list(f(tuple(h["polo"])))
    for g in d["preparation"]["estructura"]:
        g["ejes"] = [rep.d_de([[f(p) for p in s] for s in idn._subpaths(e)]) for e in g["ejes"]]
    return d


def reparar(design: dict, **kw) -> tuple[dict, Coser]:
    coser = Coser()
    base = coser(design)
    informe = rep.reparar(design, base, coser.tmp / "rep", coser, **kw)
    return informe, coser


def candidato(informe: dict, oid: str, cid: str) -> dict:
    return next(c for o in informe["objects"] if o["objectId"] == oid for c in o["candidates"] if c["id"] == cid)


def tecnica_final(informe: dict) -> dict:
    return rep._errores_de_tecnica(Coser()(informe["design"]))


# ─── Casos ───────────────────────────────────────────────────────────────

class PasadaDemasiadoAncha(unittest.TestCase):
    def test_el_simulador_reproduce_el_error(self) -> None:
        self.assertEqual(rep._errores_de_tecnica(Coser()(ancho())), {"w": ["SATIN_PASS_TOO_WIDE"]})

    def test_candidatos_y_eleccion(self) -> None:
        informe, coser = reparar(ancho())
        o = informe["objects"][0]
        self.assertEqual([c["strategy"] for c in o["candidates"]], ["original", "split-satin", "satin-remapped", "split-satin-remapped", "fill"])
        self.assertFalse(o["candidates"][0]["accepted"])  # A: el original, rechazado por su ERROR
        self.assertEqual(candidato(informe, "w", "B")["parameters"]["columns"], 2)
        # V6.4.2: en una columna recta el remapeo empareja igual que la proporción: C y D no existen.
        for cid in ("C", "D"):
            self.assertIn("remapear no cambia nada", candidato(informe, "w", cid)["rejections"][0])
        self.assertEqual(o["accepted"], ["B", "E"])
        # Empate visual de área (< 5 %): gana el que conserva la técnica (satin).
        self.assertEqual(o["selected"], "B")
        self.assertTrue(informe["selected"])
        self.assertEqual(tecnica_final(informe), {"w-r0": [], "w-r1": []})
        self.assertEqual(coser.llamadas, 1 + 2)  # base + 2 candidatos: sin recursión
        # before / after / delta del aceptado.
        b = candidato(informe, "w", "B")
        self.assertIn("coverPassMm", b["after"]["w-r0"]["relevant"])
        self.assertLessEqual(b["after"]["w-r0"]["relevant"]["coverPassMm"]["max"], 6.4)
        self.assertEqual(b["validation"]["structureRegressions"], {})
        self.assertIn("stitchDelta", b["metrics"])

    def test_identidad_y_linaje_trazables(self) -> None:
        informe, _ = reparar(ancho())
        d = informe["design"]
        nuevos = [o for o in d["objects"] if o.get("repair")]
        self.assertEqual([o["id"] for o in nuevos], ["w-r0", "w-r1"])
        for o in nuevos:
            self.assertEqual(o["identity"]["parents"], ["ir-w"])
            self.assertEqual((o["identity"]["groups"], o["identity"]["pieces"]), (["g-w"], ["p-w"]))
        lin = d["preparation"]["linaje"][0]
        self.assertEqual({n["id"] for n in lin["nodos"] if n["etapa"] == "reparacion"}, {o["identity"]["id"] for o in nuevos})
        self.assertEqual(lin["piezas"][0]["objetos"], [o["identity"]["id"] for o in nuevos])
        self.assertEqual(lin["piezas"][0]["sucesos"][-1]["tipo"], "repaired")
        # identity.json del diseño reparado: la pieza de la verdad llega a los objetos nuevos y a sus rangos.
        cosido = Coser()(d)
        ident = motor.artefacto_de_identidad(d, cosido["optimized_order"], cosido["mapa"], "", cosido["plan_metrics"])
        traza = next(t for t in ident["lineage"][0]["truthTrace"] if t["id"] == "p-w")
        self.assertEqual(traza["irObjects"], [o["identity"]["id"] for o in nuevos])
        self.assertTrue(traza["stitchRanges"])

    def test_el_diseno_de_partida_no_se_toca(self) -> None:
        d = ancho()
        antes = json.dumps(d, sort_keys=True)
        reparar(d)
        self.assertEqual(json.dumps(d, sort_keys=True), antes)


class Colapsado(unittest.TestCase):
    def test_corrido_por_el_eje(self) -> None:
        informe, _ = reparar(colapsado())
        o = informe["objects"][0]
        self.assertEqual(o["trigger"]["code"], "SATIN_COLLAPSED")
        self.assertEqual(o["selected"], "B")
        b = candidato(informe, "c", "B")
        self.assertEqual(b["strategy"], "running-axis")
        self.assertGreaterEqual(b["parameters"]["axisCoverage"], 0.8)
        nuevo = next(x for x in informe["design"]["objects"] if x["id"] == "c-r0")
        self.assertEqual(nuevo["stitch"]["type"], "running")
        # Sigue el eje de la verdad, no uno nuevo: sus puntos son los del eje.
        eje = idn._subpaths(colapsado()["preparation"]["estructura"][0]["ejes"][0])[0]
        for p in idn._subpaths(nuevo["geometry"]["d"])[0]:
            self.assertLess(min(math.dist(p, q) for q in eje), 1e-3)
        self.assertEqual(tecnica_final(informe), {"c-r0": []})
        self.assertEqual(b["structureIssues"], [])

    def test_sin_eje_fiable_no_repara(self) -> None:
        d = colapsado(con_eje=False)
        informe, coser = reparar(d)
        o = informe["objects"][0]
        self.assertIsNone(o["selected"])
        self.assertIn("no-candidate", o["candidates"][1]["rejections"][0])
        self.assertFalse(informe["selected"])
        self.assertIs(informe["design"], d)
        self.assertEqual(coser.llamadas, 1)  # nada que coser

    def test_eje_que_no_cubre_la_columna_no_repara(self) -> None:
        d = colapsado()
        d["preparation"]["estructura"][0]["ejes"] = [rep.d_de([[(10.0, 30.0), (14.0, 30.0)]])]  # un 20 % de la columna
        informe, _ = reparar(d)
        self.assertIsNone(informe["objects"][0]["selected"])
        self.assertIn("cubre sólo", informe["objects"][0]["candidates"][1]["rejections"][0])


class Sanos(unittest.TestCase):
    def test_sanos_no_se_tocan(self) -> None:
        o1, p1 = sano("s", "satin", 10)
        o2, p2 = sano("r", "running", 20)
        o3, p3 = sano("f", "fill", 30)
        d = diseno([o1, o2, o3], [p1, p2, p3])
        self.assertEqual(rep._errores_de_tecnica(Coser()(d)), {"s": [], "r": [], "f": []})
        informe, coser = reparar(d)
        self.assertFalse(informe["attempted"])
        self.assertFalse(informe["selected"])
        self.assertIs(informe["design"], d)
        self.assertEqual(coser.llamadas, 1)

    def test_warning_e_info_no_disparan(self) -> None:
        falso = {"plan_metrics": {"technique": {"objects": [
            {"objectId": "a", "issues": [{"code": "RUNNING_DEGENERATE_PATH", "severity": "warning"}]},
            {"objectId": "b", "issues": [{"code": "TECHNIQUE_UNCERTAIN", "severity": "info"}]},
            {"objectId": "c", "issues": [{"code": "STITCH_NEAR_ZERO", "severity": "warning"}, {"code": "SATIN_PASS_TOO_WIDE", "severity": "warning"}]},
            {"objectId": "d", "issues": [{"code": "RUNNING_OFF_AXIS", "severity": "error"}]},  # ERROR sin estrategia
        ]}}}
        self.assertEqual(rep.objetivos(falso), [])


class Protecciones(unittest.TestCase):
    def test_quitar_el_objeto_no_es_reparar(self) -> None:
        # Con otro objeto al lado (si no, el contrato ya rechaza un diseño vacío).
        informe, _ = reparar(con(ancho(), sano("s", "satin", 40)), generadores={"borrar": lambda o, c: ({}, [])}, estrategias={"SATIN_PASS_TOO_WIDE": ("borrar",)})
        b = candidato(informe, "w", "B")
        self.assertFalse(b["accepted"])
        self.assertTrue(any("quita el objeto" in r for r in b["rejections"]))
        self.assertTrue(any("se pierden" in r for r in b["rejections"]))
        self.assertFalse(informe["selected"])

    def test_perder_un_counter_se_rechaza_aunque_la_tecnica_pase(self) -> None:
        # Un counter a 2 mm de la columna; el candidato rellena la columna y también el counter.
        d = ancho()
        d["preparation"]["verdad"][0]["counters"] = [{"id": "h1", "polo": [20, 22.5], "anchoMm": 2, "enIR": "conservada", "incierto": False}]

        def relleno_grande(o, contexto):
            anillo = [(9.0, 9.0), (31.0, 9.0), (31.0, 25.0), (9.0, 25.0)]
            return {"areaMm2": 352}, [{"geometry": {"kind": "path", "d": rep.d_de([anillo], cerrar=True), "fillRule": "evenodd"}, "stitch": {"type": "fill", **rep.RELLENO_V5, "underlay": True, "trimAfter": False}, "_puntos": anillo}]
        informe, _ = reparar(d, generadores={"grande": relleno_grande}, estrategias={"SATIN_PASS_TOO_WIDE": ("grande",)})
        b = candidato(informe, "w", "B")
        self.assertEqual(b["after"]["w-r0"]["techniqueIssues"], [])  # la técnica, bien
        self.assertIn("TOPOLOGY_HOLE_LOST", b["validation"]["structureRegressions"])
        self.assertFalse(b["accepted"])
        self.assertFalse(informe["selected"])

    def test_las_puntadas_de_otro_no_validan_a(self) -> None:
        # B (sano) cose justo encima de la columna de A; el candidato de A no cose nada.
        d = con(colapsado(), (objeto("b", "running", rep.d_de([[(10, 30), (30, 30)]])), pieza("b", 10, 30, 30, 0.3)))

        def vacio(o, contexto):
            return {}, [{"geometry": {"kind": "path", "d": "M20 30L20 30"}, "stitch": {"type": "running", "strokeWidthMm": 0.3, "maxStitchLengthMm": 4, "trimAfter": False, "beanRepeats": 0}, "_puntos": [(20.0, 30.0)]}]
        informe, _ = reparar(d, generadores={"vacio": vacio}, estrategias={"SATIN_COLLAPSED": ("vacio",)})
        b = candidato(informe, "c", "B")
        self.assertFalse(b["accepted"])
        self.assertTrue(any("no deja puntadas propias" in r for r in b["rejections"]))
        self.assertTrue(any("TOPOLOGY_COMPONENT_LOST" in r for r in b["rejections"]))

    def test_un_error_nuevo_se_rechaza_sin_recursion(self) -> None:
        # Una "reparación" que deja una columna colapsada: trae SATIN_COLLAPSED y no abre otra búsqueda.
        def colapsa(o, contexto):
            d = satin_rails(10, 30, 14.45, 14.55)
            return {}, [{"geometry": {"kind": "path", "d": d}, "stitch": dict(o["stitch"]), "quality": {"averageWidthMm": 0.1}, "_puntos": [p for s in idn._subpaths(d) for p in s]}]
        informe, coser = reparar(ancho(), generadores={"colapsa": colapsa}, estrategias={"SATIN_PASS_TOO_WIDE": ("colapsa",)})
        b = candidato(informe, "w", "B")
        self.assertFalse(b["accepted"])
        self.assertTrue(any("ERROR nuevo" in r and "SATIN_COLLAPSED" in r for r in b["rejections"]))
        self.assertEqual(coser.llamadas, 2)

    def test_presupuesto_de_objetos(self) -> None:
        extra = [(objeto(f"v{i}", "satin", satin_rails(40, 60, 2 + 7 * i, 8.5 + 7 * i)), pieza(f"v{i}", 40, 60, 5 + 7 * i, 6.5)) for i in range(rep.MAX_OBJETOS)]
        informe, _ = reparar(con(ancho(), *extra))
        self.assertEqual(len(informe["objects"]), rep.MAX_OBJETOS)
        self.assertEqual(len(informe["deferred"]), 1)
        self.assertIn("presupuesto", informe["deferred"][0]["reason"])

    def test_presupuesto_de_candidatos(self) -> None:
        muchos = {f"s{i}": (lambda o, c: rep.satin_dividido(o, c)) for i in range(8)}
        informe, coser = reparar(ancho(), generadores=muchos, estrategias={"SATIN_PASS_TOO_WIDE": tuple(muchos)})
        self.assertEqual(len(informe["objects"][0]["candidates"]), rep.MAX_CANDIDATOS)
        self.assertEqual(coser.llamadas, 1 + rep.MAX_CANDIDATOS - 1)


class Puntuacion(unittest.TestCase):
    def cand(self, cid, d, cambia, delta, objetos=1, errores=0, estructura=None):
        return {"id": cid, "validation": {"structureRegressions": estructura or {}, "techniqueErrors": errores}, "metrics": {"geometryDistortion": d, "techniqueChanged": cambia, "stitchDeltaRatio": delta}, "modifiedObjects": ["x"] * objetos}

    def test_orden_lexicografico(self) -> None:
        # Empate visual (mismo paso de 5 %): gana conservar la técnica aunque cosa más.
        self.assertLess(rep.puntuacion(self.cand("B", 0.04, False, 0.5)), rep.puntuacion(self.cand("C", 0.01, True, 0.0)))
        # Fuera del empate: gana el de menos distorsión aunque cambie la técnica.
        self.assertLess(rep.puntuacion(self.cand("C", 0.02, True, 0.0)), rep.puntuacion(self.cand("B", 0.12, False, 0.0)))
        # Un ERROR de técnica pesa más que cualquier distorsión; una regresión, más que todo.
        self.assertLess(rep.puntuacion(self.cand("B", 0.9, True, 3.0)), rep.puntuacion(self.cand("C", 0.0, False, 0.0, errores=1)))
        self.assertLess(rep.puntuacion(self.cand("B", 0.9, True, 3.0, errores=2)), rep.puntuacion(self.cand("C", 0.0, False, 0.0, estructura={"TOPOLOGY_HOLE_LOST": ["h"]})))
        # Coser menos no premia (sólo cuentan las puntadas de más); después, menos objetos.
        self.assertEqual(rep.puntuacion(self.cand("B", 0.0, False, -0.5))[5], 0.0)
        self.assertLess(rep.puntuacion(self.cand("B", 0.0, False, 0.0, 1)), rep.puntuacion(self.cand("C", 0.0, False, 0.0, 2)))


# ─── Propiedades ─────────────────────────────────────────────────────────

def huella(informe: dict) -> list:
    """Lo que no depende de dónde está el diseño: estrategias, parámetros, aceptación, elegido."""
    return [(o["objectId"], o["trigger"]["code"], o["selected"], [(c["id"], c["strategy"], c["accepted"], {k: v for k, v in c["parameters"].items() if isinstance(v, int)}) for c in o["candidates"]]) for o in informe["objects"]]


class Propiedades(unittest.TestCase):
    def test_traslacion(self) -> None:
        for d in (ancho(), colapsado()):
            a, _ = reparar(d)
            b, _ = reparar(transformar(d, lambda p: (p[0] + 13.2, p[1] + 4.7)))
            self.assertEqual(huella(a), huella(b))
            for oa, ob in zip(a["objects"], b["objects"]):
                for ca, cb in zip(oa["candidates"][1:], ob["candidates"][1:]):
                    if ca.get("metrics"):
                        self.assertAlmostEqual(ca["metrics"]["geometryDistortion"], cb["metrics"]["geometryDistortion"], delta=0.02)
                        self.assertAlmostEqual(ca["metrics"]["stitchDeltaRatio"], cb["metrics"]["stitchDeltaRatio"], delta=0.05)

    def test_rotacion(self) -> None:
        for angulo in (90, 30):
            c, s = math.cos(math.radians(angulo)), math.sin(math.radians(angulo))
            gira = lambda p: (45 + (p[0] - 20) * c - (p[1] - 20) * s, 30 + (p[0] - 20) * s + (p[1] - 20) * c)  # noqa: E731
            for d in (ancho(), colapsado()):
                a, _ = reparar(d)
                b, _ = reparar(transformar(d, gira))
                sel = lambda i: [(o["trigger"]["code"], candidato(i, o["objectId"], o["selected"])["strategy"] if o["selected"] else None) for o in i["objects"]]  # noqa: E731
                self.assertEqual(sel(a), sel(b), f"{angulo}°")

    def test_determinista(self) -> None:
        limpio = lambda i: json.dumps({k: v for k, v in i.items() if k != "ms"}, sort_keys=True, default=str)  # noqa: E731
        a, _ = reparar(ancho())
        b, _ = reparar(ancho())
        self.assertEqual(limpio(a), limpio(b))
        self.assertEqual(json.dumps(a["design"], sort_keys=True), json.dumps(b["design"], sort_keys=True))

    def test_un_objeto_sano_ajeno_no_cambia_la_reparacion(self) -> None:
        a, _ = reparar(ancho())
        b, _ = reparar(con(ancho(), sano("s", "satin", 40), sano("f", "fill", 48)))
        self.assertEqual(huella(a), huella(b))
        for ca, cb in zip(a["objects"][0]["candidates"][1:], b["objects"][0]["candidates"][1:]):
            self.assertEqual(ca.get("metrics"), cb.get("metrics"))
        # y el sano sale igual: mismo IR, mismas puntadas.
        oid = b["objects"][0]["selected"]
        v = candidato(b, "w", oid)["validation"]
        self.assertEqual(sorted(v["unaffectedIdentical"]), ["f", "s"])

    def test_dos_objetos_rotos_se_reparan_y_se_verifican_juntos(self) -> None:
        d = con(ancho(), (objeto("v", "satin", satin_rails(40, 60, 10, 19)), pieza("v", 40, 60, 14.5, 9)))
        informe, coser = reparar(d)
        self.assertEqual([o["selected"] for o in informe["objects"]], ["B", "B"])
        self.assertEqual(informe["combined"], {"objects": ["v", "w"], "verified": True, "rejections": []})
        self.assertEqual(coser.llamadas, 1 + 4 + 1)  # base, 2 candidatos × 2 objetos, combinado
        self.assertTrue(all(v == [] for v in tecnica_final(informe).values()))


class Cache(unittest.TestCase):
    def test_clave_del_cosido(self) -> None:
        tmp = Path(tempfile.mkdtemp())
        a, b, c = tmp / "a.svg", tmp / "b.svg", tmp / "c.svg"
        motor.build_svg(ancho(), a)
        motor.build_svg(ancho(), b)
        otro = ancho()
        otro["objects"][0]["stitch"]["spacingMm"] = 0.4
        motor.build_svg(otro, c)
        self.assertEqual(motor.clave_de_cosido(a), motor.clave_de_cosido(b))
        self.assertNotEqual(motor.clave_de_cosido(a), motor.clave_de_cosido(c))


if __name__ == "__main__":
    unittest.main()
