# Parámetros y catálogos (issue #30)

Opciones del **Administrador** para "administrar parámetros y catálogos" (sección 10, entregable 8).

| Endpoint | Perfil | Ejemplo |
| :--- | :--- | :--- |
| `GET /api/parametros` | todos | [parametros.json](parametros.json) |
| `PUT /api/parametros` | solo `admin` | mismo formato que el GET |
| `GET /api/admin/catalogos` | solo `admin` | [catalogos-admin.json](catalogos-admin.json) |

Los catálogos para llenar los filtros siguen en `GET /api/catalogos` ([consulta.md](consulta.md)).

## `GET /api/parametros`

La regla de **movimiento significativo** que usa `GET /api/movimientos` (sección 8; ver `regla_significativo` en [movimientos.json](movimientos.json)).

| Campo | Contenido |
| :--- | :--- |
| `regla_significativo` | regla vigente: `min_cambio_posicion_abs`, `cambio_lider`, `min_var_saldo_pct_abs` |
| `origen` | `por_defecto` (la de `server/config/parametros.json`) o `administrador` (la que guardó el Administrador) |
| `por_defecto` | la regla de `server/config/parametros.json`, para el botón "Restablecer" de la UI |

Criterios (basta con cumplir uno):

- `min_cambio_posicion_abs`: `|Cambio_Posicion| >= N`. Número `>= 0`, o `null` para desactivarlo.
- `cambio_lider`: `true` o `false`. Marca al líder anterior y al nuevo cuando cambia el primer puesto.
- `min_var_saldo_pct_abs`: `|Var_Saldo_Pct| >= N`. Número `>= 0`, o `null` para desactivarlo.

## `PUT /api/parametros`

Solo `X-Perfil: admin`. Cuerpo JSON con la regla completa:

```json
{ "regla_significativo": { "min_cambio_posicion_abs": 3, "cambio_lider": true, "min_var_saldo_pct_abs": 15 } }
```

- Responde como el `GET`, con la regla nueva.
- Se guarda en `storage/parametros.json`, en la raíz del repo (está en `.gitignore`), y aplica de inmediato a `/api/movimientos`, sin reiniciar.
- Campos de más se ignoran.
- Para restablecer, se envía la regla de `por_defecto`.
- Cada intento queda en la bitácora (`GET /api/bitacora`) como `cambio_parametros`: con `exito` y la regla anterior y la nueva en `detalle`, o con `error` y el motivo.

**Errores:**

| HTTP | `codigo` | Cuándo |
| :---: | :--- | :--- |
| 400 | `PARAMETRO_INVALIDO` | falta un campo, un umbral es negativo o no es número, o `cambio_lider` no es booleano |
| 400 | `JSON_INVALIDO` | el cuerpo no es JSON válido |
| 403 | `PERFIL_NO_AUTORIZADO` | el perfil no es `admin` |

## `GET /api/admin/catalogos`

Solo `X-Perfil: admin`. Estado de los 4 catálogos que lee el motor:

| Campo | Contenido |
| :--- | :--- |
| `catalogo` | `CINU/SB109`, `SB21`, `Bancos`, `Diccionario AT03` |
| `archivo` | nombre del CSV en `data/` |
| `fuente` | de dónde viene (paquete del reto) |
| `fecha_carga` | cuándo los leyó la API (al arrancar), en ISO 8601 |
| `registros` | filas del catálogo, contadas desde el archivo (no fijadas a mano) |
| `congelado` | `true` solo para el CINU: es la única versión válida y no se modifica (sección 2) |
| `nota` | texto para mostrar al Administrador |

Los catálogos son de solo lectura en la app: vienen del paquete del reto y la clasificación usa solo esos archivos (R3).
