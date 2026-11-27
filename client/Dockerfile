# syntax=docker/dockerfile:1
# Imagen de un sitio del client: build de Vite servido por nginx. El contexto es la raíz del repo:
#   docker build -f client/Dockerfile --build-arg SITIO=publico .
#   docker build -f client/Dockerfile --build-arg SITIO=interno .
# SITIO elige la tabla de rutas del bundle (vite.config.js) y la config de nginx
# (client/nginx.publico.conf o client/nginx.interno.conf), que pasa /api/ al servicio sbp-server.

FROM node:24-alpine AS build
ARG SITIO=publico
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Sin .env ni /contracts en la imagen: el build no lleva mocks (R2).
RUN SITIO=${SITIO} npx vite build

FROM nginx:alpine
ARG SITIO=publico
COPY client/nginx.${SITIO}.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist-${SITIO} /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
