# Indicadores adicionales (issue #35)

> **Análisis adicional:** estos indicadores **no forman parte de los 6 rankings oficiales** ni de su cálculo, ni se comparan contra la clave del jurado. La respuesta lo indica en `analisis` y la UI debe rotularlos así.

Los calcula el motor (`server/src/engine/indicadores.js`) sobre el **universo local válido** del período, que son préstamos con `Saldo > 0` después de E1–E4. Usa el mismo criterio que los rankings:
- **Montos:** se suman en centavos enteros.
- **Porcentajes y HHI:** se calculan con BigInt y redondeo aritmético (half-up) a 4 decimales.

Los tramos se leen del diccionario AT03 (`Monto_Vencido_*` y `Monto_por_Vencer_*`), sin listas escritas a mano. `Intereses_por_Cobrar`, provisiones y `Valor_Inicial` no se usan.

## `GET /api/indicadores` · [ejemplo](indicadores.json)
| Parámetro (query, opcional) | Por defecto | Efecto |
| :--- | :--- | :--- |
| `periodo` | último cargado | período a analizar (`AAAAMMDD`) |
| `ranking` | todos | limita la morosidad y los vencimientos a esa macroactividad, y la concentración a ese ranking |

Lo pueden consultar los 3 perfiles. Los números del ejemplo son **ilustrativos**.

### `morosidad.total` y `morosidad.bancos[]`
Hay un elemento por cada uno de los 12 bancos; un banco sin cartera va en 0.

| Campo | Regla |
| :--- | :--- |
| `Operaciones`, `Saldo` | préstamos del grupo y suma de su `Saldo` |
| `Monto_Vencido` | suma de los tramos `Monto_Vencido_*` |
| `Pct_Vencido` | `Monto_Vencido / Saldo × 100` (4 decimales) |
| `Operaciones_En_Mora`, `Saldo_En_Mora` | préstamos con `Dias_Mora > 0` y su saldo |
| `Pct_Saldo_En_Mora` | `Saldo_En_Mora / Saldo × 100` (4 decimales) |
| `Dias_Mora_Promedio` | promedio de `Dias_Mora` entre los préstamos en mora, ponderado por saldo (2 decimales) |
| `Tramos_Vencido` | monto de cada tramo, con el nombre del campo AT03 |

### `vencimientos.total` y `vencimientos.bancos[]`
| Campo | Regla |
| :--- | :--- |
| `Monto_Por_Vencer` | suma de los tramos `Monto_por_Vencer_*` |
| `Monto_Vencido` | suma de los tramos vencidos |
| `Tramos_Por_Vencer` | monto de cada tramo, con el nombre del campo AT03 |

Control (sección 13 de las indicaciones): para cada préstamo con `Saldo > 0`, la suma de los tramos por vencer y vencidos es igual a su `Saldo`. Por eso `Monto_Por_Vencer + Monto_Vencido = Saldo`.

### `concentracion[]`
Hay un elemento por ranking, en el orden del catálogo.

| Campo | Regla |
| :--- | :--- |
| `Total_Ranking` | suma de `Saldo_Actividad` de los 12 bancos |
| `Participacion_Top3_Pct` | saldo de las posiciones 1 a 3 entre `Total_Ranking` × 100 |
| `HHI` | índice Herfindahl-Hirschman: `Σ (participación en %)²` = `10000 × Σ saldo² / total²`. Va de 0 a 10000, y 10000 significa un solo banco |
| `Top3[]` | `Posicion`, `Codigo_Banco`, `Banco`, `Saldo_Actividad` y `Participacion_Pct` |

## Errores
Usan el formato común de [`consulta.md`](consulta.md#errores): `PARAMETRO_INVALIDO` (400) y `PERIODO_SIN_DATOS` (404).
