// Cálculos de la landing del sitio público (#139) a partir de respuestas del API. No hay cifras
// escritas a mano (R2): todo sale de GET /api/rankings, /api/periodos y /api/parametros.
//
// GET /api/movimientos es solo de Analista y Administrador, así que en el sitio público los movimientos
// frente al corte anterior se arman con los rankings públicos de los dos períodos y la regla vigente
// de GET /api/parametros (también pública), con las mismas fórmulas que el server
// (server/src/automation/movimientos.js):
//   Cambio_Posicion = Posicion_anterior − Posicion_actual  (positivo = sube)
//   Var_Saldo       = Saldo_actual − Saldo_anterior
//   Var_Saldo_Pct   = Var_Saldo / Saldo_anterior × 100, 4 decimales (null si Saldo_anterior = 0)

const aCentavos = (monto) => Math.round((Number(monto) || 0) * 100)

// Variación porcentual con 4 decimales y redondeo half-up alejándose de cero, en BigInt como el server.
export function variacionPct(actual, anterior) {
  const anteriorCentavos = aCentavos(anterior)
  if (anteriorCentavos === 0) return null
  const varCentavos = aCentavos(actual) - anteriorCentavos
  const variacion = BigInt(Math.abs(varCentavos))
  const base = BigInt(Math.abs(anteriorCentavos))
  const absoluto = Number((variacion * 1_000_000n * 2n + base) / (2n * base))
  if (absoluto === 0) return 0
  const negativo = varCentavos < 0 !== anteriorCentavos < 0
  return (negativo ? -absoluto : absoluto) / 10000
}

const lider = (ranking) => ranking?.bancos?.find((b) => b.Posicion === 1) ?? null

// Criterios de la regla que cumple un movimiento (vacío si no es significativo). Igual que el server.
function motivos(mov, participaEnCambioLider, regla) {
  const lista = []
  const cambio = mov.Cambio_Posicion
  if (regla?.min_cambio_posicion_abs != null && cambio !== null && cambio !== 0 && Math.abs(cambio) >= regla.min_cambio_posicion_abs) {
    lista.push('cambio_posicion')
  }
  if (regla?.cambio_lider && participaEnCambioLider) lista.push('cambio_lider')
  if (regla?.min_var_saldo_pct_abs != null && mov.Var_Saldo_Pct !== null && mov.Var_Saldo_Pct !== 0
      && Math.abs(mov.Var_Saldo_Pct) >= regla.min_var_saldo_pct_abs) {
    lista.push('var_saldo_pct')
  }
  return lista
}

/**
 * Compara los rankings de dos períodos (respuestas de GET /api/rankings) con la regla vigente.
 * Devuelve un elemento por ranking del período actual, con la forma de GET /api/movimientos:
 * { Ranking, Lider_anterior, Lider_actual, Cambio_Lider, movimientos[] }.
 */
export function compararRankings(rankingsActual, rankingsAnterior, regla) {
  const anteriores = new Map((rankingsAnterior ?? []).map((r) => [r.Ranking, r]))
  return (rankingsActual ?? []).map((rActual) => {
    const rAnterior = anteriores.get(rActual.Ranking)
    const filasAnteriores = new Map((rAnterior?.bancos ?? []).map((b) => [b.Codigo_Banco, b]))
    const liderAnterior = lider(rAnterior)
    const liderActual = lider(rActual)
    const cambioLider = Boolean(liderAnterior && liderActual && liderAnterior.Codigo_Banco !== liderActual.Codigo_Banco)
    const enCambioLider = (codigo) => cambioLider && (codigo === liderActual.Codigo_Banco || codigo === liderAnterior.Codigo_Banco)

    const movimientos = (rActual.bancos ?? []).map((b) => {
      const previa = filasAnteriores.get(b.Codigo_Banco)
      const saldoAnterior = previa?.Saldo_Actividad ?? 0
      const mov = {
        Codigo_Banco: b.Codigo_Banco,
        Banco: b.Banco,
        Posicion_anterior: previa?.Posicion ?? null,
        Posicion_actual: b.Posicion,
        Cambio_Posicion: previa ? previa.Posicion - b.Posicion : null,
        Saldo_anterior: saldoAnterior,
        Saldo_actual: b.Saldo_Actividad,
        Var_Saldo: (aCentavos(b.Saldo_Actividad) - aCentavos(saldoAnterior)) / 100,
        Var_Saldo_Pct: variacionPct(b.Saldo_Actividad, saldoAnterior),
      }
      mov.Motivos = motivos(mov, enCambioLider(b.Codigo_Banco), regla)
      mov.Significativo = mov.Motivos.length > 0
      return mov
    })

    return {
      Ranking: rActual.Ranking,
      Lider_anterior: liderAnterior ? { Codigo_Banco: liderAnterior.Codigo_Banco, Banco: liderAnterior.Banco } : null,
      Lider_actual: liderActual ? { Codigo_Banco: liderActual.Codigo_Banco, Banco: liderActual.Banco } : null,
      Cambio_Lider: cambioLider,
      movimientos,
    }
  })
}

