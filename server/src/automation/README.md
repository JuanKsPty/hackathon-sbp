# Automatizaciones

**Responsables:** Juan y Agustín

Automatizaciones de la lámina 8 y la sección 8 de las indicaciones:

- Cargar un período nuevo y recalcular sin editar código.
- Comparar dos períodos: `Cambio_Posicion`, `Var_Saldo`, `Var_Saldo_Pct`.
- Señalar movimientos significativos con una regla configurable (no fija en el código).
- Preparar automáticamente un reporte descargable, incluido el de movimientos.

## Comparación entre períodos (#32)

`GET /api/movimientos` ([contrato](../../../contracts/movimientos.json)) compara cada ranking entre dos períodos cargados. Por defecto compara el último con el anterior (consecutivos); con `desde` y `hasta` se compara cualquier par, por ejemplo julio → septiembre.

- [`movimientos.js`](movimientos.js): cálculo sobre los rankings del motor, en centavos. `Cambio_Posicion = Posicion_anterior − Posicion_actual` (positivo = sube), `Var_Saldo` y `Var_Saldo_Pct` (4 decimales, redondeo aritmético, `null` si el saldo anterior es 0).
- [`parametros.js`](parametros.js): la **regla de movimiento significativo** se lee de [`server/config/parametros.json`](../../config/parametros.json), o del archivo que indique `PARAMETROS_FILE`, en cada consulta. No está fija en el código. Un movimiento es significativo si cumple al menos un criterio:
  - `min_cambio_posicion_abs`: `|Cambio_Posicion| >= N`;
  - `cambio_lider`: el líder anterior y el nuevo, cuando cambia el primer puesto;
  - `min_var_saldo_pct_abs`: `|Var_Saldo_Pct| >= N`.

  Un umbral en `null` desactiva ese criterio. El Administrador lo editará desde la app (#30).
- La misma función alimenta la exportación del entregable 5 (`/api/exportar/movimientos.csv`).
