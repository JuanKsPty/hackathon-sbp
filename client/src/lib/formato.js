// Formatos para mostrar los datos del API. Los valores siempre vienen del backend (R2).

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// '20260930' -> '30 sep 2026'. Si no es una fecha AAAAMMDD, devuelve el texto tal cual.
export function formatearPeriodo(fecha) {
  const partes = /^(\d{4})(\d{2})(\d{2})$/.exec(String(fecha ?? ''))
  if (!partes) return fecha ?? ''
  const [, anio, mes, dia] = partes
  const nombreMes = MESES[Number(mes) - 1]
  if (!nombreMes) return fecha
  return `${Number(dia)} ${nombreMes} ${anio}`
}

// Panamá usa punto decimal y coma de miles, igual que los CSV del reto.
const enteros = new Intl.NumberFormat('es-PA', { maximumFractionDigits: 0 })
const montos = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const porcentajes = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

const esNumero = (valor) => typeof valor === 'number' && Number.isFinite(valor)

export const formatearEntero = (valor) => (esNumero(valor) ? enteros.format(valor) : '—')

// Montos con 2 decimales (contracts/README.md).
export const formatearMonto = (valor) => (esNumero(valor) ? montos.format(valor) : '—')

// Ponderacion_Pct con 4 decimales.
export const formatearPorcentaje = (valor) => (esNumero(valor) ? `${porcentajes.format(valor)} %` : '—')