// Movimientos significativos de todos los rankings, los más llamativos primero: los de cambio de
// líder, luego el mayor salto de posición y luego la mayor variación de saldo.
export function movimientosPrincipales(comparacion, limite = Infinity) {
  const todos = (comparacion ?? []).flatMap((r) =>
    r.movimientos.filter((m) => m.Significativo).map((m) => ({ ...m, Ranking: r.Ranking })),
  )
  const peso = (m) => [m.Motivos.includes('cambio_lider') ? 1 : 0, Math.abs(m.Cambio_Posicion ?? 0), Math.abs(m.Var_Saldo_Pct ?? 0)]
  todos.sort((a, b) => {
    const [pa, pb] = [peso(a), peso(b)]
    for (let i = 0; i < pa.length; i += 1) if (pa[i] !== pb[i]) return pb[i] - pa[i]
    return 0
  })
  return todos.slice(0, limite)
}

export const contarSignificativos = (comparacion) =>
  (comparacion ?? []).reduce((suma, r) => suma + r.movimientos.filter((m) => m.Significativo).length, 0)

/**
 * Líder (posición 1) de cada ranking del período, con su posición en el corte anterior.
 * `antes` es null si no hay corte anterior; `posicionAnterior` es null si el banco no estaba.
 */
export function lideresDelCorte(rankingsActual, rankingsAnterior) {
  const anteriores = rankingsAnterior ? new Map(rankingsAnterior.map((r) => [r.Ranking, r])) : null
  return (rankingsActual ?? []).map((r) => {
    const primero = lider(r) ?? r.bancos?.[0] ?? null
    let antes = null
    if (anteriores && primero) {
      const rAnterior = anteriores.get(r.Ranking)
      const previa = rAnterior?.bancos?.find((b) => b.Codigo_Banco === primero.Codigo_Banco)
      const liderAnterior = lider(rAnterior)
      antes = {
        posicionAnterior: previa?.Posicion ?? null,
        liderAnterior: liderAnterior && liderAnterior.Codigo_Banco !== primero.Codigo_Banco ? liderAnterior.Banco : null,
      }
    }
    return { ranking: r.Ranking, lider: primero, antes }
  })
}

// Bancos distintos que aparecen en los rankings del período.
export const contarBancos = (rankings) => new Set((rankings ?? []).flatMap((r) => (r.bancos ?? []).map((b) => b.Codigo_Banco))).size

/**
 * URL del sitio interno (Analista y Administrador) desde el público (#120): el público vive en
 * sbp.juank.tech y el interno en interno.sbp.juank.tech. En local cada sitio tiene su puerto
 * (Vite 5173/5174, preview 4173/4174, Docker 8080/8081). `configurada` (VITE_URL_INTERNO) manda.
 */
const PUERTOS_INTERNO = { 5173: 5174, 4173: 4174, 8080: 8081 }
const LOCALES = new Set(['localhost', '127.0.0.1', '[::1]'])

export function urlSitioInterno({ protocol = 'https:', hostname = '', port = '' } = {}, configurada = '') {
  if (configurada) return configurada
  if (LOCALES.has(hostname)) {
    const puerto = PUERTOS_INTERNO[port] ?? (port ? Number(port) + 1 : 5174)
    return `${protocol}//${hostname}:${puerto}/`
  }
  const host = hostname.replace(/^www\./, '')
  if (!host || host.startsWith('interno.')) return `${protocol}//${host}/`
  return `${protocol}//interno.${host}${port ? `:${port}` : ''}/`
}
