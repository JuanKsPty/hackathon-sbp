// Formatos cortos del dashboard. Los valores siempre vienen del API (R2).
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })
const millones = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)

// En millones con separador de miles: 5152103850.27 -> "5,152.1 M"; debajo del millón, compacto.
export function montoCompacto(valor) {
  if (!esNumero(valor)) return '—'
  return Math.abs(valor) >= 1e6 ? `${millones.format(valor / 1e6)} M` : compacto.format(valor)
}
