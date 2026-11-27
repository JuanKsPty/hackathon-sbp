# syntax=docker/dockerfile:1
# Imagen del API. El contexto es la raíz del repo (necesita data/):
#   docker build -f server/Dockerfile .
# Solo usa los scripts npm del server (build si existe, start), no sus archivos internos.

FROM node:24-alpine AS build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
# Si el backend agrega un paso de build (por ejemplo NestJS -> dist/), corre aquí.
RUN npm run build --if-present && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/app/data \
    STORAGE_DIR=/app/storage \
    PARAMETROS_FILE=/app/storage/parametros.json
WORKDIR /app/server

COPY --from=build /app/server ./
# Los CSV se copian byte a byte (CRLF, ver .gitattributes): COPY no convierte fines de línea.
COPY data/ /app/data/

# Persistencia (volumen sbp-storage): solo el usuario node escribe ahí.
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/salud > /dev/null || exit 1

# Si el backend pasa a NestJS: no hay que tocar este archivo mientras server/package.json tenga
# "build" (nest build -> dist/) y "start" apuntando a lo compilado (node dist/main.js), no a
# "nest start" ni a ts-node, que necesitan dependencias de desarrollo.
CMD ["npm", "start"]
