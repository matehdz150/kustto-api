"""Vista del bordado a partir del DST: lo que la maquina va a coser.

    python3 vista_hilo.py <design.dst> <carpeta> --colores '#e50914' [--tela '#111111']
        [--px-por-mm 16] [--mascara mascara.png --caja minX,minY,maxX,maxY]

SALE DEL DST Y NO DE LA GEOMETRIA a proposito. La geometria es lo que se le
pidio a Ink/Stitch; el DST es lo que Ink/Stitch decidio coser, con su underlay,
su compensacion y su orden. Juzgar un motor mirando la geometria es juzgar la
receta y no el plato.

Escribe dos imagenes:

  - `hilo.png`: cada puntada con el grosor de un hilo (0.38 mm), su brillo y
    el agujero de la aguja, en el orden en que se cose: lo de despues tapa lo
    de antes, igual que en la tela.
  - `tecnica.png`: las puntadas finas y los SALTOS en rojo. Es donde se ve la
    fragmentacion: cada salto es un corte de hilo o un hilo suelto por encima.

Con `--mascara` (la forma original rasterizada, blanco = diseno) mide cuanto
de la forma queda cubierto por hilo y cuanto hilo cae fuera. Con `--mascaras`,
una por color, lo mide ademas COLOR A COLOR: en un logo, que la forma entera
tenga hilo no dice nada si lo rojo se cosio de azul. `--grupos` dice a que
mascara va cada bloque del DST (`0,1,0` si el rojo se cose antes y despues del
azul); por defecto, uno a uno. La alineacion se
hace por el centro de las cajas: el DST no guarda el origen del SVG, y la
compensacion ensancha por igual a los dos lados, asi que el centro no se mueve.

Imprime las medidas en JSON por la salida estandar.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import pyembroidery as pe
from PIL import Image, ImageChops, ImageDraw, ImageFilter

GROSOR_HILO_MM = 0.38
# Para medir cobertura cuenta lo que el hilo ocupa ya asentado, algo más que su
# grosor: con 0.38 mm, un satin perfecto a 0.42 mm dejaba una raya "sin hilo"
# entre cada dos puntadas y la medida decía 90 % donde la tela no se ve.
COBERTURA_HILO_MM = 0.5
SOBREMUESTREO = 2


def hex_a_rgb(valor: str) -> tuple[int, int, int]:
    valor = valor.lstrip("#")
    return tuple(int(valor[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def tono(rgb: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    if factor >= 1:
        return tuple(round(c + (255 - c) * (factor - 1)) for c in rgb)  # type: ignore[return-value]
    return tuple(round(c * factor) for c in rgb)  # type: ignore[return-value]


def recorridos(patron: pe.EmbPattern):
    """Tramos de puntadas seguidas, con su bloque de color, y los saltos."""
    tramos: list[tuple[int, list[tuple[float, float]]]] = []
    saltos: list[tuple[tuple[float, float], tuple[float, float]]] = []
    bloque = 0
    actual: list[tuple[float, float]] = []
    previo: tuple[float, float] | None = None
    for x, y, comando in patron.stitches:
        tipo = int(comando) & pe.COMMAND_MASK
        punto = (x / 10.0, y / 10.0)
        if tipo == pe.STITCH:
            if not actual and previo is not None:
                actual.append(previo)
            actual.append(punto)
        else:
            if len(actual) >= 2:
                tramos.append((bloque, actual))
            actual = []
            if tipo in (pe.JUMP, pe.TRIM) and previo is not None and previo != punto:
                saltos.append((previo, punto))
            if tipo in (pe.COLOR_CHANGE, pe.NEEDLE_SET):
                bloque += 1
        previo = punto
    if len(actual) >= 2:
        tramos.append((bloque, actual))
    return tramos, saltos


def main() -> int:
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("dst")
    argumentos.add_argument("carpeta")
    argumentos.add_argument("--colores", default="#111111")
    argumentos.add_argument("--tela", default="#e8e2d6")
    argumentos.add_argument("--px-por-mm", type=float, default=16)
    argumentos.add_argument("--mascara")
    argumentos.add_argument("--caja")
    argumentos.add_argument("--mascaras")
    argumentos.add_argument("--grupos")
    a = argumentos.parse_args()

    patron = pe.read(a.dst)
    if patron is None:
        raise SystemExit("DST_UNREADABLE")
    tramos, saltos = recorridos(patron)
    colores = [hex_a_rgb(c) for c in a.colores.split(",") if c]
    todos = [p for _, t in tramos for p in t]
    min_x = min(p[0] for p in todos)
    min_y = min(p[1] for p in todos)
    max_x = max(p[0] for p in todos)
    max_y = max(p[1] for p in todos)
    margen = 2.0
    escala = a.px_por_mm * SOBREMUESTREO
    ancho = math.ceil((max_x - min_x + 2 * margen) * escala)
    alto = math.ceil((max_y - min_y + 2 * margen) * escala)

    def px(p: tuple[float, float]) -> tuple[float, float]:
        return ((p[0] - min_x + margen) * escala, (p[1] - min_y + margen) * escala)

    grosor = max(1, round(GROSOR_HILO_MM * escala))
    tela = hex_a_rgb(a.tela)
    hilo = Image.new("RGB", (ancho, alto), tela)
    dibujo = ImageDraw.Draw(hilo)
    # Una sombra corta primero, para que el hilo se lea ENCIMA de la tela.
    sombra = tono(tela, 0.55)
    for _, tramo in tramos:
        for p, q in zip(tramo, tramo[1:]):
            a1, b1 = px(p), px(q)
            dibujo.line((a1[0] + grosor * 0.35, a1[1] + grosor * 0.45, b1[0] + grosor * 0.35, b1[1] + grosor * 0.45), fill=sombra, width=grosor)
    for bloque, tramo in tramos:
        base = colores[min(bloque, len(colores) - 1)] if colores else (17, 17, 17)
        oscuro, claro = tono(base, 0.62), tono(base, 1.28)
        for p, q in zip(tramo, tramo[1:]):
            a1, b1 = px(p), px(q)
            dibujo.line((a1, b1), fill=oscuro, width=grosor)
            dibujo.line((a1, b1), fill=base, width=max(1, round(grosor * 0.7)))
            # El lomo del hilo, corrido hacia la luz.
            dibujo.line((a1[0] - grosor * 0.12, a1[1] - grosor * 0.12, b1[0] - grosor * 0.12, b1[1] - grosor * 0.12), fill=claro, width=max(1, round(grosor * 0.22)))
            for extremo in (a1, b1):
                r = grosor * 0.2
                dibujo.ellipse((extremo[0] - r, extremo[1] - r, extremo[0] + r, extremo[1] + r), fill=tono(base, 0.4))
    hilo = hilo.resize((ancho // SOBREMUESTREO, alto // SOBREMUESTREO), Image.LANCZOS)
    carpeta = Path(a.carpeta)
    carpeta.mkdir(parents=True, exist_ok=True)
    hilo.save(carpeta / "hilo.png", optimize=True)

    tecnica = Image.new("RGB", (ancho // SOBREMUESTREO, alto // SOBREMUESTREO), "#ffffff")
    trazo = ImageDraw.Draw(tecnica)
    reducir = lambda p: (px(p)[0] / SOBREMUESTREO, px(p)[1] / SOBREMUESTREO)  # noqa: E731
    for bloque, tramo in tramos:
        base = colores[min(bloque, len(colores) - 1)] if colores else (17, 17, 17)
        trazo.line([reducir(p) for p in tramo], fill=tono(base, 0.8), width=1)
    for p, q in saltos:
        trazo.line((reducir(p), reducir(q)), fill=(220, 30, 30), width=2)
        for extremo in (reducir(p), reducir(q)):
            trazo.ellipse((extremo[0] - 3, extremo[1] - 3, extremo[0] + 3, extremo[1] + 3), outline=(220, 30, 30))
    tecnica.save(carpeta / "tecnica.png", optimize=True)

    medidas: dict[str, float | int] = {
        "tramosDeHilo": len(tramos),
        "saltosDibujados": len(saltos),
        "anchoMm": round(max_x - min_x, 2),
        "altoMm": round(max_y - min_y, 2),
    }

    if a.mascara and a.caja:
        # La forma original, en su caja en mm, al mismo tamaño de pixel.
        forma = Image.open(a.mascara).convert("L")
        cx0, cy0, cx1, cy1 = (float(v) for v in a.caja.split(","))
        paso = a.px_por_mm
        lienzo_w = math.ceil((cx1 - cx0 + 2 * margen) * paso)
        lienzo_h = math.ceil((cy1 - cy0 + 2 * margen) * paso)
        forma_lienzo = Image.new("L", (lienzo_w, lienzo_h), 0)
        forma_lienzo.paste(forma.resize((round((cx1 - cx0) * paso), round((cy1 - cy0) * paso))), (round(margen * paso), round(margen * paso)))
        # El hilo, centrado sobre la forma.
        dx = ((cx0 + cx1) / 2) - ((min_x + max_x) / 2)
        dy = ((cy0 + cy1) / 2) - ((min_y + max_y) / 2)
        cubierto = Image.new("L", (lienzo_w, lienzo_h), 0)
        marca = ImageDraw.Draw(cubierto)
        g = max(1, round(COBERTURA_HILO_MM * paso))
        for _, tramo in tramos:
            puntos = [((p[0] + dx - cx0 + margen) * paso, (p[1] + dy - cy0 + margen) * paso) for p in tramo]
            marca.line(puntos, fill=255, width=g)
        dentro = ImageChops.multiply(forma_lienzo, cubierto)
        # "Fuera" es lo que pasa de 0.3 mm del borde. Hasta ahí llega CUALQUIER
        # bordado bien hecho: la compensación y el medio grosor del hilo en todo
        # el contorno. Contarlo tapaba lo que interesa: traslados por la tela y
        # columnas que se salen.
        holgura = 2 * max(1, round(0.3 * paso)) + 1
        forma_holgada = forma_lienzo.filter(ImageFilter.MaxFilter(holgura))
        fuera = ImageChops.subtract(cubierto, forma_holgada)
        sin = ImageChops.subtract(forma_lienzo, cubierto)
        cuenta = lambda imagen: sum(imagen.histogram()[128:])  # noqa: E731
        area_forma = cuenta(forma_lienzo)
        medidas["coberturaPct"] = round(100 * cuenta(dentro) / max(1, area_forma), 2)
        medidas["sinHiloMm2"] = round(cuenta(sin) / (paso * paso), 2)
        medidas["hiloFueraMm2"] = round(cuenta(fuera) / (paso * paso), 2)
        # Donde falta hilo, en rojo sobre la forma: lo primero que hay que mirar.
        huecos = Image.new("RGB", (lienzo_w, lienzo_h), "#ffffff")
        huecos.paste((225, 225, 225), mask=forma_lienzo)
        huecos.paste((40, 40, 40), mask=dentro)
        huecos.paste((230, 30, 30), mask=sin)
        huecos.paste((255, 170, 0), mask=fuera)
        huecos.save(carpeta / "cobertura.png", optimize=True)

        if a.mascaras:
            rutas = [r for r in a.mascaras.split(",") if r]
            bloques = max((b for b, _ in tramos), default=0) + 1
            grupo_de = [int(g) for g in a.grupos.split(",")] if a.grupos else list(range(bloques))
            por_color = []
            lienzo_colores = Image.new("RGB", (lienzo_w, lienzo_h), "#ffffff")
            faltas = Image.new("L", (lienzo_w, lienzo_h), 0)
            sobras = Image.new("L", (lienzo_w, lienzo_h), 0)
            for grupo, ruta in enumerate(rutas):
                propia = Image.new("L", (lienzo_w, lienzo_h), 0)
                propia.paste(Image.open(ruta).convert("L").resize((round((cx1 - cx0) * paso), round((cy1 - cy0) * paso))), (round(margen * paso), round(margen * paso)))
                suyo = Image.new("L", (lienzo_w, lienzo_h), 0)
                marca = ImageDraw.Draw(suyo)
                for b, tramo in tramos:
                    if b >= len(grupo_de) or grupo_de[b] != grupo:
                        continue
                    marca.line([((p[0] + dx - cx0 + margen) * paso, (p[1] + dy - cy0 + margen) * paso) for p in tramo], fill=255, width=g)
                area = cuenta(propia)
                sin_hilo = ImageChops.subtract(propia, suyo)
                fuera_k = ImageChops.subtract(suyo, propia.filter(ImageFilter.MaxFilter(holgura)))
                faltas = ImageChops.lighter(faltas, sin_hilo)
                sobras = ImageChops.lighter(sobras, fuera_k)
                primero = grupo_de.index(grupo) if grupo in grupo_de else grupo
                base = colores[min(primero, len(colores) - 1)] if colores else (17, 17, 17)
                lienzo_colores.paste(tono(base, 1.55), mask=propia)
                por_color.append({
                    "grupo": grupo,
                    "color": "#%02x%02x%02x" % base,
                    "areaMm2": round(area / (paso * paso), 2),
                    "coberturaPct": round(100 * cuenta(ImageChops.multiply(propia, suyo)) / max(1, area), 2),
                    "sinHiloMm2": round(cuenta(sin_hilo) / (paso * paso), 2),
                    "hiloFueraMm2": round(cuenta(fuera_k) / (paso * paso), 2),
                })
            medidas["porColor"] = por_color
            # Cada color en su tono claro; en rojo lo que su hilo no cubre y en
            # naranja su hilo fuera de su zona.
            lienzo_colores.paste((230, 30, 30), mask=faltas)
            lienzo_colores.paste((255, 170, 0), mask=sobras)
            lienzo_colores.save(carpeta / "cobertura-colores.png", optimize=True)

    print(json.dumps(medidas))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
