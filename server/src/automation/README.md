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
- [`reglaMovimientos.js`](reglaMovimientos.js): la **regla de movimiento significativo** se lee en cada consulta. No está fija en el código. Si el Administrador la cambió (`PUT /api/parametros`, #30), se lee de `storage/parametros.json` (o del archivo que indique `PARAMETROS_FILE`); si no, de [`server/config/parametros.json`](../../config/parametros.json). Un movimiento es significativo si cumple al menos un criterio:
  - `min_cambio_posicion_abs`: `|Cambio_Posicion| >= N`;
  - `cambio_lider`: el líder anterior y el nuevo, cuando cambia el primer puesto;
  - `min_var_saldo_pct_abs`: `|Var_Saldo_Pct| >= N`.

  Un umbral en `null` desactiva ese criterio. Un umbral en `0` marca todo lo que cambió, pero un cambio nulo (0 posiciones o 0 %) nunca es significativo. El Administrador la edita desde la app: [`contracts/administracion.md`](../../../contracts/administracion.md).
- La misma función alimenta la exportación del entregable 5 (`/api/exportar/movimientos.csv`).

## Descomposición del movimiento (#58)

`GET /api/movimientos/descomposicion` ([contrato](../../../contracts/consulta.md)) explica *por qué* se movió el saldo de cada banco en cada ranking. [`descomposicion.js`](descomposicion.js) sigue cada `Numero_Prestamo` entre dos períodos y parte `Var_Saldo` en tres piezas que **suman exacto, al centavo**:

- **`nuevos`:** préstamos del período actual que no estaban (en ese ranking y banco) en el anterior.
- **`salen`:** préstamos del anterior que ya no están; su saldo se resta.
- **`amortizacion`:** diferencia de saldo de los préstamos que continúan.

Usa el universo válido que ya calculó el motor (`periodo.operaciones`): no vuelve a leer los AT03. Con `evidencia=true` (y `ranking` y `banco`) devuelve el detalle préstamo por préstamo. Es un endpoint aparte: no cambia el contrato de `/api/movimientos`, y también es de Analista y Administrador.

## Aviso al publicar un período (#7)

[`publicacion.js`](publicacion.js) llama a `alPublicarPeriodo(resultado)` cada vez que el Administrador publica un período (`POST /api/periodos`), con el archivo y, por período, su `fecha`, su `accion` (`NUEVO` o `ACTUALIZACION`) y la `comparacion` contra el anterior. **Hoy es un gancho vacío, a propósito:** ahí se van a conectar las alertas por correo (#7). `avisarPublicacion` lo llama sin hacer esperar la respuesta de la carga; si el gancho falla, la carga ya quedó hecha y solo se registra el error.

## Verificación del jurado (#63)

`GET /api/verificacion` ([contrato](../../../contracts/verificacion.md)) junta un dato de cada punto de la sección 11.1 (calidad, rankings, ponderación, subactividades con Tarjeta y reconciliaciones), con chequeos automáticos de la sección 12. [`verificacion.js`](verificacion.js) no recalcula: ordena los resultados del motor y los compara entre sí en centavos. Con `?banco=` se acota a un banco; los chequeos usan siempre todos.
