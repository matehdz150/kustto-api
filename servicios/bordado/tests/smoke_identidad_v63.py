"""V6.3 con Ink/Stitch REAL (dentro de la imagen del motor).

Los casos A–H y el adversarial de identidad, cosidos de verdad: el motor
hace el DST de producción y las corridas privadas, y aquí se comprueba el
`identity.json` y las comprobaciones exactas, contra las heurísticas de
siempre (`cobertura_de_estructura`, `topologia_en_dst`) sobre el MISMO DST.

    docker run --rm -v "$PWD/servicios/bordado:/motor:ro" --entrypoint python3 \\
        kustto-bordado:latest /motor/tests/smoke_identidad_v63.py
"""
from __future__ import annotations

import copy
import re
import hashlib
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyembroidery as pe  # noqa: E402

import identidad as idn  # noqa: E402
import motor  # noqa: E402
from quality import cobertura_de_estructura, topologia_en_dst  # noqa: E402

V5 = "experimental-vector-v5-2026-09-25"
COLORES = {"rojo": "#c8102e", "blanco": "#ffffff", "azul": "#00338d"}


def obj(ident: str, color: str, tipo: str, d: str, grupos: list[str], piezas: list[str], padre: str | None = None, **stitch) -> dict:
    base = {"fill": {"angleDeg": 45, "spacingMm": 0.45, "maxStitchLengthMm": 4, "pullCompensationMm": 0.15, "underlay": False}, "satin": {"spacingMm": 0.4, "pullCompensationMm": 0.15, "underlay": False, "satinMode": "rails"}, "running": {"stitchLengthMm": 2}}[tipo]
    return {
        "id": ident, "sourceObjectId": "smoke", "sourceType": "vector", "classification": "logo", "colorId": color,
        "geometry": {"kind": "path", "d": d, "fillRule": "evenodd"},
        "stitch": {"type": tipo, "trimAfter": False, **base, **stitch},
        "bounds": {"xMm": 20, "yMm": 10, "widthMm": 50, "heightMm": 40}, "nodeCount": len(re.findall(r"[MmLlHhVvCcSsQqTtAa]", d)),
        "identity": {"id": f"ir-{ident}", "groups": grupos, "pieces": piezas, "parents": [padre or f"rg-{ident}"]},
    }


def diseno(objetos: list[dict], verdad: list[dict], estructura: list[dict] | None = None) -> dict:
    usados = sorted({o["colorId"] for o in objetos}, key=list(COLORES).index)
    return {
        "schemaVersion": 1, "sourceSnapshotHash": "0" * 64, "productId": "v63", "sideId": "frente",
        "physical": {"widthMm": 90, "heightMm": 60}, "bounds": {"xMm": 20, "yMm": 10, "widthMm": 50, "heightMm": 40},
        "colors": [{"id": c, "sourceHex": COLORES[c], "displayHex": COLORES[c], "order": k} for k, c in enumerate(usados)],
        "objects": objetos, "metrics": {"componentCount": len(objetos), "nodeCount": 8 * len(objetos)},
        "profileVersion": V5, "engineVersion": "inkstitch-3.3.0",
        "preparation": {"profileVersion": V5, "issues": [], "verdad": verdad, "estructura": estructura or []},
    }


def verdad(componentes: list[dict], counters: list[dict] | None = None) -> list[dict]:
    return [{"id": "o0", "origen": "svg", "resolucionMm": 0.03, "componentes": componentes, "counters": counters or [], "countersIR": []}]


def pieza(ident: str, sondas: list[list[float]]) -> dict:
    return {"id": ident, "sondas": sondas, "anchoMm": 2, "incierto": False, "enIR": "conservada"}


