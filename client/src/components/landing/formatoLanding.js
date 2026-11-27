// Formatos cortos de la landing. Los valores siempre vienen del API (R2).
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })
const millones = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)

// En millones con separador de miles: 5152103850.27 -> "5,152.1 M"; debajo del millón, compacto.
export function montoCompacto(valor) {
  if (!esNumero(valor)) return '—'
  return Math.abs(valor) >= 1e6 ? `${millones.format(valor / 1e6)} M` : compacto.format(valor)
}

// Variación en % con un decimal y signo: 4.8 -> "+4.8 %".
export const variacionCorta = (valor) => (esNumero(valor) ? `${valor > 0 ? '+' : ''}${pct.format(valor)} %` : null)

// 3 -> "3.º"
export const ordinal = (n) => (esNumero(n) ? `${n}.º` : '—')

// Clase de color semántico para un número con signo.
export const tono = (valor) => (!esNumero(valor) || valor === 0 ? 'igual' : valor > 0 ? 'sube' : 'baja')

// Variación porcentual simple entre dos cifras del API (para el resumen del hero).
export function variacionEntre(actual, anterior) {
  if (!esNumero(actual) || !esNumero(anterior) || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}
