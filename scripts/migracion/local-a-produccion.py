"""Migra la base local y sus archivos S3 a producción con un solo comando.

Ejecutar desde kustto-api: pnpm migrar:local-a-produccion
Excluye pedidos y compras. --solo-verificar prepara y prueba sin escribir en RDS.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import boto3

RAIZ = Path(__file__).resolve().parents[2]
INFRA = RAIZ.parent / "kustto-infra"
DESTINO_PUBLICO = "kustto-publico-prod-293310830676-us-east-2-an"
CONSULTA_CONTEOS = "select jsonb_object_agg(t,n)::text from (select 'usuarios' t,count(*) n from usuarios union all select 'productos',count(*) from productos union all select 'pedidos',count(*) from pedidos union all select 'compras',count(*) from compras union all select 'talleres',count(*) from talleres union all select 'plantillas',count(*) from plantillas_de_prenda) s"
PREPARAR = """BEGIN;
DELETE FROM pedidos;
DELETE FROM compras;
DELETE FROM cotizaciones_de_envio;
DELETE FROM sesiones;
DELETE FROM tokens_de_un_uso;
UPDATE categorias SET imagen_url = NULL WHERE imagen_url = '/medios/categorias/x.png';
DELETE FROM producto_imagenes WHERE url = '/medios/productos/x.png';
COMMIT;"""
REMOTE_ENV = "set -a; . /opt/kustto/.env; set +a; export PGSSLROOTCERT=/opt/kustto/certs/rds-global-bundle.pem; "


def paso(etiqueta, args, *, env=None, stdout=None, stdin=None, texto=None):
    print(etiqueta, flush=True)
    resultado = subprocess.run(args, cwd=RAIZ, env=env, stdout=stdout, stdin=stdin,
                             input=texto, text=texto is not None, stderr=subprocess.PIPE)
    if resultado.returncode:
        # La excepción no incluye argumentos de conexión, que llevan contraseña.
        detalle = resultado.stderr.decode(errors="replace") if isinstance(resultado.stderr, bytes) else resultado.stderr
        raise RuntimeError(f"{etiqueta}: {detalle[-1800:]}")
    return resultado.stdout


def leer_local():
    archivo = RAIZ / ".env"
    valores = {}
    for linea in archivo.read_text().splitlines():
        if "=" not in linea or linea.lstrip().startswith("#"):
            continue
        clave, valor = linea.split("=", 1)
        valores[clave] = valor.strip().strip('"').strip("'")
    url = os.environ.get("KUSTTO_LOCAL_DATABASE_URL") or valores.get("DATABASE_URL")
    if not url or urlparse(url).hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("DATABASE_URL local debe apuntar a localhost; revisa kustto-api/.env")
    return url


def base_con_nombre(url, nombre):
    partes = urlparse(url)
    return urlunparse(partes._replace(path="/" + nombre))


def consulta(url, sql):
    resultado = subprocess.run(["psql", "-X", "-At", "-v", "ON_ERROR_STOP=1", url, "-c", sql],
                              cwd=RAIZ, capture_output=True, text=True)
    if resultado.returncode:
        raise RuntimeError(f"Error consultando PostgreSQL: {resultado.stderr[-1500:]}")
    return resultado.stdout.strip()


def ssh_orden(ip, llave, comando):
    return ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=10", "-i", str(llave), f"ec2-user@{ip}", comando]


def remoto(ip, llave, sql):
    orden = ssh_orden(ip, llave, REMOTE_ENV + f'psql -X -At "$DATABASE_URL" -c "{sql}"')
    resultado = subprocess.run(orden, cwd=RAIZ, capture_output=True, text=True)
    if resultado.returncode:
        raise RuntimeError(f"No se pudo consultar RDS desde EC2: {resultado.stderr[-1500:]}")
    return resultado.stdout.strip()


def datos(url):
    tablas = consulta(url, "select tablename from pg_tables where schemaname='public' order by tablename").splitlines()
    return {tabla: json.loads(consulta(url, f'SELECT coalesce(json_agg(t),\'[]\') FROM "{tabla}" t')) for tabla in tablas}


def referencias(valor, salida):
    if isinstance(valor, str):
        if valor.startswith(("/medios/", "/mockups/", "/eventos/", "/carritos/")):
            salida.add(valor)
        if "kustto-publico-prod" in valor or "kustto-privado-prod" in valor:
            raise RuntimeError("Quedó una referencia absoluta al bucket anterior")
    elif isinstance(valor, dict):
        for hijo in valor.values():
            referencias(hijo, salida)
    elif isinstance(valor, list):
        for hijo in valor:
            referencias(hijo, salida)


def verificar_archivos(filas):
    rutas = set()
    referencias(filas, rutas)
    s3 = boto3.Session(profile_name="kustto", region_name="us-east-2").client("s3")
    claves = {objeto["Key"] for pagina in s3.get_paginator("list_objects_v2").paginate(Bucket=DESTINO_PUBLICO)
              for objeto in pagina.get("Contents", [])}
    faltantes = sorted(ruta for ruta in rutas if ruta.lstrip("/") not in claves)
    if faltantes:
        raise RuntimeError(f"{len(faltantes)} imágenes/archivos no están en el bucket nuevo: {faltantes[:10]}")
    print(f"{len(rutas)} rutas de S3 verificadas en el bucket nuevo", flush=True)


def iguales(a, b):
    for tabla, filas in a.items():
        anteriores = sorted(json.dumps(fila, sort_keys=True, ensure_ascii=False) for fila in filas)
        posteriores = sorted(json.dumps(fila, sort_keys=True, ensure_ascii=False) for fila in b[tabla])
        if anteriores != posteriores:
            raise RuntimeError(f"La restauración de prueba difiere en {tabla}")
    print(f"Restauración de prueba: {len(a)} tablas y {sum(map(len, a.values()))} filas idénticas", flush=True)


def principal():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--solo-verificar", action="store_true")
    args = parser.parse_args()
    local = leer_local()
    llave = Path(os.environ.get("KUSTTO_SSH_KEY", str(INFRA / "Mac-Book-mateo-kustto.pem"))).expanduser()
    if not llave.is_file():
        raise RuntimeError(f"Falta la llave SSH de producción: {llave}")
    sesion = boto3.Session(profile_name="kustto", region_name="us-east-2")
    if sesion.client("sts").get_caller_identity()["Account"] != "293310830676":
        raise RuntimeError("El perfil kustto no pertenece a la cuenta de destino")
    ec2 = sesion.client("ec2").describe_instances(InstanceIds=["i-0a16e3e3416615846"])
    ip = ec2["Reservations"][0]["Instances"][0]["PublicIpAddress"]
    marca = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
    salida = INFRA / "migracion" / f"local-a-produccion-{marca}"
    salida.mkdir(parents=True, exist_ok=False)
    temporal = f"kustto_migracion_local_{os.getpid()}"
    prueba = f"kustto_migracion_prueba_{os.getpid()}"
    env = os.environ.copy()
    try:
        if subprocess.run(["pg_isready", "-d", local], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
            paso("Iniciando PostgreSQL local", ["docker", "compose", "up", "-d", "postgres"])
            for _ in range(30):
                if subprocess.run(["pg_isready", "-d", local], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                    break
                time.sleep(1)
            else:
                raise RuntimeError("PostgreSQL local no inició")
        print("Origen local:", consulta(local, CONSULTA_CONTEOS), flush=True)
        destino_actual = json.loads(remoto(ip, llave, CONSULTA_CONTEOS))
        print("Destino antes:", json.dumps(destino_actual), flush=True)
        if not args.solo_verificar and any(int(n) for n in destino_actual.values()):
            raise RuntimeError("Producción ya tiene datos; esta migración se ejecuta una sola vez y no duplica filas")
        paso("Respaldando PostgreSQL local", ["pg_dump", "-Fc", "-f", str(salida / "local-original.dump"), local])
        paso("Creando copia temporal local", ["createdb", f"--maintenance-db={local}", temporal])
        stage = base_con_nombre(local, temporal)
        paso("Restaurando copia temporal", ["pg_restore", "--exit-on-error", "--no-owner", "--no-privileges", "-d", stage, str(salida / "local-original.dump")])
        paso("Excluyendo pedidos y referencias de prueba en la copia", ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", stage, "-c", PREPARAR])
        if not args.solo_verificar:
            paso("Actualizando medios y mockups de S3", [sys.executable, "scripts/migracion/copiar-s3.py", str(salida / "s3"), "--aplicar", "--solo-aplicacion"])
            paso("Reuniendo archivos de bordado", [sys.executable, "scripts/migracion/copiar-s3.py", str(salida / "bordados"), "--aplicar", "--bordados-aplicacion"])
            politica = json.loads((RAIZ / "scripts/migracion/iam-s3-runtime.json").read_text())
            sesion.client("iam").put_role_policy(
                RoleName="kustto-prod-ec2-role",
                PolicyName="KusttoS3Runtime",
                PolicyDocument=json.dumps(politica),
            )
            print("Acceso S3 de la API configurado para los buckets nuevos", flush=True)
        esperado = datos(stage)
        verificar_archivos(esperado)
        if esperado["pedidos"] or esperado["compras"]:
            raise RuntimeError("La copia temporal aún contiene pedidos o compras")
        env["DATABASE_URL"] = stage
        paso("Generando SQL desde la base local", [sys.executable, "scripts/migracion/exportar-paquete.py", str(salida), "--reemplazar-categorias"], env=env)
        paso("Creando base de prueba", ["createdb", f"--maintenance-db={local}", prueba])
        test_url = base_con_nombre(local, prueba)
        env["DATABASE_URL"] = test_url
        paso("Aplicando esquema en la prueba", ["node", "--import", "tsx", "src/db/migrar.ts"], env=env)
        paso("Restaurando SQL en la prueba", ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", test_url, "-f", str(salida / "migrar-datos-sin-pedidos.sql")])
        iguales(esperado, datos(test_url))
        if args.solo_verificar:
            print("Verificación terminada. RDS no se modificó.", flush=True)
            return
        # El respaldo de RDS se guarda fuera del repositorio antes de parar la API.
        backup = ssh_orden(ip, llave, REMOTE_ENV + 'pg_dump -Fc "$DATABASE_URL"')
        with (salida / "produccion-antes.dump").open("wb") as archivo:
            paso("Respaldando RDS antes de importar", backup, stdout=archivo)
        comando = ("set -euo pipefail; cd /opt/kustto; " + REMOTE_ENV +
                   "docker compose stop api workers >/dev/null; " +
                   "trap 'docker compose start api workers >/dev/null; docker exec kustto-nginx nginx -s reload >/dev/null' EXIT; " +
                   'psql -X -v ON_ERROR_STOP=1 "$DATABASE_URL" -f - >/dev/null; ' +
                   f'psql -X -At "$DATABASE_URL" -c "{CONSULTA_CONTEOS}"')
        with (salida / "migrar-datos-sin-pedidos.sql").open("rb") as archivo:
            salida_remota = paso("Importando en RDS y reiniciando API/workers", ssh_orden(ip, llave, comando), stdin=archivo, stdout=subprocess.PIPE)
        resultado = json.loads(salida_remota.decode().strip().splitlines()[-1])
        for tabla in ("usuarios", "productos", "talleres", "plantillas", "pedidos", "compras"):
            fuente = {"plantillas": "plantillas_de_prenda"}.get(tabla, tabla)
            if int(resultado[tabla]) != len(esperado[fuente]):
                raise RuntimeError(f"El conteo de RDS difiere en {tabla}")
        (salida / "resultado.json").write_text(json.dumps({"destino": resultado, "archivosVerificados": True}, indent=2))
        print("Migración completa desde la base local a producción:", json.dumps(resultado), flush=True)
    finally:
        for nombre in (prueba, temporal):
            subprocess.run(["dropdb", "--if-exists", "--force", f"--maintenance-db={local}", nombre],
                           cwd=RAIZ, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Respaldo y reporte: {salida}", flush=True)


if __name__ == "__main__":
    try:
        principal()
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
