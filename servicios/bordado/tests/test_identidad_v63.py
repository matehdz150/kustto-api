"""V6.3: identidad persistente objeto → puntadas del DST.

Corridas sintéticas, sin Ink/Stitch: el DST de producción, su espejo JSON y
la corrida de identidad (STOP tras cada elemento, coordenadas absolutas) se
escriben a mano con la forma exacta que tienen en Ink/Stitch 3.3.0 (medida en
`pruebas-bordado/v6.3/exp`). La prueba con Ink/Stitch real está en
`smoke_identidad.py` (Docker).

    python3 -m unittest discover -s servicios/bordado/tests -p 'test_identidad_v63.py'
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyembroidery as pe  # noqa: E402

import identidad as idn  # noqa: E402
import motor  # noqa: E402
from quality import cobertura_de_estructura, topologia_en_dst  # noqa: E402
from test_solape_v5 import V5, objeto  # noqa: E402

#: El centrado de Ink/Stitch (0.1 mm): el DST no está en coordenadas del documento.
D = (-203.37, -151.12)


def zigzag(y: float, x0: float = 10, x1: float = 30) -> list[tuple[float, float]]:
    """Un satin horizontal de 2 mm de alto, en mm del documento.

    0.2 mm por pierna: de zig a zig 0.4 mm, la densidad de un satin de Ink/Stitch
    (con 0.4 mm por pierna quedan 0.8 mm entre piernas: huecos reales).
    """
    puntos, x, arriba = [(x0, y - 1)], x0, True
    while x <= x1:
        puntos.append((x, y - 1 if arriba else y + 1))
        arriba = not arriba
        x += 0.2
    return puntos


def anillo(cx: float, cy: float, r: float) -> list[tuple[float, float]]:
    """Un cuadrado cerrado de corrido (paso 0.5 mm)."""
    esquinas = [(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r), (cx - r, cy - r)]
    puntos = []
    for (ax, ay), (bx, by) in zip(esquinas, esquinas[1:]):
        n = round(max(abs(bx - ax), abs(by - ay)) / 0.5)
        puntos += [(ax + (bx - ax) * k / n, ay + (by - ay) * k / n) for k in range(n)]
    return puntos + [esquinas[0]]


class Corrida:
    """Las tres salidas de Ink/Stitch para una lista de elementos.

    `elementos[k]` son las puntadas propias del elemento k (vacía: no produce
    nada). `enlaces[k]` son puntadas de conexión ANTES del elemento k, cosidas
    desde el anterior sin salto (ambiguas: no son de nadie). Sin enlaces, cada
    elemento empieza con corte y salto. `color[k]` cambia de hilo antes del
    elemento k.
    """

    def __init__(self, elementos: list[list[tuple[float, float]]], enlaces: dict[int, list[tuple[float, float]]] | None = None, color: set[int] | None = None) -> None:
        self.n = len(elementos)
        self.pattern = pe.EmbPattern()
        espejo: list[list] = []
        identidad: list[list] = []
        a_dst = lambda p: (p[0] * 10 + D[0], p[1] * 10 + D[1])  # noqa: E731
        hilos = 0
        for k, puntos in enumerate(elementos):
            if k in (color or set()):
                self._comando(espejo, pe.COLOR_CHANGE, f"COLOR_CHANGE t{hilos} n{hilos + 1}")
                hilos += 1
            if puntos and not (enlaces or {}).get(k):
                self._comando(espejo, pe.TRIM, "TRIM")
                self._comando(espejo, pe.JUMP, "JUMP", a_dst(puntos[0]))
            for p in (enlaces or {}).get(k, []):
                self._puntada(espejo, a_dst(p))
            for p in puntos:
                self._puntada(espejo, a_dst(p))
                identidad.append([p[0] * 10, p[1] * 10, "STITCH"])
            if puntos:
                identidad.append([puntos[-1][0] * 10, puntos[-1][1] * 10, "STOP"])
        self._comando(espejo, pe.END, "END")
        self.espejo = {"threadlist": [], "stitches": espejo, "extras": {"name": ""}}
        self.identidad = {"threadlist": [], "stitches": identidad, "extras": {"name": ""}}
        self.colores = {"threadlist": [{"color": idn.color_de(k)} for k, p in enumerate(elementos) if p], "stitches": [], "extras": {}}

    def _puntada(self, espejo: list[list], p: tuple[float, float]) -> None:
        espejo.append([p[0], p[1], "STITCH"])
        self.pattern.add_stitch_absolute(pe.STITCH, round(p[0]), round(p[1]))

    def _comando(self, espejo: list[list], c: int, nombre: str, p: tuple[float, float] | None = None) -> None:
        if p is None:
            p = (espejo[-1][0], espejo[-1][1]) if espejo else (0.0, 0.0)
        espejo.append([p[0], p[1], nombre])
        self.pattern.add_stitch_absolute(c, round(p[0]), round(p[1]))

    def mapa(self, con_colores: bool = False) -> dict:
        return idn.mapear(self.pattern, self.espejo, self.identidad, self.n, self.colores if con_colores else None)


def con_identidad(o: dict, grupos: list[str], piezas: list[str], padres: list[str] | None = None, rol: str | None = None) -> dict:
    ident = {"id": f"ir-{o['id']}", "groups": grupos, "pieces": piezas, "parents": padres or [f"rg-{o['id']}"]}
    if rol:
        ident["role"] = rol
    return {**o, "identity": ident}


def pieza(ident: str, y: float) -> dict:
    return {"id": ident, "sondas": [[x, y] for x in (12, 16, 20, 24, 28)], "anchoMm": 2, "incierto": False, "enIR": "conservada"}


def verdad(componentes: list[dict], counters: list[dict] | None = None) -> list[dict]:
    return [{"id": "o0", "origen": "svg", "resolucionMm": 0.03, "componentes": componentes, "counters": counters or []}]


def codigos(plan: dict) -> list[str]:
    return [i["code"] for i in motor.quality_issues({"profileVersion": V5, "objects": []}, {}, plan)]


class Mapa(unittest.TestCase):
    def test_cada_elemento_recibe_exactamente_sus_puntadas(self):
        c = Corrida([zigzag(10), zigzag(20)], enlaces={1: [(30, 12), (10, 18)]})
        m = c.mapa()
        self.assertTrue(m["verificado"])
        self.assertEqual([e["puntadas"] for e in m["elementos"]], [len(zigzag(10)), len(zigzag(20))])
        # El marco es la traslación del centrado, exacta (residuo 1e-5 mm).
        self.assertAlmostEqual(m["marco"]["dx"], D[0], places=6)
        self.assertAlmostEqual(m["marco"]["dy"], D[1], places=6)
        self.assertEqual(m["marco"]["residuoMm"], 1e-05)
        # Las puntadas de conexión no son de nadie.
        self.assertEqual(len(m["enlaces"]), 2)
        propias = {i for e in m["elementos"] for a, b in e["rangos"] for i in range(a, b + 1)}
        self.assertFalse(propias & set(m["enlaces"]))

    def test_G_los_comandos_nunca_son_puntadas_de_un_elemento(self):
        c = Corrida([zigzag(10), zigzag(20), zigzag(30)], color={1, 2})
        m = c.mapa()
        propias = {i for e in m["elementos"] for a, b in e["rangos"] for i in range(a, b + 1)}
        comandos = {i for v in m["comandos"].values() for i in v}
        self.assertTrue(comandos)
        self.assertFalse(propias & comandos)
        self.assertEqual(set(m["comandos"]), {"TRIM", "JUMP", "COLOR_CHANGE", "END"})
        for i in propias:
            self.assertEqual(int(c.pattern.stitches[i][2]) & pe.COMMAND_MASK, pe.STITCH)

    def test_E_el_elemento_que_no_cose_se_identifica_por_su_color(self):
        c = Corrida([zigzag(10), [], zigzag(20)])
        with self.assertRaises(idn.SinIdentidad):
            c.mapa()  # sin la corrida de colores, 2 segmentos para 3 elementos no se atribuyen
        m = c.mapa(con_colores=True)
        self.assertEqual(m["sinPuntadas"], [1])
        self.assertEqual([e["puntadas"] for e in m["elementos"]], [len(zigzag(10)), 0, len(zigzag(20))])

    def test_un_espejo_que_no_es_el_dst_no_da_identidad(self):
        c = Corrida([zigzag(10), zigzag(20)])
        c.espejo["stitches"][5][0] += 3
        with self.assertRaises(idn.SinIdentidad):
            c.mapa()

    def test_un_segmento_que_no_esta_en_la_produccion_queda_sin_verificar(self):
        c = Corrida([zigzag(10), zigzag(20), zigzag(30)])
        c.identidad["stitches"][len(zigzag(10)) + 1 + 20][1] += 0.01  # a mitad del elemento 1, por encima de EPSILON
        m = c.mapa()
        self.assertEqual(m["incompletos"], [1])
        self.assertEqual(m["elementos"][1]["verificacion"]["estado"], "sin-verificar")
        self.assertEqual(m["elementos"][1]["puntadas"], 0)
        self.assertNotIn(1, m["sinPuntadas"])  # no se sabe: no es "no cose"
        self.assertEqual([m["elementos"][k]["puntadas"] for k in (0, 2)], [len(zigzag(10)), len(zigzag(30))])

    def test_entrada_de_contexto_distinta_se_recorta_y_el_nucleo_es_exacto(self):
        # Como el satin de serif-fina-png-30: la primera puntada depende del remate vecino.
        c = Corrida([zigzag(10), zigzag(20)])
        c.identidad["stitches"][len(zigzag(10)) + 1][0] += 5
        m = c.mapa()
        self.assertEqual(m["elementos"][1]["verificacion"], {"estado": "recortado", "identidad": len(zigzag(20)), "recortadas": [1, 0]})
        # La puntada de entrada, tras el salto y pegada al núcleo, vuelve como su remate.
        self.assertEqual(m["elementos"][1]["puntadas"], len(zigzag(20)))
        self.assertEqual(m["elementos"][1]["remates"], 1)
        self.assertEqual(m["incompletos"], [1])

    def test_hilo_propio_de_un_conjunto_incluye_sus_transiciones(self):
        # Un corrido de UNA puntada entre dos trozos de la misma pieza: su hilo es el tramo que llega a él.
        c = Corrida([zigzag(10, 10, 18), [(19, 10)], zigzag(10, 20, 30)], enlaces={1: [(18.5, 10)], 2: [(19.5, 10)]})
        m = c.mapa()
        propio = idn.HiloPropio(c.pattern, m)
        self.assertEqual(m["elementos"][1]["puntadas"], 1)
        solo = propio.de({1})
        self.assertEqual(len(solo), 1)  # sin sus vecinos, un punto
        self.assertEqual(solo[0][0], solo[0][1])
        todos = propio.de({0, 1, 2})
        # los enlaces ambiguos entre objetos del conjunto son hilo del conjunto
        self.assertEqual(len(todos), len(zigzag(10, 10, 18)) - 1 + 4 + len(zigzag(10, 20, 30)) - 1)
        objetos = [con_identidad(objeto(k, "satin", "M0 0 L1 1"), ["g"], ["p"]) for k in "abc"]
        t = idn.topologia_exacta(c.pattern, m, objetos, verdad([pieza("p", 10)]))
        self.assertEqual(t["componentsSplit"], [])
        # y el hilo de fuera nunca entra: {0, 2} no se lleva la conexión que pasa por 1
        self.assertEqual(len(propio.de({0, 2})), len(zigzag(10, 10, 18)) - 1 + len(zigzag(10, 20, 30)) - 1)

    def test_remates_por_secuencia(self):
        # Remate de salida (hasta el corte) y de entrada (tras el salto): del elemento; entre dos sin comando: de nadie.
        c = Corrida([zigzag(10), zigzag(20)])
        n0 = len(zigzag(10))
        # un remate de salida del elemento 0: dos puntadas más antes del TRIM, que la corrida de identidad no trae
        extra = [[x * 10 + D[0], 90 + D[1], "STITCH"] for x in (30.2, 30.4)]
        c.espejo["stitches"][n0 + 2:n0 + 2] = extra
        p = pe.EmbPattern()
        for x, y, nombre in c.espejo["stitches"]:
            cmd = {"STITCH": pe.STITCH, "TRIM": pe.TRIM, "JUMP": pe.JUMP, "END": pe.END}[nombre.split(" ")[0]]
            p.add_stitch_absolute(cmd, round(x), round(y))
        c.pattern = p
        m = c.mapa()
        self.assertEqual(m["elementos"][0]["remates"], 2)
        self.assertEqual(m["elementos"][0]["puntadas"], n0 + 2)
        self.assertEqual(m["enlaces"], [])

    def test_negativo_con_identidad_incompleta_es_inconcluso(self):
        c = Corrida([zigzag(10), zigzag(20), zigzag(30)])
        for t in c.identidad["stitches"][len(zigzag(10)) + 1: len(zigzag(10)) + 1 + len(zigzag(20))]:
            t[1] += 0.01
        m = c.mapa()
        objetos = [con_identidad(objeto(k, "satin", "M0 0 L1 1"), [f"g{k}"], [f"p{k}"]) for k in "abc"]
        t = idn.topologia_exacta(c.pattern, m, objetos, verdad([pieza("pa", 10), pieza("pb", 20), pieza("pc", 30)]))
        self.assertEqual(t["componentsLost"], [])
        self.assertEqual(sorted((x["id"], x["cause"]) for x in t["inconclusive"]), [("gb", "identity-incomplete"), ("pb", "identity-incomplete")])

    def test_H_determinista(self):
        a = Corrida([zigzag(10), [], zigzag(20)], enlaces={2: [(15, 15)]}, color={2}).mapa(con_colores=True)
        b = Corrida([zigzag(10), [], zigzag(20)], enlaces={2: [(15, 15)]}, color={2}).mapa(con_colores=True)
        self.assertEqual(a, b)


class Propiedades(unittest.TestCase):
    """Invariantes del mapa sobre 200 corridas aleatorias (semilla fija: reproducible)."""

    def test_invariantes(self):
        import random
        azar = random.Random(63)
        for _ in range(200):
            n = azar.randint(1, 8)
            elementos = [[] if azar.random() < 0.2 else [(azar.uniform(0, 80), azar.uniform(0, 50)) for _ in range(azar.randint(1, 25))] for _ in range(n)]
            if not any(elementos):
                elementos[0] = [(1.0, 1.0), (2.0, 2.0)]
            enlaces = {k: [(azar.uniform(0, 80), azar.uniform(0, 50))] for k in range(1, n) if elementos[k] and azar.random() < 0.3}
            color = {k for k in range(1, n) if azar.random() < 0.3}
            c = Corrida(elementos, enlaces=enlaces, color=color)
            m = c.mapa(con_colores=True)
            tipos = [int(x[2]) & pe.COMMAND_MASK for x in c.pattern.stitches]
            propias = [i for e in m["elementos"] for a, b in e["rangos"] for i in range(a, b + 1)]
            # 1. sólo STITCH, 2. sin repetir, 3. propias + enlaces = todas las puntadas
            self.assertTrue(all(tipos[i] == pe.STITCH for i in propias))
            self.assertEqual(len(propias), len(set(propias)))
            self.assertEqual(sorted(propias + m["enlaces"]), [i for i, t in enumerate(tipos) if t == pe.STITCH])
            # 4. no cose ⇔ vacío, 5. cada elemento, al menos lo suyo (más sus remates)
            self.assertEqual(m["sinPuntadas"], [k for k, p in enumerate(elementos) if not p])
            for k, p in enumerate(elementos):
                self.assertGreaterEqual(m["elementos"][k]["puntadas"], len(p))
            # 6. comandos nunca son de nadie
            self.assertFalse(set(propias) & {i for v in m["comandos"].values() for i in v})
            # 7. determinista
            self.assertEqual(m, Corrida(elementos, enlaces=enlaces, color=color).mapa(con_colores=True))


class PuntadasAjenas(unittest.TestCase):
    """El caso adversarial: A desaparece y B pasa exactamente por encima."""

    def setUp(self) -> None:
        self.objetos = [
            con_identidad(objeto("a", "satin", "M10 9 L30 9 M10 11 L30 11"), ["gA"], ["pA"]),
            con_identidad(objeto("b", "satin", "M10 9 L30 9 M10 11 L30 11 M10 19 L30 19 M10 21 L30 21", color="c1"), ["gB"], ["pB"]),
        ]
        # A no cose nada; B cose SU barra y además pasa por encima de la de A.
        self.c = Corrida([[], zigzag(10) + zigzag(20)], color={1})
        self.verdad = verdad([pieza("pA", 10), pieza("pB", 20)])
        self.estructura = [{"id": "gA", "ejes": ["M10 10 L30 10"]}, {"id": "gB", "ejes": ["M10 20 L30 20"]}]

    def test_el_sistema_viejo_da_A_por_cosida(self):
        viejo = topologia_en_dst(self.c.pattern, self.objetos, self.verdad)
        self.assertEqual(viejo["componentsLost"], [])
        cob = cobertura_de_estructura(self.c.pattern, self.objetos, self.estructura)
        self.assertEqual(cob["incomplete"], [])

    def test_v63_da_A_por_perdida_con_cero_puntadas_propias(self):
        m = self.c.mapa(con_colores=True)
        self.assertEqual(m["sinPuntadas"], [0])
        t = idn.topologia_exacta(self.c.pattern, m, self.objetos, self.verdad)
        self.assertEqual([(x["id"], x["ownStitches"], x["cause"]) for x in t["componentsLost"]], [("pA", 0, "no-own-stitches"), ("gA", 0, "no-own-stitches")])
        self.assertEqual(t["inconclusive"], [])
        cob = idn.cobertura_exacta(self.c.pattern, m, self.objetos, self.estructura)
        self.assertEqual(cob["incomplete"], ["gA"])
        self.assertEqual(cob["branchesLost"], ["gA"])
        por_grupo = {g["id"]: g for g in cob["perGroup"]}
        self.assertEqual(por_grupo["gA"]["ownStitches"], 0)
        self.assertEqual(por_grupo["gA"]["coverageRatio"], 0)
        self.assertGreaterEqual(por_grupo["gB"]["coverageRatio"], 0.99)
        cods = codigos({"structuralTruth": t, "strokeCoverage": cob})
        self.assertIn("TOPOLOGY_COMPONENT_LOST", cods)
        self.assertIn("STRUCTURAL_STROKE_LOST", cods)
        self.assertNotIn("STRUCTURE_UNCERTAIN", cods)

    def test_B_dos_colores_en_la_misma_zona(self):
        # El blanco (A) sí cose, sobre el rojo (B) que cubre la misma zona: cada uno con lo suyo.
        c = Corrida([zigzag(10), zigzag(10) + zigzag(20)], color={1})
        m = c.mapa()
        t = idn.topologia_exacta(c.pattern, m, self.objetos, self.verdad)
        self.assertEqual(t["componentsLost"], [])
        cob = idn.cobertura_exacta(c.pattern, m, self.objetos, self.estructura)
        self.assertEqual(cob["incomplete"], [])

    def test_blanco_sobre_rojo_misma_pieza_de_tinta_el_grupo_se_pierde(self):
        # Una sola pieza de tinta (la verdad V6.1 no distingue colores); dos
        # grupos, uno por hilo. El blanco no cose; el rojo pasa por encima.
        objetos = [
            con_identidad(objeto("rojo", "fill", "M10 9 L30 9 L30 21 L10 21 Z"), ["o0-b0-g0"], ["p"]),
            con_identidad(objeto("blanco", "satin", "M10 9 L30 9 M10 11 L30 11", color="c1"), ["o0-b1-g0"], ["p"]),
        ]
        c = Corrida([zigzag(10) + zigzag(20), []], color={1})
        v = verdad([{**pieza("p", 10), "sondas": [[12, 10], [20, 10], [28, 20]]}])
        viejo = topologia_en_dst(c.pattern, objetos, v)
        self.assertEqual(viejo["componentsLost"], [])
        t = idn.topologia_exacta(c.pattern, c.mapa(con_colores=True), objetos, v)
        self.assertEqual([(x["id"], x["kind"], x["objects"]) for x in t["componentsLost"]], [("o0-b1-g0", "group", ["blanco"])])
        self.assertIn("grupo", next(i["message"] for i in motor.quality_issues({"profileVersion": V5, "objects": []}, {}, {"structuralTruth": t}) if i["code"] == "TOPOLOGY_COMPONENT_LOST"))

    def test_una_puntada_de_conexion_no_cubre_un_eje(self):
        # Sólo un enlace (de nadie) recorre el eje de A: no cuenta.
        c = Corrida([[(10, 30)], zigzag(20)], enlaces={1: [(10, 10), (30, 10)]})
        m = c.mapa()
        self.assertEqual(len(m["enlaces"]), 2)
        cob = idn.cobertura_exacta(c.pattern, m, self.objetos, self.estructura)
        self.assertIn("gA", cob["incomplete"])

    def test_un_traslado_no_cuenta_como_puntadas_de_su_grupo(self):
        objetos = [con_identidad(objeto("t", "running", "M10 10 L30 10"), ["gA"], ["pA"], rol="travel"), self.objetos[1]]
        c = Corrida([[(x, 10) for x in range(10, 31)], zigzag(20)])
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, self.verdad)
        # gA no tiene objetos que no sean traslado: no hay grupo que evaluar; la pieza sí se pierde.
        self.assertEqual([x["id"] for x in t["componentsLost"]], ["pA"])


class Uniones(unittest.TestCase):
    """Una T: el palo vertical y el brazo horizontal se juntan en (20, 10)."""

    def setUp(self) -> None:
        self.objetos = [con_identidad(objeto("t", "running", "M10 10 L30 10"), ["gT"], ["pT"]), con_identidad(objeto("v", "running", "M20 10 L20 25"), ["gT"], ["pT"])]
        self.est = [{"id": "gT", "ejes": ["M10 10 L20 10", "M20 10 L30 10", "M20 10 L20 25"], "largoMm": 35, "uniones": [[20, 10]]}]

    def test_union_cosida_de_una_pieza(self):
        c = Corrida([[(x / 2, 10) for x in range(20, 61)], [(20, 10 + y / 2) for y in range(0, 31)]])
        cob = idn.cobertura_exacta(c.pattern, c.mapa(), self.objetos, self.est)
        self.assertEqual(cob["junctionsDisconnected"], [])

    def test_union_desconectada(self):
        # El palo arranca 0.8 mm por debajo del brazo: la T se lee, pero el hilo no la une.
        c = Corrida([[(x / 2, 10) for x in range(20, 61)], [(20, 10.8 + y / 2) for y in range(0, 29)]])
        cob = idn.cobertura_exacta(c.pattern, c.mapa(), self.objetos, self.est)
        self.assertEqual(cob["junctionsDisconnected"], [{"group": "gT", "at": [20.0, 10.0], "parts": 2}])
        self.assertIn("TOPOLOGY_JUNCTION_DISCONNECTED", codigos({"strokeCoverage": cob}))


class Topologia(unittest.TestCase):
    def setUp(self) -> None:
        self.objetos = [
            con_identidad(objeto("a", "satin", "M10 9 L30 9"), ["gA"], ["pA"]),
            con_identidad(objeto("b", "satin", "M10 19 L30 19"), ["gB"], ["pB"]),
        ]

    def test_C_pieza_partida_por_su_propio_hilo(self):
        c = Corrida([zigzag(10, 10, 18) + zigzag(10, 22, 30), zigzag(20)])
        m = c.mapa()
        t = idn.topologia_exacta(c.pattern, m, self.objetos, verdad([pieza("pA", 10), pieza("pB", 20)]))
        # En la corrida el zigzag salta de x=18 a x=22 cosiendo: es un tramo de hilo, no una partición.
        self.assertEqual(t["componentsSplit"], [])
        # Con un salto de verdad entre las mitades, sí.
        c = Corrida([zigzag(10, 10, 18), zigzag(10, 22, 30), zigzag(20)])
        objetos = [self.objetos[0], {**self.objetos[0], "id": "a2", "identity": {**self.objetos[0]["identity"], "id": "ir-a2"}}, self.objetos[1]]
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, verdad([pieza("pA", 10), pieza("pB", 20)]))
        self.assertEqual([(x["id"], x["parts"]) for x in t["componentsSplit"]], [("pA", 2)])
        self.assertIn("TOPOLOGY_COMPONENT_SPLIT", codigos({"structuralTruth": t}))

    def test_D_piezas_fusionadas_por_su_hilo(self):
        c = Corrida([zigzag(10), zigzag(11.5)])
        t = idn.topologia_exacta(c.pattern, c.mapa(), self.objetos, verdad([pieza("pA", 10), pieza("pB", 11.5)]))
        self.assertEqual(t["componentsMerged"], [{"ids": ["pA", "pB"]}])
        self.assertIn("TOPOLOGY_COMPONENT_MERGED", codigos({"structuralTruth": t}))

    def test_un_objeto_que_cose_las_dos_piezas_no_es_fusion_del_dst(self):
        # La fusión la hizo el IR (un objeto con las dos piezas): no es de esta frontera.
        objetos = [con_identidad(objeto("c", "satin", "M10 9 L30 9"), ["gA"], ["pA", "pB"])]
        c = Corrida([zigzag(10) + zigzag(11.5)])
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, verdad([pieza("pA", 10), pieza("pB", 11.5)]))
        self.assertEqual(t["componentsMerged"], [])

    def test_separadas_no_se_fusionan(self):
        c = Corrida([zigzag(10), zigzag(20)])
        t = idn.topologia_exacta(c.pattern, c.mapa(), self.objetos, verdad([pieza("pA", 10), pieza("pB", 20)]))
        self.assertEqual(t["componentsMerged"], [])
        self.assertEqual(t["componentsSplit"], [])
        self.assertEqual(t["componentsLost"], [])

    def test_counter_nuevo_y_conocido(self):
        objetos = [con_identidad(objeto("r", "running", "M5 5 L15 5 L15 15 L5 15 Z"), ["gR"], ["pR"])]
        c = Corrida([anillo(10, 10, 5)])
        componentes = [{"id": "pR", "sondas": [[5, 10], [15, 10], [10, 5]], "anchoMm": 0.4, "incierto": False, "enIR": "conservada"}]
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, verdad(componentes))
        self.assertEqual(len(t["countersCreated"]), 1)
        self.assertIn("TOPOLOGY_HOLE_CREATED", codigos({"structuralTruth": t}))
        # El mismo hueco, si el original o el IR lo traían, no es nuevo.
        conocido = verdad(componentes)
        conocido[0]["countersIR"] = [{"polo": [10, 10], "anchoMm": 9}]
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, conocido)
        self.assertEqual(t["countersCreated"], [])

    def test_counter_tapado_por_hilo_ajeno_si_cuenta(self):
        # La tela la tapa cualquier hilo: un counter se juzga con TODO el hilo.
        objetos = [con_identidad(objeto("r", "running", "M5 5 L15 5 L15 15 L5 15 Z"), ["gR"], ["pR"]), con_identidad(objeto("x", "running", "M5 10 L15 10"), ["gX"], ["pX"])]
        c = Corrida([anillo(10, 10, 5), [(x / 2, 10) for x in range(10, 31)]])
        v = verdad([], [{"id": "h", "polo": [10, 10], "anchoMm": 9, "incierto": False, "enIR": "conservada"}])
        t = idn.topologia_exacta(c.pattern, c.mapa(), objetos, v)
        self.assertEqual([x["id"] for x in t["countersLost"]], ["h"])


class Incidencias(unittest.TestCase):
    def test_incertidumbre_por_identidad_dice_su_causa(self):
        t = {"evaluated": True, "attribution": "identity", "alignmentUncertaintyMm": 1e-05, "componentsLost": [], "countersLost": [], "inconclusive": [{"id": "x", "kind": "counter", "cause": "truth-uncertain"}]}
        issues = motor.quality_issues({"profileVersion": V5, "objects": []}, {}, {"structuralTruth": t})
        u = [i for i in issues if i["code"] == "STRUCTURE_UNCERTAIN"]
        self.assertEqual(len(u), 1)
        self.assertIn("truth-uncertain", u[0]["message"])
        self.assertNotIn("heurística", u[0]["message"])


if __name__ == "__main__":
    unittest.main()
