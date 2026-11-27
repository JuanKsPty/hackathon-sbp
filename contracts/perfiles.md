# Perfiles y control de acceso (issue #28)

Tres perfiles, cada uno con opciones distintas (sección 10, entregable 8 de las indicaciones):

| Perfil | `X-Perfil` | Puede |
| :--- | :--- | :--- |
| Público | `publico` (o sin header) | consultar rankings, filtros, gráficos y tablas; descargar |
| Analista | `analista` | lo de Público, más comparar períodos y entidades y generar reportes personalizados |
| Administrador | `admin` | lo de Analista, más cargar o actualizar un período, parámetros, catálogos y el registro de operaciones |

La tabla completa de opciones está en un solo lugar: `OPCIONES` en `server/src/middleware/perfiles.js`.

## Cómo se elige el perfil

Basta con un selector de perfil (lo permite la sección 10). No hay contraseñas en el repo (R5).

- La UI manda el perfil elegido en el header **`X-Perfil`** en **todas** las peticiones a `/api`.
- Sin header, o con el header vacío, el perfil es `publico`.
- Se aceptan mayúsculas y espacios alrededor (`Admin` = `admin`).
- Un valor desconocido responde **400** `PARAMETRO_INVALIDO`.

## `GET /api/perfil` · [ejemplo](perfil.json)

Devuelve el perfil actual, sus opciones y la lista de perfiles. Con eso la UI arma el selector y el menú (#4).

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
