# syntax=docker/dockerfile:1
# Imagen del client: build de Vite servido por nginx. El contexto es la raíz del repo:
#   docker build -f client/Dockerfile .
# nginx también pasa /api/ al servicio sbp-server (client/nginx.conf).

FROM node:24-alpine AS build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Sin .env ni /contracts en la imagen: el build no lleva mocks (R2).
RUN npm run build

FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
