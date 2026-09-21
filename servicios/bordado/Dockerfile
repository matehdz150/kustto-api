# La imagen del worker de bordado: Node y el motor de Ink/Stitch juntos.
#
# POR QUÉ ES OTRA IMAGEN. Ink/Stitch, Python, GTK y xvfb son cientos de megas
# por algo que hoy está APAGADO —faltan las pruebas de costura— y que sólo
# corre cuando alguien prepara un bordado. Meterlo en la imagen de la API la
# haría enorme para todos los despliegues.
#
# POR QUÉ NODE Y PYTHON EN LA MISMA. El proceso que consume la cola es de
# TypeScript: habla con Redis, con Postgres y con S3, y llama al motor como a
# un programa cualquiera. Separarlos en dos contenedores obligaría a inventar
# un protocolo entre ellos —justo lo que se quitó al sacarle AWS al Python—.

FROM ubuntu:24.04 AS inkstitch
ARG INKSTITCH_VERSION=3.3.0
ARG INKSTITCH_SHA256=8e6918e62dee98b8cdbb46a3aad12521b094d2608049abd7eda5771092e9835e
ARG INKSTITCH_ARCH=linux-x86_64
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils \
 && curl -fsSL "https://github.com/inkstitch/inkstitch/releases/download/v${INKSTITCH_VERSION}/inkstitch-${INKSTITCH_VERSION}-${INKSTITCH_ARCH}.tar.xz" -o /tmp/inkstitch.tar.xz \
 && mkdir -p /opt/inkstitch \
 && tar -xJf /tmp/inkstitch.tar.xz -C /opt/inkstitch --strip-components=1

FROM node:22-slim AS construccion
ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim AS produccion
ENV NODE_ENV=production
WORKDIR /app

# Python y lo que Ink/Stitch necesita para arrancar sin pantalla.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      python3 python3-pip libgl1 libgtk-3-0 libwayland-server0 xvfb \
 && rm -rf /var/lib/apt/lists/*

COPY --from=inkstitch /opt/inkstitch /opt/inkstitch
COPY servicios/bordado/requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r /tmp/requirements.txt

ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=construccion /app/dist ./dist
COPY migraciones ./migraciones
COPY servicios/bordado/motor.py servicios/bordado/quality.py ./servicios/bordado/

# Ink/Stitch quiere un display aunque no dibuje nada en pantalla. El motor
# levanta el Xvfb solo la primera vez que lo necesita.
ENV INKSTITCH_PATH=/opt/inkstitch/bin/inkstitch \
    INKSTITCH_OFFLINE_SCRIPT=1 \
    DISPLAY=:99 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/tmp/worker \
    XDG_CACHE_HOME=/tmp/worker/cache \
    XDG_CONFIG_HOME=/tmp/worker/config

RUN mkdir -p /tmp/worker && chown -R node:node /tmp/worker
USER node

CMD ["node", "dist/workers/main.js"]
