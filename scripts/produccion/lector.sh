#!/usr/bin/env bash
# UNA SOLA VEZ: crea en producción el usuario `kustto_lectura`, que sólo puede
# LEER el catálogo, y deja su dirección (por el túnel) en `.env` como
# KUSTTO_LECTURA_URL. Es lo que usa `pnpm db:traer-produccion`.
#
#   pnpm db:crear-lector
#
# Pide la contraseña del usuario maestro de la base (`postgres`) en la
# terminal, sin mostrarla: hace falta para crear un usuario. Los permisos los
# da `kustto_app`, dueño de las tablas, desde el contenedor de la API.
#
# QUÉ PUEDE LEER: el catálogo (plantillas, categorías, tipos, productos y todo
# lo suyo, paquetes), de los talleres sólo lo público y de las partidas de
# pedido sólo el arte. NADA de usuarios, compradores, compras ni direcciones.
# Además todas sus sesiones son de sólo lectura.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/produccion/tunel.sh

CLAVE=$(openssl rand -hex 24)

read -r -s -p "Contraseña del usuario maestro 'postgres' de la base de producción: " MAESTRA
echo

abrir_tunel

echo "==> Creando el usuario kustto_lectura"
PGPASSWORD="$MAESTRA" PGSSLMODE=require psql -h localhost -p "$KUSTTO_TUNEL_PUERTO" \
	-U postgres -d kustto -v ON_ERROR_STOP=1 -q -v clave="$CLAVE" <<'SQL'
SELECT 'CREATE ROLE kustto_lectura LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kustto_lectura')\gexec
ALTER ROLE kustto_lectura WITH LOGIN PASSWORD :'clave';
ALTER ROLE kustto_lectura SET default_transaction_read_only = on;
SQL
unset MAESTRA

echo "==> Dándole permiso de leer el catálogo (como kustto_app, dueño de las tablas)"
ssh -i "$KUSTTO_PEM" "$KUSTTO_EC2" 'docker exec -i kustto-api node -e "
const {Pool}=require(\"pg\");
const p=new Pool({connectionString:process.env.DATABASE_URL});
const sql=require(\"fs\").readFileSync(0,\"utf8\");
p.query(sql).then(()=>{console.log(\"permisos dados\");return p.end()}).catch(e=>{console.error(e.message);process.exit(1)})"' <<'SQL'
GRANT CONNECT ON DATABASE kustto TO kustto_lectura;
GRANT USAGE ON SCHEMA public TO kustto_lectura;
GRANT SELECT ON plantillas_de_prenda, categorias, tipos_de_producto, productos,
	producto_categorias, producto_imagenes, producto_colores, producto_tallas,
	producto_lados, producto_precios, producto_produccion, producto_existencias,
	producto_fotos_reales, categorias_paquete, paquetes, paquete_productos,
	paquete_categorias TO kustto_lectura;
GRANT SELECT (id, nombre, slug, nombre_publico, bio, avatar_url, banner_url, creado_en)
	ON talleres TO kustto_lectura;
GRANT SELECT (producto_id, nombre, sku, imagen_url, plantilla_id, color, color_hex,
	lados, arte, diseno_ruta, bordados, dias_prometidos)
	ON pedido_partidas TO kustto_lectura;
SQL

URL="postgres://kustto_lectura:${CLAVE}@localhost:${KUSTTO_TUNEL_PUERTO}/kustto?sslmode=no-verify"
touch .env
grep -v '^KUSTTO_LECTURA_URL=' .env > .env.tmp || true
echo "KUSTTO_LECTURA_URL=${URL}" >> .env.tmp
mv .env.tmp .env
chmod 600 .env
echo "==> Listo: KUSTTO_LECTURA_URL quedó en .env. Ya puedes correr: pnpm db:traer-produccion"
