"""Copia objetos vigentes entre las dos cuentas y verifica SHA-256 al releerlos.

Sin --aplicar sólo imprime el mapa. No borra origen ni sobrescribe destinos
distintos. Las versiones históricas y marcadores de borrado quedan en origen.
Requiere boto3. Usa credenciales distintas para leer y escribir; no abre buckets.
"""
import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

CUENTA = "293310830676"
REGION = "us-east-2"
MAPA = {
    "kustto-publico-prod": f"kustto-publico-prod-{CUENTA}-{REGION}-an",
    "kustto-privado-prod": f"kustto-privado-prod-{CUENTA}-{REGION}-an",
    "kustto-backoffice-prod": f"kustto-backoffice-prod-{CUENTA}-{REGION}-an",
    "kustto-correo-prod": f"kustto-correo-prod-{CUENTA}-{REGION}-an",
    "kustto-embroidery-218897024535-us-east-1": f"kustto-embroidery-{CUENTA}-{REGION}-an",
    "kustto-sitio-prod": f"kustto-sitio-prod-{CUENTA}-{REGION}-an",
    "kustto-test-publico-218897024535-us-east-1": f"kustto-test-publico-{CUENTA}-{REGION}-an",
}
CABECERAS = ("ContentType", "CacheControl", "ContentDisposition", "ContentEncoding", "ContentLanguage", "Expires", "WebsiteRedirectLocation", "Metadata")


def huella(cuerpo, archivo=None):
    sha = hashlib.sha256()
    try:
        for trozo in cuerpo.iter_chunks(chunk_size=1024 * 1024):
            sha.update(trozo)
            if archivo is not None:
                archivo.write(trozo)
    finally:
        cuerpo.close()
    return sha.digest()


