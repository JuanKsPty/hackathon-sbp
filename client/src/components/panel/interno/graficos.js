// Formatos y ejes comunes de los gráficos del panel interno (Recharts, client/DISENO.md).

// Eje en millones o miles: 87562053.92 -> "87.6 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })
export const formatoCompacto = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? compacto.format(valor) : '')

// Ejes finos y sin líneas de marca.
export const EJE = { tickLine: false, axisLine: false, tick: { fontSize: 11 } }
