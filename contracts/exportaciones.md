# Descargas CSV (issue #20)

Entregables 2 a 5 de la sección 10. Los archivos son UTF-8, separados por coma, con punto decimal y fin de línea `\n`. Montos con 2 decimales, `Ponderacion_Pct` con 4 y códigos como texto (`101`). Solo llevan comillas los valores que las necesitan (`"Alimentos, bebidas y tabaco"`).

**Si no se indica `periodo`**, el archivo trae todos los períodos cargados: cada fila tiene su `Fecha` y el nombre termina en `_todos.csv`. **Con `?periodo=AAAAMMDD`** trae solo ese período (`rankings_20260930.csv`).

| Endpoint | Entregable | Columnas |
| :--- | :---: | :--- |
| `GET /api/exportar/rankings.csv` | 2 | `Fecha, Ranking, Posicion, Codigo_Banco, Banco, Saldo_Actividad, Total_Cartera_Local_Valida, Ponderacion_Pct, Operaciones_Validas` |
| `GET /api/exportar/subactividades.csv` | 3 | `Fecha, Ranking, Subactividad, Codigo_Banco, Saldo` |
| `GET /api/exportar/calidad.csv` | 4 | Ver la tabla de abajo |
| `GET /api/exportar/excluidas.csv` | exclusión auditable | `Fecha, Fila_Archivo, Numero_Prestamo, Codigo_Banco, Motivo, Detalle` |
| `GET /api/exportar/alertas.csv` | alertas de calidad | `Fecha, Fila_Archivo, Numero_Prestamo, Tipo, Detalle` |
| `GET /api/exportar/movimientos.csv` | 5 | Ver la tabla de abajo |

## Columnas de `calidad.csv`
| Columnas | Qué traen |
| :--- | :--- |
| `Fecha, Filas_Leidas, E1_Duplicados, E2_Destino_Extranjero, E3_Saldo_No_Positivo, E4_Actividad_No_Catalogada, Universo_Local_Valido, Saldo_Total_Valido` | El reporte oficial de calidad. |
| `Cascada_Cuadra` | `SI` o `NO`. |
| `Reclasificadas_Tarjeta_SB21` | Cuántas operaciones movió la regla SB21. |
| `Alertas_Banco_Fuera_Catalogo, Alertas_Facilidad_Fuera_Catalogo, Alertas_Incoherencia_Consumo, Alertas_Tipo_Dato` | Conteo de cada tipo de alerta. |
| `Reconciliacion_1, Reconciliacion_2, Reconciliacion_3, Unicidad_Prestamos` | `OK` o `DESCUADRE`. |

## Columnas de `movimientos.csv`
`Periodo_Anterior, Periodo_Actual, Ranking, Codigo_Banco, Banco, Posicion_anterior, Posicion_actual, Cambio_Posicion, Saldo_anterior, Saldo_actual, Var_Saldo, Var_Saldo_Pct, Significativo, Motivos`

- **Parámetros:** acepta los mismos que `/api/movimientos` (`desde`, `hasta`, `ranking`, `solo_significativos`).
- **`Var_Saldo_Pct`:** queda vacío si `Saldo_anterior = 0`.
- **`Significativo`:** vale `SI` o `NO`.
- **`Motivos`:** se separan con ` | `.
- **Mientras falte el cálculo de movimientos (#32):** el endpoint responde `501 NO_DISPONIBLE`. Para conectarlo hay que pasar la función `obtenerMovimientos(query)` a `crearApp({ almacen, obtenerMovimientos })`. Esa función devuelve el mismo objeto que `/api/movimientos`.

## Errores
Si un parámetro es inválido, la respuesta es JSON con el formato común (ver [`consulta.md`](consulta.md#errores)), no un CSV.
