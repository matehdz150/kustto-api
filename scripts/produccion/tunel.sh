#!/usr/bin/env bash
# El túnel a la base de producción, por el EC2. Lo usan `lector.sh` y
# `traer.sh` con `source`; no se corre solo.
#
# La base (RDS) no es pública: sólo se llega desde la VPC. El túnel abre
# `localhost:$KUSTTO_TUNEL_PUERTO` en esta máquina y lo manda, por SSH al EC2,
# a la base. Se cierra solo al terminar el script que lo abrió.

KUSTTO_EC2="${KUSTTO_EC2:-ec2-user@18.224.9.133}"
KUSTTO_RDS_HOST="${KUSTTO_RDS_HOST:-kustto-prod-db.cr0ameawq3pa.us-east-2.rds.amazonaws.com}"
KUSTTO_TUNEL_PUERTO="${KUSTTO_TUNEL_PUERTO:-15432}"
KUSTTO_PEM="${KUSTTO_PEM:-../kustto-infra/Mac-Book-mateo-kustto.pem}"

abrir_tunel() {
	if [ ! -r "$KUSTTO_PEM" ]; then
		echo "No encuentro la llave del EC2 en $KUSTTO_PEM (ponla en KUSTTO_PEM)." >&2
		exit 1
	fi
	ssh -i "$KUSTTO_PEM" -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
		-N -L "${KUSTTO_TUNEL_PUERTO}:${KUSTTO_RDS_HOST}:5432" "$KUSTTO_EC2" &
	TUNEL_PID=$!
	trap 'kill "$TUNEL_PID" 2>/dev/null' EXIT
	for _ in $(seq 1 30); do
		if nc -z localhost "$KUSTTO_TUNEL_PUERTO" 2>/dev/null; then
			echo "==> Túnel abierto en localhost:${KUSTTO_TUNEL_PUERTO}"
			return 0
		fi
		if ! kill -0 "$TUNEL_PID" 2>/dev/null; then
			echo "El túnel no abrió (¿la llave, la IP o el puerto ${KUSTTO_TUNEL_PUERTO} ocupado?)." >&2
			exit 1
		fi
		sleep 0.5
	done
	echo "El túnel no respondió a tiempo." >&2
	exit 1
}
