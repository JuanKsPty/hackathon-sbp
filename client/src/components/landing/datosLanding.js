// Cálculos del dashboard del sitio público (#139) a partir de respuestas del API. No hay cifras
// escritas a mano (R2): todo sale de GET /api/rankings, /api/subactividades y /api/indicadores
// del corte vigente.

const lider = (ranking) => ranking?.bancos?.find((b) => b.Posicion === 1) ?? null

// Líder (posición 1) de cada ranking del período.
export function lideresDelCorte(rankings) {
  return (rankings ?? []).map((r) => ({ ranking: r.Ranking, lider: lider(r) ?? r.bancos?.[0] ?? null }))
}

// Bancos distintos que aparecen en los rankings del período.
export const contarBancos = (rankings) => new Set((rankings ?? []).flatMap((r) => (r.bancos ?? []).map((b) => b.Codigo_Banco))).size

// Composición de la cartera válida por macroactividad, con Total_Ranking de GET /api/indicadores
// (concentracion[]). La participación es sobre la suma de los rankings que devuelve el API.
export function composicionCartera(concentracion) {
  const filas = (concentracion ?? []).map((c) => ({ ranking: c.Ranking, saldo: c.Total_Ranking ?? 0 }))
  const total = filas.reduce((suma, f) => suma + f.saldo, 0)
  return filas
    .map((f) => ({ ...f, pct: total > 0 ? (f.saldo / total) * 100 : null }))
    .sort((a, b) => b.saldo - a.saldo)
}

// Saldo por subactividad de un ranking (GET /api/subactividades trae una fila por subactividad y banco).
export function saldoPorSubactividad(filas) {
  const totales = new Map()
  for (const f of filas ?? []) totales.set(f.Subactividad, (totales.get(f.Subactividad) ?? 0) + (Number(f.Saldo) || 0))
  return [...totales].map(([subactividad, saldo]) => ({ subactividad, saldo: Math.round(saldo * 100) / 100 })).sort((a, b) => b.saldo - a.saldo)
}

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
