# Endpoints de consulta (issue #18)

Consultas públicas para los 3 perfiles. Siguen las convenciones de [`README.md`](README.md):
- **Códigos:** van como texto.
- **Fechas:** formato `AAAAMMDD`.
- **Montos:** número con 2 decimales.
- **`Ponderacion_Pct`:** número con 4 decimales.
- **Nombres de campo:** los de las indicaciones.

Los números de los ejemplos son **ilustrativos**: los valores reales los calcula `server/src/engine` (R2). Una prueba (`server/tests/api.test.js`) verifica que cada ejemplo tenga la misma forma que la respuesta real.

Todas las respuestas traen `fuente` y `aviso` ("Datos ficticios · Uso informativo, no opinión formal de la SBP"), para mostrarlos en pantalla. Las que son de un período traen también `periodo` y `archivo`, el CSV de origen.

**Si no se indica `periodo`**, se usa el último período cargado. La excepción es `/api/calidad`, que devuelve todos.

**`periodo=todos` ("Todos los períodos")** devuelve el **acumulado** de los cortes cargados en `/api/rankings`, `/api/subactividades`, `/api/calidad`, `/api/excluidas`, `/api/indicadores` y el dashboard HTML. El motor junta las operaciones válidas de todos los cortes y recalcula saldos, posiciones, ponderación y desglose con las mismas reglas (`server/src/engine/acumulado.js`). La respuesta trae `periodo: "todos"`. La unicidad se controla dentro de cada corte, porque un préstamo sigue vivo de un corte al siguiente. No vale en `/api/movimientos` ni en `/api/descomposicion` (comparan dos cortes); en las descargas CSV equivale a no indicar `periodo` (cada corte por separado, con su Fecha).

| Endpoint | Parámetros (query, opcionales) | Ejemplo |
| :--- | :--- | :--- |
| `GET /api/periodos` | — | [periodos.json](periodos.json) |
| `GET /api/catalogos` | — | [catalogos.json](catalogos.json) |
| `GET /api/rankings` | `periodo`, `ranking`, `banco` | [rankings.json](rankings.json) |
| `GET /api/subactividades` | `periodo`, `ranking`, `banco`, `subactividad` | [subactividades.json](subactividades.json) |
| `GET /api/calidad` | `periodo` | [calidad.json](calidad.json) |
| `GET /api/excluidas` | `periodo`, `motivo` (`E1`–`E4`), `banco` | [excluidas.json](excluidas.json) |
| `GET /api/salud` | — | `{ "ok": true, "periodos": ["20260731", ...] }` |

## `GET /api/periodos`
Devuelve los períodos cargados, del más antiguo al más reciente, y en `ultimo` el más reciente. Cada período trae:
- `Fecha` y `Archivo`;
- `Filas_Leidas`, `Universo_Local_Valido` y `Saldo_Total_Valido`;
- `Reconciliaciones_OK`: es `true` si R1, R2, R3 y la unicidad cuadran.

`acumulado` trae los mismos campos para "Todos los períodos" (`Fecha: "todos"`), o `null` si no hay períodos cargados.

## `GET /api/catalogos`
Datos para llenar los filtros:
- `bancos`: código y nombre de cada banco;
- `rankings`: los 6, en el orden del catálogo, cada uno con sus subactividades.

## `GET /api/rankings`
`rankings[]` trae `Ranking` y `bancos[]`, con los 12 bancos ordenados por `Posicion`.

Cada banco trae:
- `Posicion`, `Codigo_Banco` y `Banco`;
- `Saldo_Actividad` y `Total_Cartera_Local_Valida`;
- `Ponderacion_Pct` y `Operaciones_Validas`.

Si se filtra por `banco`, cada ranking trae solo ese banco, con su posición real.

## `GET /api/subactividades`
`subactividades[]` trae `Ranking`, `Subactividad`, `Codigo_Banco`, `Banco` y `Saldo`. Incluye la reclasificación SB21: Crédito personal con facilidad `07` cuenta en Tarjeta.

## `GET /api/calidad`
`periodos[]` trae el reporte de calidad de cada período:
- **Cascada oficial:** `Filas_Leidas`, `E1_Duplicados`, `E2_Destino_Extranjero`, `E3_Saldo_No_Positivo`, `E4_Actividad_No_Catalogada` y `Universo_Local_Valido`.
- **`Saldo_Total_Valido` y `Cascada_Cuadra`:** este último indica si `leídas = E1+E2+E3+E4+universo`.
- **`Reclasificadas_Tarjeta`:** operaciones movidas por la regla SB21.
- **`Alertas`:** conteo por tipo (banco o facilidad fuera de catálogo, incoherencia de CONSUMO, tipo de dato). `alertas[]` trae hasta 500, con fila y detalle, y `Alertas_Total` el total.
- **`Conteos_Independientes`:** filas que incumplen cada regla por sí sola. **No es el conteo oficial**: si se muestra, va rotulado aparte.
- **`Reconciliaciones`:** `R1`, `R2`, `R3` y `Unicidad`, cada una con `ok` y el detalle de las diferencias si las hay.

## `GET /api/excluidas`
Exclusión auditable: `excluidas[]` trae `Fila_Archivo`, `Numero_Prestamo`, `Codigo_Banco`, `Motivo` (`E1`–`E4`) y `Detalle`. `total` es la cantidad después de aplicar los filtros.

## `GET /api/movimientos/descomposicion`
Explica de dónde sale el `Var_Saldo` de `/api/movimientos`, siguiendo `Numero_Prestamo` entre los dos períodos. No cambia el contrato de `/api/movimientos` (#1).

- **Parámetros:** `desde` y `hasta` funcionan igual que en `/api/movimientos`. `ranking` y `banco` filtran. `evidencia=true` exige `ranking` y `banco`.
- **`Continuidad`:** `Continuan`, `Entran` y `Salen`, la cantidad de préstamos de todo el universo válido.
- **`descomposicion[]`:** una fila por ranking y banco, con `Ranking`, `Codigo_Banco`, `Banco`, `Saldo_anterior`, `Saldo_actual` y `Var_Saldo`. Trae además tres piezas, cada una con `Saldo` y `Operaciones`, que suman `Var_Saldo` exacto al centavo:
  - `Nuevos`: préstamos que entran.
  - `Salen`: préstamos que ya no están; el saldo va negativo.
  - `Amortizacion`: diferencia de saldo de los préstamos que continúan.
- **`evidencia`** (solo con `evidencia=true`): la tabla de respaldo del botón "ver evidencia". Las listas van de mayor a menor monto:
  - `Nuevos[]` y `Salen[]` traen `Numero_Prestamo` y `Saldo`.
  - `Continuan[]` trae `Numero_Prestamo`, `Saldo_anterior`, `Saldo_actual` y `Diferencia`.

## Errores
Usan el formato común `{ "error": { "codigo", "mensaje", "detalles"? } }`. `detalles` solo aparece cuando hay información adicional.

| HTTP | `codigo` | Cuándo |
| :---: | :--- | :--- |
| 400 | `PARAMETRO_INVALIDO` | `periodo` mal formado, o `ranking`, `banco`, `subactividad` o `motivo` inexistentes |
| 404 | `PERIODO_SIN_DATOS` | el período no está cargado, o no hay ninguno |
| 404 | `RUTA_NO_ENCONTRADA` | la ruta no existe |
| 422 | `ARCHIVO_INVALIDO` | archivo AT03 o catálogo inválido (carga de períodos, #29) |
| 500 | `ERROR_INTERNO` | error inesperado |