def principal():
    os.umask(0o077)
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("salida", type=Path)
    p.add_argument("--aplicar", action="store_true")
    p.add_argument("--solo-aplicacion", action="store_true")
    p.add_argument("--bordados-aplicacion", action="store_true", help="Reúne los bordados antiguos en el bucket privado que usa la API nueva")
    p.add_argument("--bucket", action="append", choices=MAPA, help="Limita la ejecución; puede repetirse")
    args = p.parse_args()
    mapa = {k: v for k, v in MAPA.items() if not args.solo_aplicacion or k in ("kustto-publico-prod", "kustto-privado-prod")}
    if args.bordados_aplicacion:
        mapa = {"kustto-embroidery-218897024535-us-east-1": MAPA["kustto-privado-prod"]}
    if args.bucket:
        mapa = {k: v for k, v in mapa.items() if k in args.bucket}
    print(json.dumps(mapa, indent=2), flush=True)
    if not args.aplicar:
        return
    origen = boto3.Session(profile_name="kustto-admin", region_name="us-east-1")
    destino = boto3.Session(profile_name="kustto", region_name=REGION)
    assert origen.client("sts").get_caller_identity()["Account"] == "218897024535"
    assert destino.client("sts").get_caller_identity()["Account"] == CUENTA
    config = Config(retries={"mode": "standard", "max_attempts": 6}, max_pool_connections=12)
    a = origen.client("s3", config=config)
    b = destino.client("s3", config=config)
    args.salida.mkdir(parents=True, exist_ok=True)
    (args.salida / "mapa-buckets.json").write_text(json.dumps(MAPA if not args.bordados_aplicacion else mapa, indent=2) + "\n")
    resumen_ruta = args.salida / "resumen-s3.json"
    resumen = json.loads(resumen_ruta.read_text()) if resumen_ruta.exists() else {}
    with (args.salida / "objetos-verificados.jsonl").open("a") as registro:
        for viejo, nuevo in mapa.items():
            try:
                b.head_bucket(Bucket=nuevo, ExpectedBucketOwner=CUENTA)
            except ClientError as error:
                if error.response["Error"]["Code"] != "404":
                    raise
                b.create_bucket(Bucket=nuevo, BucketNamespace="account-regional", CreateBucketConfiguration={"LocationConstraint": REGION}, ObjectOwnership="BucketOwnerEnforced")
            b.put_public_access_block(Bucket=nuevo, PublicAccessBlockConfiguration={"BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
            b.put_bucket_versioning(Bucket=nuevo, VersioningConfiguration={"Status": "Enabled"})
            try:
                cors = a.get_bucket_cors(Bucket=viejo)["CORSRules"]
            except ClientError as error:
                if error.response["Error"]["Code"] != "NoSuchCORSConfiguration":
                    raise
                cors = []
            if cors:
                b.put_bucket_cors(Bucket=nuevo, CORSConfiguration={"CORSRules": cors})
            if viejo == "kustto-privado-prod":
                b.put_bucket_cors(Bucket=nuevo, CORSConfiguration={"CORSRules": [{"AllowedHeaders": ["*"], "AllowedMethods": ["PUT", "GET", "HEAD"], "AllowedOrigins": ["https://kustto.com.mx", "https://www.kustto.com.mx", "https://backoffice.kustto.com.mx", "http://localhost:3000"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000}]})
            inventario = [o for pagina in a.get_paginator("list_objects_v2").paginate(Bucket=viejo) for o in pagina.get("Contents", [])]
            print(f"{viejo}: {len(inventario)} objetos", flush=True)

            def copiar(objeto):
                clave = objeto["Key"]
                respuesta = a.get_object(Bucket=viejo, Key=clave, IfMatch=objeto["ETag"])
                version = respuesta.get("VersionId")
                with tempfile.TemporaryFile() as temporal:
                    sha = huella(respuesta["Body"], temporal)
                    if temporal.tell() != objeto["Size"]:
                        raise RuntimeError(f"Origen cambió de tamaño: {viejo}/{clave}")
                    etiquetas = a.get_object_tagging(Bucket=viejo, Key=clave, **({"VersionId": version} if version else {}))["TagSet"]
                    extras = {k: respuesta[k] for k in CABECERAS if k in respuesta}
                    try:
                        existente = b.get_object(Bucket=nuevo, Key=clave, ExpectedBucketOwner=CUENTA)
                    except ClientError as error:
                        if error.response["Error"]["Code"] != "NoSuchKey":
                            raise
                        temporal.seek(0)
                        b.put_object(Bucket=nuevo, Key=clave, Body=temporal, ContentLength=objeto["Size"], IfNoneMatch="*", ChecksumSHA256=base64.b64encode(sha).decode(), Tagging=urlencode({t['Key']: t['Value'] for t in etiquetas}), **extras)
                        existente = b.get_object(Bucket=nuevo, Key=clave, ExpectedBucketOwner=CUENTA)
                    sha_destino = huella(existente["Body"])
                    if sha_destino != sha:
                        raise RuntimeError(f"Conflicto de contenido en {nuevo}/{clave}; no se sobrescribió")
                    for k, valor in extras.items():
                        if existente.get(k) != valor:
                            raise RuntimeError(f"Metadato distinto {k}: {nuevo}/{clave}")
                    tags_destino = b.get_object_tagging(Bucket=nuevo, Key=clave)["TagSet"]
                    if {t['Key']: t['Value'] for t in etiquetas} != {t['Key']: t['Value'] for t in tags_destino}:
                        raise RuntimeError(f"Etiquetas distintas: {nuevo}/{clave}")
                    return {"origen": viejo, "destino": nuevo, "clave": clave, "versionOrigen": version, "bytes": objeto["Size"], "sha256": sha.hex()}

            with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ejecutor:
                for n, resultado in enumerate(ejecutor.map(copiar, inventario), 1):
                    registro.write(json.dumps(resultado) + "\n")
                    registro.flush()
                    if n % 50 == 0:
                        print(f"  {n}/{len(inventario)} verificados", flush=True)
            posterior = [o for pagina in a.get_paginator("list_objects_v2").paginate(Bucket=viejo) for o in pagina.get("Contents", [])]
            if {(o["Key"], o["ETag"], o["Size"]) for o in inventario} != {(o["Key"], o["ETag"], o["Size"]) for o in posterior}:
                raise RuntimeError(f"{viejo} cambió durante la copia; repetir después de detener escrituras")
            resumen[viejo] = {"destino": nuevo, "objetos": len(inventario), "bytes": sum(o["Size"] for o in inventario), "verificacion": "SHA-256, metadatos y etiquetas"}
            (args.salida / "resumen-s3.json").write_text(json.dumps(resumen, indent=2) + "\n")
    print("Copia terminada y verificada", flush=True)


if __name__ == "__main__":
    principal()
