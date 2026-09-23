# La imagen de la API y de los workers de TypeScript.
#
# UNA SOLA IMAGEN PARA LOS DOS, con el comando decidiendo qué proceso arranca:
# comparten el esquema, los servicios y la configuración, y dos imágenes
# obligarían a construir dos veces lo mismo y a que se desincronicen.
#
# El worker de BORDADO no está aquí: necesita Ink/Stitch, Python, GTK y xvfb, y
# eso son cientos de megas por algo que hoy está apagado. Vive en su propia
# imagen (ver servicios/bordado).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS dependencias
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS construccion
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS produccion
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml* ./
# Sin las de desarrollo: la imagen no compila nada, sólo corre lo compilado.
RUN pnpm install --frozen-lockfile --prod
COPY --from=construccion /app/dist ./dist
# Las migraciones son datos, no código: van sueltas para poder aplicarlas sin
# reconstruir la imagen.
COPY migraciones ./migraciones

# Node como usuario, no root. La imagen ya trae el usuario `node`.
USER node
EXPOSE 8000
CMD ["node", "dist/main.js"]
