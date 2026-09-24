"""Genera SQL transaccional desde la base temporal, sin pedidos ni compras.

DATABASE_URL debe señalar una base local cuyo nombre contenga migracion.
Uso: python3 scripts/migracion/exportar-paquete.py CARPETA_SALIDA
"""
import argparse
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

ESQUEMA = """(SELECT jsonb_build_object(
 'columns', (SELECT jsonb_agg(jsonb_build_array(table_name,column_name,data_type,udt_name,is_nullable,column_default) ORDER BY table_name,column_name) FROM information_schema.columns WHERE table_schema='public'),
 'constraints', (SELECT jsonb_agg(jsonb_build_array(conrelid::regclass::text,conname,pg_get_constraintdef(oid)) ORDER BY (conrelid::regclass::text) COLLATE "C", conname COLLATE "C") FROM pg_constraint WHERE contype <> 'n' AND connamespace='public'::regnamespace),
 'indexes', (SELECT jsonb_agg(jsonb_build_array(tablename,indexname,indexdef) ORDER BY tablename,indexname) FROM pg_indexes WHERE schemaname='public')))"""


def principal():
    os.umask(0o077)
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("salida", type=Path)
    p.add_argument("--reemplazar-categorias", action="store_true", help="Sustituye las cuatro categorías iniciales del destino por las de esta base")
    args = p.parse_args()
    url = os.environ["DATABASE_URL"]
    direccion = urlparse(url)
    if direccion.hostname not in ("localhost", "127.0.0.1") or "migracion" not in direccion.path:
        raise RuntimeError("Sólo se exporta desde la base temporal local de migracion")

    def consulta(sql):
        return subprocess.check_output(["psql", url, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql], text=True).strip()

    if consulta("SELECT (SELECT count(*) FROM pedidos)+(SELECT count(*) FROM compras)") != "0":
        raise RuntimeError("El paquete no debe incluir pedidos ni compras")
    tablas = consulta("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    datos = {t: json.loads(consulta(f'SELECT coalesce(json_agg(t),\'[]\') FROM "{t}" t')) for t in tablas}
    args.salida.mkdir(parents=True, exist_ok=True)
    (args.salida / "datos-verificacion.json").write_text(json.dumps(datos, ensure_ascii=False))
    (args.salida / "conteos.json").write_text(json.dumps({k: len(v) for k, v in datos.items()}, indent=2))
    migraciones = consulta("SELECT jsonb_agg(jsonb_build_object('hash',hash,'created_at',created_at) ORDER BY created_at)::text FROM drizzle.__drizzle_migrations")
    esquema = consulta(f"SELECT {ESQUEMA}::text")
    categorias = consulta("SELECT jsonb_agg(to_jsonb(c)-'id'-'creado_en'-'actualizado_en' ORDER BY slug)::text FROM categorias_paquete c")
    slugs = consulta("SELECT jsonb_agg(slug ORDER BY slug)::text FROM categorias_paquete")
    comprobacion_categorias = f"""IF (SELECT jsonb_agg(slug ORDER BY slug) FROM categorias_paquete)
    IS DISTINCT FROM $json${slugs}$json$::jsonb THEN
  RAISE EXCEPTION 'El destino no tiene las categorías iniciales esperadas';
 END IF;""" if args.reemplazar_categorias else f"""IF (SELECT jsonb_agg(to_jsonb(c)-'id'-'creado_en'-'actualizado_en' ORDER BY slug) FROM categorias_paquete c)
    IS DISTINCT FROM $json${categorias}$json$::jsonb THEN
  RAISE EXCEPTION 'Las categorías de paquetes deben ser las cuatro iniciales del esquema';
 END IF;"""
    comprobacion_esquema = f"""IF {ESQUEMA} IS DISTINCT FROM $json${esquema}$json$::jsonb THEN
  RAISE EXCEPTION 'El esquema de producción difiere del esquema local';
 END IF;""" if args.reemplazar_categorias else f"""IF (SELECT jsonb_agg(jsonb_build_object('hash',hash,'created_at',created_at) ORDER BY created_at) FROM drizzle.__drizzle_migrations)
    IS DISTINCT FROM $json${migraciones}$json$::jsonb THEN
  RAISE EXCEPTION 'Aplica las migraciones de esta versión de kustto-api antes de importar';
 END IF;"""
    guardia = f"""
DO $migracion$
DECLARE tabla text; hay_datos boolean;
BEGIN
 {comprobacion_esquema}
 FOR tabla IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'categorias_paquete' LOOP
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', tabla) INTO hay_datos;
  IF hay_datos THEN RAISE EXCEPTION 'Destino con datos en %. No se sobrescribe ni se mezcla', tabla; END IF;
 END LOOP;
 {comprobacion_categorias}
END $migracion$;
"""
    if args.reemplazar_categorias:
        guardia += "DELETE FROM categorias_paquete;\n"
    for nombre, opciones, validacion in [
        ("kustto-sin-pedidos.sql", [], ""),
        ("migrar-datos-sin-pedidos.sql", ["--data-only", "--schema=public", *([] if args.reemplazar_categorias else ["--exclude-table-data=public.categorias_paquete"])], guardia),
    ]:
        dump = subprocess.check_output(["pg_dump", "--no-owner", "--no-privileges", "--no-comments", f"--dbname={url}", *opciones], text=True)
        (args.salida / nombre).write_text("-- Kustto: captura de producción sin pedidos ni compras. Contiene datos personales.\n\\set ON_ERROR_STOP on\nBEGIN;\n" + validacion + dump + "\nCOMMIT;\n")
    print("SQL completo y SQL de datos generados; ambos abortan sin cambios ante un error")


if __name__ == "__main__":
    principal()
