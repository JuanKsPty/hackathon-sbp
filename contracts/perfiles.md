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

## Probar con curl

```bash
curl http://localhost:3001/api/perfil                                  # publico
curl -H "X-Perfil: admin" http://localhost:3001/api/perfil             # admin y sus opciones
curl -X POST -H "X-Perfil: publico" http://localhost:3001/api/periodos # 403 (cuando exista la carga, #29)
```
