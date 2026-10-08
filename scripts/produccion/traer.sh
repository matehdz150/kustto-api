#!/usr/bin/env bash
# Trae el catálogo de PRODUCCIÓN a tu base local.
#
#   pnpm db:traer-produccion          # pregunta antes de vaciar la base local
#   pnpm db:traer-produccion --si     # sin preguntar
#
# 1. Abre un túnel a la base de producción y exporta el catálogo con el
#    usuario de sólo lectura (KUSTTO_LECTURA_URL, ver `lector.sh`) a
#    `semilla/catalogo.json`: sin datos de personas, y sólo con imágenes que
#    existen en el bucket.
# 2. Cierra el túnel, VACÍA tu base local y la siembra con ese catálogo, más
#    cuentas y pedidos inventados (ver `scripts/sembrar.ts`).
#
# En otro equipo no hace falta nada de esto: `git pull` y
# `pnpm db:sembrar --desde-cero` con el `semilla/catalogo.json` del repo.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/produccion/tunel.sh

LECTURA=$(grep '^KUSTTO_LECTURA_URL=' .env 2>/dev/null | cut -d= -f2- || true)
LECTURA="${KUSTTO_LECTURA_URL:-$LECTURA}"
if [ -z "$LECTURA" ]; then
	echo "Falta KUSTTO_LECTURA_URL en .env. Córrelo una vez: pnpm db:crear-lector" >&2
	exit 1
fi

LOCAL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
case "$LOCAL" in
	*localhost*|*127.0.0.1*) ;;
	*) echo "La DATABASE_URL de .env no es local ($LOCAL). No siembro ahí." >&2; exit 1 ;;
esac

if [ "${1:-}" != "--si" ]; then
	read -r -p "Esto VACÍA tu base local y la llena con el catálogo de producción. ¿Sigo? [s/N] " ok
	[ "$ok" = "s" ] || [ "$ok" = "S" ] || { echo "Nada cambió."; exit 0; }
fi

abrir_tunel
echo "==> Exportando el catálogo de producción"
DATABASE_URL="$LECTURA" KUSTTO_API="${KUSTTO_API_PRODUCCION:-https://api.kustto.com.mx}" \
	node --env-file=.env --import tsx scripts/exportar-semilla.ts
kill "$TUNEL_PID" 2>/dev/null || true

echo "==> Migrando y sembrando la base local"
node --env-file=.env --import tsx src/db/migrar.ts
node --env-file=.env --import tsx scripts/sembrar.ts --desde-cero
echo "==> Listo. Si el catálogo cambió, sube semilla/catalogo.json para los demás equipos."