def coser(d: dict) -> tuple[dict, dict, pe.EmbPattern, dict]:
    carpeta = Path(tempfile.mkdtemp(dir="/tmp"))
    h = hashlib.sha256(json.dumps(d, sort_keys=True).encode()).hexdigest()
    r = motor.process_design(d, h, carpeta, canonical_hash_verified=True, identity_engine=idn.correr_inkstitch)
    ident = json.loads((carpeta / "identity.json").read_text())
    return r, ident, pe.read(str(carpeta / "design.dst")), {"identityBytes": (carpeta / "identity.json").stat().st_size, "texto": (carpeta / "identity.json").read_bytes()}


def propias(ident: dict) -> dict[str, int]:
    return {e["identity"]["id"]: e["ownStitches"] for e in ident["elements"]}


def grupo(ident: dict, g: str) -> dict:
    return next(x for x in ident["groups"] if x["sourceGroupId"] == g)


def codigos(r: dict) -> list[str]:
    return sorted({i["code"] for i in r["issues"]})


resultados: dict[str, dict] = {}


def caso(nombre: str):
    def envolver(f):
        try:
            resultados[nombre] = {"ok": True, **(f() or {})}
        except AssertionError as e:
            resultados[nombre] = {"ok": False, "error": str(e)}
        return f
    return envolver


BARRA_A = "M20 20 L60 20 M20 22 L60 22"  # satin horizontal (rails)
BARRA_B = "M20 30 L60 30 M20 32 L60 32"


@caso("A_superpuestos")
def _():
    # Rojo grande debajo, blanco encima: una pieza de tinta, un grupo por hilo.
    o = [obj("rojo", "rojo", "fill", "M20 15 L60 15 L60 40 L20 40 Z", ["o0-b0-g0"], ["o0-tp0"]),
         obj("blanco", "blanco", "satin", BARRA_A, ["o0-b1-g0"], ["o0-tp0"])]
    r, ident, _, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[30, 21], [40, 35], [50, 21]])])))
    p = propias(ident)
    assert ident["verified"], ident["reason"]
    assert p["ir-rojo"] > 0 and p["ir-blanco"] > 0, p
    t = r["metrics"]["quality"]["stitchPlan"]["structuralTruth"]
    assert t["attribution"] == "identity" and not t["componentsLost"], t
    return {"ownStitches": p, "codes": codigos(r)}


@caso("B_dos_colores_misma_zona")
def _():
    zona = "M25 18 L55 18 L55 36 L25 36 Z"
    o = [obj("rojo", "rojo", "fill", zona, ["o0-b0-g0"], ["o0-tp0"]), obj("azul", "azul", "fill", zona, ["o0-b1-g0"], ["o0-tp0"], angleDeg=135)]
    r, ident, dst, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[30, 20], [40, 27], [50, 34]])])))
    rangos = {e["identity"]["id"]: {i for r in e["stitchRanges"] for i in range(r["start"], r["end"] + 1)} for e in ident["elements"]}
    assert not (rangos["ir-rojo"] & rangos["ir-azul"]), "rangos compartidos"
    assert rangos["ir-rojo"] and rangos["ir-azul"]
    return {"ownStitches": propias(ident), "codes": codigos(r)}


@caso("C_division_linaje")
def _():
    o = [obj("a1", "rojo", "satin", "M20 20 L38 20 M20 22 L38 22", ["o0-b0-g0"], ["o0-tp0"], padre="rg-A"),
         obj("a2", "rojo", "satin", "M42 20 L60 20 M42 22 L60 22", ["o0-b0-g0"], ["o0-tp0"], padre="rg-A")]
    r, ident, _, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[25, 21], [35, 21], [45, 21], [55, 21]])])))
    padres = {e["identity"]["id"]: e["identity"]["parents"] for e in ident["elements"]}
    assert padres == {"ir-a1": ["rg-A"], "ir-a2": ["rg-A"]}, padres
    return {"parents": padres, "ownStitches": propias(ident)}


