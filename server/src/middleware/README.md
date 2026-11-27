# Perfiles y control de acceso

**Responsable:** Jesús (issue #28)

Tres perfiles (`publico`, `analista`, `admin`), cada uno con opciones distintas (entregable 8, lámina 6):

- **Público:** consulta rankings, filtra, ve gráficos y tablas, descarga.
- **Analista:** además compara entidades y períodos y genera reportes personalizados.
- **Administrador:** además carga o actualiza un período, administra parámetros y catálogos y consulta el registro de operaciones.

## `perfiles.js`

- `leerPerfil`: middleware global (montado en `app.js` antes de todas las rutas). Lee el header `X-Perfil` y deja `req.perfil`. Sin header es `publico`; un valor desconocido responde 400 `PARAMETRO_INVALIDO`.
- `OPCIONES`: la única tabla de qué puede hacer cada perfil. `GET /api/perfil` la entrega a la UI.
- `requierePerfil('admin')` y `requiereOpcion('cargar_periodo')`: se ponen en una ruta; a los demás perfiles les responden 403 `PERFIL_NO_AUTORIZADO`.

Contrato y ejemplos: [`contracts/perfiles.md`](../../../contracts/perfiles.md).

Basta con el selector de perfil: no hay contraseñas. Si algún día se agregan usuarios con contraseña, se crean desde variables de entorno: nunca contraseñas en el repo (R5).

## `limitePedidos.js` (#84)

Límite de pedidos para los endpoints que gastan la llave de IA: `POST /api/ia/preguntar` y `GET /api/explicaciones`. Así nadie puede consumir la `ANTHROPIC_API_KEY` en un ciclo.

- **Por IP:** 10 pedidos por minuto.
- **Global:** 300 pedidos por hora, entre todos.
- Al pasarse responde **429** `DEMASIADOS_PEDIDOS`, con el header `Retry-After` en segundos.
- Va después del control de perfil, así que un 403 no gasta cupo.
- Los contadores viven en memoria y se reinician con el servidor.
- `app.js` fija `trust proxy` solo para redes locales y privadas. Así `req.ip` es la IP real del usuario que llega en `X-Forwarded-For` desde nginx y el proxy de Dokploy, y un cliente no puede falsificarla.
- En las pruebas, `crearApp({ ..., limiteIA })` cambia los valores.
