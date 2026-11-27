# Perfiles y control de acceso (issue #28)

Tres perfiles, cada uno con opciones distintas (sección 10, entregable 8 de las indicaciones):

| Perfil | `X-Perfil` | Puede |
| :--- | :--- | :--- |
| Público | `publico` (o sin header) | consultar rankings, filtros, gráficos y tablas; descargar los entregables 2 a 4 |
| Analista | `analista` | lo de Público, más comparar períodos (movimientos y su descarga, entregable 5) y entidades y generar reportes personalizados |
| Administrador | `admin` | lo de Analista, más cargar o actualizar un período, parámetros, catálogos y el registro de operaciones |

La tabla completa de opciones está en un solo lugar: `OPCIONES` en `server/src/middleware/perfiles.js`.

## Cómo se elige el perfil

Hay dos sitios y el nginx de cada uno manda el header **`X-Sitio`** en cada petición a `/api`:

- **`X-Sitio: publico`** (https://sbp.juank.tech): siempre `publico`. Se ignoran cookies, `X-Perfil` y tokens.
- **`X-Sitio: interno`** (https://interno.sbp.juank.tech): el perfil sale de la sesión (cookie `sbp_sesion`, HttpOnly, firmada) o, para clientes MCP, de `Authorization: Bearer <MCP_TOKEN>` (perfil `analista`). Sin sesión, todo responde **401** `SESION_REQUERIDA` salvo `/salud`, `/perfil`, `/sesion` e `/ia/estado`. Los POST/PUT/DELETE con sesión llevan el header `X-Sbp: 1` (si falta: **403** `CSRF`).
- **Sin `X-Sitio`** (llamada directa al API, que nunca se publica): desde la misma máquina vale el header `X-Perfil` (pruebas, agente de IA, MCP por stdio); sin header es `publico`, y un valor desconocido responde **400** `PARAMETRO_INVALIDO`. Desde otra IP es siempre `publico`.

### Inicio de sesión

| Método | Ruta | Cuerpo | Respuesta |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sesion` | `{ "usuario", "clave" }` | 200 `{ usuario, nombre, perfil, nombre_perfil }` y la cookie. 400 `PARAMETRO_INVALIDO`, 401 `CREDENCIALES_INVALIDAS`, 429 `DEMASIADOS_PEDIDOS` (10 por minuto), 503 `USUARIOS_NO_DISPONIBLES` |
| `DELETE` | `/api/sesion` | – | 204 y borra la cookie |

En el sitio público estas rutas no existen (404). Los usuarios están en Supabase (`interno.usuarios`) o, de respaldo, en la variable `USUARIOS` del `.env`. No hay contraseñas en el repo (R5).

## `GET /api/perfil` · [ejemplo](perfil.json)

Devuelve el perfil actual, sus opciones, la lista de perfiles, el usuario de la sesión (`usuario`: `{ usuario, nombre }` o `null`) y el sitio (`sitio`: `publico`, `interno` o `directo`). Con eso la UI arma el menú (#4).

| Campo | Contenido |
| :--- | :--- |
| `perfil` | `publico`, `analista` o `admin` |
| `nombre` | nombre para mostrar (`Público`, `Analista`, `Administrador`) |
| `opciones[]` | `{ opcion, nombre }` de cada opción del perfil, en orden |
| `perfiles[]` | `{ perfil, nombre }` de los 3 perfiles, para el selector |

El ejemplo es la respuesta real para `X-Perfil: admin`; una prueba (`server/tests/perfiles.test.js`) lo compara.

## Endpoints protegidos

Los endpoints de Analista y Administrador responden **403** a los demás perfiles, aunque se llamen directo a la API (el jurado lo prueba en vivo):

```json
{ "error": { "codigo": "PERFIL_NO_AUTORIZADO", "mensaje": "Esta opción es solo para el perfil Administrador. Tu perfil es Público." } }
```

| Endpoint | Opción | Perfiles |
| :--- | :--- | :--- |
| `GET /api/movimientos` | `comparar_periodos` | Analista, Administrador |
| `GET /api/exportar/movimientos.csv` (entregable 5) | `comparar_periodos` | Analista, Administrador |
| `GET /api/exportar/personalizado.csv` | `reportes_personalizados` | Analista, Administrador |
| `POST /api/periodos` (#29) | `cargar_periodo` | Administrador |
| `PUT /api/parametros` | `administrar_parametros` | Administrador |
| `GET /api/admin/catalogos` | `administrar_catalogos` | Administrador |
| `GET /api/bitacora` | `ver_bitacora` | Administrador |
| `GET/PUT/DELETE /api/admin/permisos` | `configurar_permisos` | Administrador |
| `GET/POST /api/admin/usuarios`, `PATCH /api/admin/usuarios/:usuario` | `gestionar_usuarios` | Administrador |
| `GET /api/exportar/{rankings,subactividades,calidad,excluidas,alertas}.csv` | `descargar` | los 3 (configurable) |

La columna **Perfiles** es la de por defecto: el Administrador puede cambiar las opciones configurables (ver abajo).

Las demás consultas (`/api/rankings`, `/api/subactividades`, `/api/calidad`, `/api/excluidas`, `/api/periodos`, `/api/catalogos`, `/api/parametros` y las descargas de los entregables 2 a 4) están abiertas para los 3 perfiles.

Para proteger una ruta en el backend:

```js
import { requierePerfil, requiereOpcion } from '../middleware/perfiles.js';

rutas.post('/periodos', requierePerfil('admin'), cargarPeriodo);          // por perfil
rutas.get('/movimientos', requiereOpcion('comparar_periodos'), consultar); // por opción de la tabla
```

**Errores:**

| HTTP | `codigo` | Cuándo |
| :---: | :--- | :--- |
| 400 | `PARAMETRO_INVALIDO` | `X-Perfil` no es `publico`, `analista` ni `admin` |
| 403 | `PERFIL_NO_AUTORIZADO` | el perfil no tiene la opción que pide el endpoint |

## Perfiles y permisos · [ejemplo](permisos.json)

El Administrador decide qué perfil puede usar cada opción configurable (lámina 6: *configurar perfiles y permisos*). El cambio aplica de inmediato: `GET /api/perfil` (el menú) y `requiereOpcion()` (los 403) leen la tabla vigente en cada petición.

| Método | Ruta | Cuerpo | Respuesta |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/permisos` | – | `{ origen, perfiles[], opciones[] }` |
| `PUT` | `/api/admin/permisos` | `{ "opciones": { "comparar_periodos": ["publico", "analista"] } }` | la tabla nueva. 400 `PARAMETRO_INVALIDO` si la opción no es configurable, el perfil no es `publico` ni `analista` o el Público tendría algo que el Analista no tiene |
| `DELETE` | `/api/admin/permisos` | – | vuelve a los permisos por defecto |

- Cada fila de `opciones[]` trae `perfiles` (vigentes), `por_defecto`, `configurable` y `motivo` (por qué una opción no se puede cambiar).
- **Configurables:** `descargar`, `comparar_periodos` (y con ella `comparar_entidades`) y `reportes_personalizados`. Las de administración siempre son solo del Administrador, y el Administrador siempre tiene todas.
- Se guarda en `storage/permisos.json` (no se sube al repo). Sin ese archivo, o si está dañado, valen los de `OPCIONES`.
- Cada cambio queda en la bitácora (`cambio_permisos`, `restablecer_permisos`) con lo que cambió.

## Usuarios · [ejemplo](usuarios.json)

El Administrador crea los usuarios del sitio interno y cambia su nombre, perfil, estado o contraseña.

| Método | Ruta | Cuerpo | Respuesta |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/usuarios` | – | `{ fuente, usuarios[] }`, nunca con contraseñas ni hashes |
| `POST` | `/api/admin/usuarios` | `{ usuario, nombre?, perfil, clave }` | 201 el usuario. 400 `PARAMETRO_INVALIDO`, 409 `USUARIO_EXISTE` |
| `PATCH` | `/api/admin/usuarios/:usuario` | `{ nombre?, perfil?, activo?, clave? }` | el usuario. 404 `USUARIO_NO_ENCONTRADO`, 409 `USUARIO_SOLO_LECTURA` u `OPERACION_NO_PERMITIDA` |

- `fuente`: `supabase` si hay `DATABASE_URL` (tabla `interno.usuarios`; el rol `sbp_api` necesita [`server/db/002_gestion_usuarios.sql`](../server/db/002_gestion_usuarios.sql), si no: 503 `USUARIOS_SOLO_LECTURA`), o `archivo` (`storage/usuarios.json`, para la demo local sin internet). Solo se guarda el hash scrypt de cada contraseña.
- Los usuarios de la variable `USUARIOS` del `.env` salen con `origen: "env"` y `editable: false`: se cambian en el `.env`.
- `perfil` es `analista` o `admin`; `clave`, de 10 caracteres o más; `usuario`, de 2 a 60 caracteres (letras, números, `.`, `-`, `_`).
- No se borran usuarios: se desactivan (`activo: false`) y ya no pueden iniciar sesión.
- Nadie puede quitarse a sí mismo el perfil de Administrador ni desactivarse, y siempre queda al menos un Administrador activo (409 `OPERACION_NO_PERMITIDA`).
- Si cambia el perfil, el estado o la contraseña de alguien, **sus sesiones abiertas se cortan** (`storage/sesiones-cortadas.json`): su próxima petición responde 401 y tiene que volver a entrar. Si el Administrador cambia su propia contraseña, recibe una cookie nueva y sigue.
- Altas y cambios quedan en la bitácora (`alta_usuario`, `cambio_usuario`), nunca con la contraseña.

## Probar con curl

```bash
curl http://localhost:3001/api/perfil                                  # publico
curl -H "X-Perfil: admin" http://localhost:3001/api/perfil             # admin y sus opciones
curl -X POST -H "X-Perfil: publico" http://localhost:3001/api/periodos # 403 (cuando exista la carga, #29)
```