@caso("D_fusion_linaje")
def _():
    o = [obj("c", "rojo", "fill", "M20 18 L60 18 L60 34 L20 34 Z", ["o0-b0-g0", "o0-b0-g1"], ["o0-tp0", "o0-tp1"])]
    r, ident, _, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[25, 20], [30, 25]]), pieza("o0-tp1", [[50, 30], [55, 25]])])))
    e = ident["elements"][0]["identity"]
    assert e["pieces"] == ["o0-tp0", "o0-tp1"] and e["groups"] == ["o0-b0-g0", "o0-b0-g1"], e
    assert not r["metrics"]["quality"]["stitchPlan"]["structuralTruth"]["componentsLost"]
    assert grupo(ident, "o0-b0-g0")["irObjectIds"] == grupo(ident, "o0-b0-g1")["irObjectIds"] == ["ir-c"]
    return {"identity": e, "groups": ident["groups"]}


# La astilla de relleno que Ink/Stitch no cose (la forma de o0-b0-9 de Red Bull).
ASTILLA = "M40.1 21.0 L40.4 21.01 L40.38 21.08 L40.1 21.08 Z"


@caso("E_objeto_perdido_exacto")
def _():
    o = [obj("a", "rojo", "satin", BARRA_B, ["o0-b0-g0"], ["o0-tp0"]),
         obj("astilla", "rojo", "fill", ASTILLA, ["o0-b0-g1"], ["o0-tp1"]),
         obj("c", "rojo", "satin", "M20 40 L60 40 M20 42 L60 42", ["o0-b0-g2"], ["o0-tp2"])]
    r, ident, _, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[30, 31], [50, 31]]), pieza("o0-tp1", [[40.25, 21.04]]), pieza("o0-tp2", [[30, 41], [50, 41]])])))
    assert ident["unstitchedElements"] == ["astilla"], ident["unstitchedElements"]
    perdidas = [(x["id"], x.get("kind"), x["cause"]) for x in r["metrics"]["quality"]["stitchPlan"]["structuralTruth"]["componentsLost"]]
    assert ("o0-tp1", "piece", "no-own-stitches") in perdidas and ("o0-b0-g1", "group", "no-own-stitches") in perdidas, perdidas
    return {"unstitched": ident["unstitchedElements"], "lost": perdidas, "codes": codigos(r)}


@caso("F_la_ruta_no_rompe_la_identidad")
def _():
    base = [obj("a", "rojo", "satin", BARRA_A, ["o0-b0-g0"], ["o0-tp0"]),
            obj("b", "rojo", "satin", BARRA_B, ["o0-b0-g1"], ["o0-tp1"]),
            obj("c", "azul", "running", "M20 45 L60 45", ["o0-b1-g0"], ["o0-tp2"])]
    v = verdad([pieza("o0-tp0", [[30, 21]]), pieza("o0-tp1", [[30, 31]]), pieza("o0-tp2", [[30, 45]])])
    _, i1, _, _ = coser(diseno(base, v))
    _, i2, _, _ = coser(diseno([base[1], base[0], base[2]], v))
    # El orden del motor puede cambiar; lo de cada objeto no.
    assert {e["identity"]["id"] for e in i1["elements"]} == {e["identity"]["id"] for e in i2["elements"]}
    por = lambda i: {e["identity"]["id"]: (e["identity"], e["ownStitches"] > 0) for e in i["elements"]}  # noqa: E731
    assert por(i1) == por(i2), (por(i1), por(i2))
    return {"order1": [e["identity"]["id"] for e in i1["elements"]], "order2": [e["identity"]["id"] for e in i2["elements"]]}


@caso("G_comandos_no_cubren")
def _():
    o = [obj("a", "rojo", "satin", BARRA_A, ["o0-b0-g0"], ["o0-tp0"]), obj("b", "azul", "satin", BARRA_B, ["o0-b1-g0"], ["o0-tp1"], trimAfter=True)]
    _, ident, dst, _ = coser(diseno(o, verdad([pieza("o0-tp0", [[30, 21]]), pieza("o0-tp1", [[30, 31]])])))
    n = 0
    for e in ident["elements"]:
        for rango in e["stitchRanges"]:
            for i in range(rango["start"], rango["end"] + 1):
                assert int(dst.stitches[i][2]) & pe.COMMAND_MASK == pe.STITCH, (e["identity"]["id"], i)
                n += 1
    comandos = {k: len(v) for k, v in ident["commands"].items()}
    assert comandos.get("COLOR_CHANGE") and (comandos.get("TRIM") or comandos.get("JUMP")), comandos
    return {"ownStitchesChecked": n, "commands": comandos}


