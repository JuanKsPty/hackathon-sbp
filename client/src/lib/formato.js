// Formatos para mostrar los datos del API. Los valores siempre vienen del backend (R2).

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// '20260930' -> '30 sep 2026'. Si no es una fecha AAAAMMDD, devuelve el texto tal cual.
export function formatearPeriodo(fecha) {
  if (fecha === 'todos') return 'Todos los períodos'
  const partes = /^(\d{4})(\d{2})(\d{2})$/.exec(String(fecha ?? ''))
  if (!partes) return fecha ?? ''
  const [, anio, mes, dia] = partes
  const nombreMes = MESES[Number(mes) - 1]
  if (!nombreMes) return fecha
  return `${Number(dia)} ${nombreMes} ${anio}`
}

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Período como mes, para el selector: '20260930' -> 'Septiembre 2026'.
// Cada período es un corte mensual; en los textos donde importa la fecha de corte se sigue usando
// formatearPeriodo. Si no es una fecha AAAAMMDD, devuelve el texto tal cual.
export function formatearMes(fecha) {
  if (fecha === 'todos') return 'Todos los períodos'
  const partes = /^(\d{4})(\d{2})(\d{2})$/.exec(String(fecha ?? ''))
  if (!partes) return fecha ?? ''
  const [, anio, mes] = partes
  const nombreMes = MESES_LARGOS[Number(mes) - 1]
  if (!nombreMes) return fecha
  return `${nombreMes} ${anio}`
}

// Período en una frase: 'al 30 sep 2026', o 'en todos los períodos' para el acumulado.
export function alPeriodo(fecha) {
  return fecha === 'todos' ? 'en todos los períodos' : `al ${formatearPeriodo(fecha)}`
}

// Fecha de corte del período, corta: '20260930' -> 'corte al 30 sep'.
export function formatearCorte(fecha) {
  if (fecha === 'todos') return 'acumulado de los cortes cargados'
  const partes = /^(\d{4})(\d{2})(\d{2})$/.exec(String(fecha ?? ''))
  if (!partes) return ''
  const [, , mes, dia] = partes
  const nombreMes = MESES[Number(mes) - 1]
  return nombreMes ? `corte al ${Number(dia)} ${nombreMes}` : ''
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
