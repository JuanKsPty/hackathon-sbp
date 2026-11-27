// Comparación de rankings entre dos períodos (sección 8 de las indicaciones, issue #32).
// Usa los rankings que ya calculó el motor (centavos enteros); no vuelve a leer los AT03.
//   Cambio_Posicion = Posicion_anterior − Posicion_actual  (positivo = sube)
//   Var_Saldo       = Saldo_actual − Saldo_anterior
//   Var_Saldo_Pct   = Var_Saldo / Saldo_anterior × 100, 4 decimales (null si Saldo_anterior = 0)

// Variación porcentual en diezmilésimas de punto, con redondeo aritmético (half-up, alejándose
// de cero), en BigInt para no perder precisión. Devuelve null si no hay base.
export function variacionPctE4(varCentavos, anteriorCentavos) {
  if (anteriorCentavos === 0) return null;
  const variacion = BigInt(Math.abs(varCentavos));
  const base = BigInt(Math.abs(anteriorCentavos));
  const absoluto = Number((variacion * 1_000_000n * 2n + base) / (2n * base));
  if (absoluto === 0) return 0;
  const negativo = varCentavos < 0 !== anteriorCentavos < 0;
  return negativo ? -absoluto : absoluto;
}

// Criterios de la regla que cumple un movimiento (vacío si no es significativo).
function motivos(mov, participaEnCambioLider, regla) {
  const lista = [];
  const cambio = mov.cambioPosicion;
  if (regla.min_cambio_posicion_abs !== null && cambio !== null && cambio !== 0
      && Math.abs(cambio) >= regla.min_cambio_posicion_abs) {
    lista.push('cambio_posicion');
  }
  if (regla.cambio_lider && participaEnCambioLider) lista.push('cambio_lider');
  // Un 0 % no es un movimiento: con umbral 0, "|variación| >= 0" marcaría a todos los bancos,
  // así que el 0 % se excluye igual que el cambio de posición nulo (C8 de #86).
  if (regla.min_var_saldo_pct_abs !== null && mov.varSaldoPctE4 !== null && mov.varSaldoPctE4 !== 0
      && Math.abs(mov.varSaldoPctE4) >= regla.min_var_saldo_pct_abs * 10000) {
    lista.push('var_saldo_pct');
  }
  return lista;
}

/**
 * Compara los rankings de dos períodos procesados por el motor.
 * Montos en centavos y variación porcentual en diezmilésimas (el formato JSON lo da la ruta).
 */
export function compararPeriodos(anterior, actual, regla, { ranking = null } = {}) {
  const rankingsAnteriores = new Map(anterior.rankings.map((r) => [r.ranking, r]));
  return actual.rankings
    .filter((r) => !ranking || r.ranking === ranking)
    .map((rActual) => {
      const rAnterior = rankingsAnteriores.get(rActual.ranking);
      const filasAnteriores = new Map((rAnterior?.filas ?? []).map((f) => [f.codigoBanco, f]));
      const liderAnterior = rAnterior?.filas.find((f) => f.posicion === 1) ?? null;
      const liderActual = rActual.filas.find((f) => f.posicion === 1) ?? null;
      const cambioLider = Boolean(liderAnterior && liderActual && liderAnterior.codigoBanco !== liderActual.codigoBanco);
      const enCambioLider = (codigo) =>
        cambioLider && (codigo === liderActual.codigoBanco || codigo === liderAnterior.codigoBanco);

      const movimientos = rActual.filas.map((f) => {
        const previa = filasAnteriores.get(f.codigoBanco);
        const saldoAnterior = previa?.saldoActividad ?? 0;
        const varSaldo = f.saldoActividad - saldoAnterior;
        const mov = {
          codigoBanco: f.codigoBanco,
          banco: f.banco,
          // null solo si el banco no existía en el período anterior (banco no catalogado nuevo)
          posicionAnterior: previa?.posicion ?? null,
          posicionActual: f.posicion,
          cambioPosicion: previa ? previa.posicion - f.posicion : null,
          saldoAnterior,
          saldoActual: f.saldoActividad,
          varSaldo,
          varSaldoPctE4: variacionPctE4(varSaldo, saldoAnterior),
        };
        mov.motivos = motivos(mov, enCambioLider(f.codigoBanco), regla);
        mov.significativo = mov.motivos.length > 0;
        return mov;
      });

      return { ranking: rActual.ranking, liderAnterior, liderActual, cambioLider, movimientos };
    });
}