@caso("H_determinismo")
def _():
    o = [obj("a", "rojo", "satin", BARRA_A, ["o0-b0-g0"], ["o0-tp0"]), obj("b", "azul", "fill", "M20 28 L60 28 L60 36 L20 36 Z", ["o0-b1-g0"], ["o0-tp1"])]
    d = diseno(o, verdad([pieza("o0-tp0", [[30, 21]]), pieza("o0-tp1", [[30, 31]])]))
    _, _, _, x = coser(copy.deepcopy(d))
    _, _, _, y = coser(copy.deepcopy(d))
    assert x["texto"] == y["texto"]
    return {"identityBytes": x["identityBytes"], "sha256": hashlib.sha256(x["texto"]).hexdigest()[:16]}


@caso("adversarial_puntadas_ajenas")
def _():
    # A (una astilla que Ink/Stitch no cose) desaparece; B, un corrido de
    # otro color, pasa EXACTAMENTE por encima de A y de su eje.
    eje_a = "M40.1 21.04 L40.4 21.04"
    o = [obj("A", "rojo", "fill", ASTILLA, ["o0-b0-g0"], ["o0-tpA"]),
         obj("B", "azul", "running", "M20 21.04 L60 21.04", ["o0-b1-g0"], ["o0-tpB"], stitchLengthMm=0.3)]
    v = verdad([pieza("o0-tpA", [[40.15, 21.04], [40.25, 21.04], [40.35, 21.04]]), pieza("o0-tpB", [[25, 21.04], [55, 21.04]])])
    est = [{"id": "o0-b0-g0", "ejes": [eje_a], "largoMm": 0.3}, {"id": "o0-b1-g0", "ejes": ["M20 21.04 L60 21.04"], "largoMm": 40}]
    d = diseno(o, v, est)
    r, ident, dst, _ = coser(d)
    orden = motor.ordered_objects(d)
    viejo_t = topologia_en_dst(dst, orden, v)
    viejo_c = cobertura_de_estructura(dst, orden, est)
    nuevo_t = r["metrics"]["quality"]["stitchPlan"]["structuralTruth"]
    nuevo_c = r["metrics"]["quality"]["stitchPlan"]["strokeCoverage"]
    p = propias(ident)
    assert p["ir-A"] == 0 and p["ir-B"] > 0, p
    assert not any(x["id"] == "o0-tpA" for x in viejo_t.get("componentsLost", [])), "el viejo ya la detectaba"
    assert any(x["id"] == "o0-tpA" and x["cause"] == "no-own-stitches" for x in nuevo_t["componentsLost"]), nuevo_t["componentsLost"]
    assert "TOPOLOGY_COMPONENT_LOST" in codigos(r)
    viejo_g = {g["id"]: g["coverageRatio"] for g in viejo_c.get("worstGroups", [])}
    nuevo_g = {g["id"]: (g["coverageRatio"], g["ownStitches"]) for g in nuevo_c["perGroup"]}
    return {
        "ownStitches": p,
        "old": {"componentsLost": [x["id"] for x in viejo_t.get("componentsLost", [])], "inconclusive": [x["id"] for x in viejo_t.get("inconclusive", [])], "axisCoverage": viejo_g},
        "new": {"componentsLost": [(x["id"], x.get("kind"), x["cause"]) for x in nuevo_t["componentsLost"]], "axisCoverage": nuevo_g},
        "codes": codigos(r),
    }


if __name__ == "__main__":
    print(json.dumps(resultados, indent=1, ensure_ascii=False))
    sys.exit(0 if all(v["ok"] for v in resultados.values()) else 1)
