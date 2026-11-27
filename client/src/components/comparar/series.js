// Series para el gráfico de evolución de posiciones y para comparar 2 bancos (#61).
// Solo reordena respuestas de GET /api/rankings; no calcula posiciones, saldos ni porcentajes (R2).
// Sin imports de la app para poder probarlo con `npm test` (node:test).

const rankingDe = (respuesta, ranking) => respuesta?.rankings?.find((r) => r.Ranking === ranking)

// Una respuesta de /api/rankings por período -> puntos del LineChart.
// `puntos`: [{ periodo, [Codigo_Banco]: Posicion }] del más antiguo al más reciente.
// `bancos`: un elemento por banco, ordenados por su posición en el último período (los que no
// aparecen en él, al final y por nombre).
// `maxPosicion`: la posición más baja que trae el API (para el alto del eje).
export function armarSerieDePosiciones(respuestas, ranking) {
  const ordenadas = [...(respuestas ?? [])].filter((r) => r?.periodo).sort((a, b) => a.periodo.localeCompare(b.periodo))
  const nombres = new Map()
  let maxPosicion = 0

  const puntos = ordenadas.map((respuesta) => {
    const punto = { periodo: respuesta.periodo }
    for (const banco of rankingDe(respuesta, ranking)?.bancos ?? []) {
      punto[banco.Codigo_Banco] = banco.Posicion
      nombres.set(banco.Codigo_Banco, banco.Banco)
      maxPosicion = Math.max(maxPosicion, banco.Posicion)
    }
    return punto
  })

  const ultimo = puntos.at(-1) ?? {}
  const bancos = [...nombres].map(([codigo, nombre]) => ({ codigo, nombre, posicionFinal: ultimo[codigo] ?? null }))
  bancos.sort((a, b) => {
    if (a.posicionFinal === null && b.posicionFinal === null) return a.nombre.localeCompare(b.nombre, 'es')
    if (a.posicionFinal === null) return 1
    if (b.posicionFinal === null) return -1
    return a.posicionFinal - b.posicionFinal
  })
  return { puntos, bancos, maxPosicion }
}

// Qué le pasó a la posición entre dos períodos (menor número = mejor posición).
// 'sin_dato' si el banco no estaba en alguno de los dos.
export function tendenciaDePosiciones(posicionDesde, posicionHasta) {
  if (typeof posicionDesde !== 'number' || typeof posicionHasta !== 'number') return 'sin_dato'
  if (posicionHasta < posicionDesde) return 'sube'
  if (posicionHasta > posicionDesde) return 'baja'
  return 'igual'
}

const datosDeBanco = (respuesta, ranking, codigo) => {
  const banco = rankingDe(respuesta, ranking)?.bancos?.find((b) => b.Codigo_Banco === codigo)
  if (!banco) return null
  return { Posicion: banco.Posicion, Saldo_Actividad: banco.Saldo_Actividad, Ponderacion_Pct: banco.Ponderacion_Pct }
}

// Dos respuestas de /api/rankings (desde y hasta, sin filtrar por ranking) -> una fila por ranking
// con los datos de los dos bancos en cada período. Si el banco no aparece, su dato es null.
export function armarComparacionBancos(respuestaDesde, respuestaHasta, codigos) {
  const nombres = (respuestaHasta?.rankings ?? respuestaDesde?.rankings ?? []).map((r) => r.Ranking)
  return nombres.map((ranking) => ({
    Ranking: ranking,
    bancos: codigos.map((codigo) => {
      const desde = datosDeBanco(respuestaDesde, ranking, codigo)
      const hasta = datosDeBanco(respuestaHasta, ranking, codigo)
      return { codigo, desde, hasta, tendencia: tendenciaDePosiciones(desde?.Posicion, hasta?.Posicion) }
    }),
  }))
}

// Par de bancos a comparar. Respeta lo que eligió el usuario mientras exista en el catálogo; lo que
// falte se completa con los `candidatos` (por ejemplo, los mejor posicionados) sin repetir banco.
export function elegirParDeBancos({ elegidoA, elegidoB, candidatos = [], validos = [] }) {
  const existe = (codigo) => Boolean(codigo) && validos.includes(codigo)
  const opciones = [...new Set(candidatos)].filter(existe)
  let a = existe(elegidoA) ? elegidoA : null
  const b0 = existe(elegidoB) ? elegidoB : null
  a ??= opciones.find((c) => c !== b0) ?? null
  const b = b0 ?? opciones.find((c) => c !== a) ?? null
  return { a, b }
}
