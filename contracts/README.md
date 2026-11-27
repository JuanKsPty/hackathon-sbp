# Contratos de la API

Formatos JSON que devuelve el backend, con un ejemplo por endpoint. El frontend, la IA y las automatizaciones trabajan contra estos ejemplos mientras el motor no esté listo. **Si cambias un contrato, avisa en su issue**: varias partes dependen de él.

> Los números de los ejemplos son **ilustrativos** y no son resultados del motor (regla R2). Los valores reales siempre los calcula `server/src/engine`.

## Convenciones

- Los códigos son texto y conservan los ceros a la izquierda: `"Codigo_Banco": "101"`, fechas `"20260930"` (AAAAMMDD).
- Los montos se suman en centavos enteros en el motor y se serializan como número con 2 decimales.
- Los nombres de campo siguen los de las indicaciones (`Cambio_Posicion`, `Var_Saldo_Pct`, ...).
- Errores: `{ "error": { "codigo": "PERIODO_SIN_DATOS", "mensaje": "No hay datos cargados para 20261031" } }`.

## `GET /api/movimientos` · [ejemplo](movimientos.json)

Comparación de cada ranking entre dos períodos (sección 8 de las indicaciones). Issue #1.

**Parámetros (query, todos opcionales):**

| Parámetro | Ejemplo | Por defecto |
| :--- | :--- | :--- |
| `desde` | `20260831` | período anterior a `hasta` |
| `hasta` | `20260930` | último período cargado |
| `ranking` | `HIPOTECARIO` | los 6 rankings |
| `solo_significativos` | `true` | `false` |

**Campos de cada movimiento:**

| Campo | Regla |
| :--- | :--- |
| `Cambio_Posicion` | `Posicion_anterior − Posicion_actual`. Positivo = sube, negativo = baja, `0` = se mantiene |
| `Var_Saldo` | `Saldo_actual − Saldo_anterior` (2 decimales) |
| `Var_Saldo_Pct` | `Var_Saldo / Saldo_anterior × 100`, redondeado a 4 decimales. **`null` si `Saldo_anterior = 0`** |
| `Significativo` | `true` si se cumple al menos un criterio de `regla_significativo` |
| `Motivos` | criterios cumplidos: `cambio_posicion`, `cambio_lider`, `var_saldo_pct` |

Cada ranking trae siempre los **12 bancos** (el ejemplo muestra 3 para abreviar), salvo con `solo_significativos=true`.

**Regla de movimiento significativo** (`regla_significativo`): la define el Administrador en los parámetros (no está fija en el código) y la respuesta devuelve la que se usó:

- `min_cambio_posicion_abs`: `|Cambio_Posicion| >= N`
- `cambio_lider`: marca al líder anterior y al nuevo cuando cambia el primer puesto
- `min_var_saldo_pct_abs`: `|Var_Saldo_Pct| >= N`

**Errores:**

| HTTP | `codigo` | Cuándo |
| :---: | :--- | :--- |
| 400 | `PARAMETRO_INVALIDO` | fecha mal formada o ranking inexistente |
| 404 | `PERIODO_SIN_DATOS` | `desde` o `hasta` no está cargado |
| 422 | `PERIODOS_INVALIDOS` | `desde >= hasta` |
