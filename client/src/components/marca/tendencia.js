// Normaliza la variación de <Cifra>: devuelve { tendencia, texto } o null.
// Acepta { tendencia: 'sube' | 'baja' | 'igual', texto } o un número (el signo da la tendencia).

const TENDENCIAS = new Set(['sube', 'baja', 'igual'])
const conSigno = new Intl.NumberFormat('es-PA', { signDisplay: 'exceptZero', maximumFractionDigits: 2 })

export function tendenciaDe(variacion) {
  if (variacion === null || variacion === undefined || variacion === '') return null
  if (typeof variacion === 'number') {
    if (!Number.isFinite(variacion)) return null
    const tendencia = variacion > 0 ? 'sube' : variacion < 0 ? 'baja' : 'igual'
    return { tendencia, texto: conSigno.format(variacion) }
  }
  if (typeof variacion === 'object' && TENDENCIAS.has(variacion.tendencia)) {
    return { tendencia: variacion.tendencia, texto: variacion.texto ?? '' }
  }
  return null
}
