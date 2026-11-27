// Filtros de la página Rankings en la URL (#129): /rankings?periodo=…&ranking=…&banco=…&subactividad=…
// Así una vista se recarga igual y se puede compartir. Un valor que no existe en el catálogo se
// ignora (vuelve al valor por defecto), para que un enlace viejo o mal escrito no rompa la página.

export const PARAMETROS = ['periodo', 'ranking', 'banco', 'subactividad']

// Lee y valida los filtros de la URL contra lo que entrega el API.
// catalogo: { periodos: ['20260731', …], rankings: [{ Ranking, Subactividades: [...] }], bancos: [{ Codigo_Banco }] }
export function leerFiltros(parametros, { periodos = [], rankings = [], bancos = [] } = {}) {
  const valor = (nombre) => parametros.get(nombre)?.trim() || null

  const periodo = periodos.includes(valor('periodo')) ? valor('periodo') : null
  const datosRanking = rankings.find((r) => r.Ranking === valor('ranking')?.toUpperCase())
  const ranking = datosRanking?.Ranking ?? null
  const banco = bancos.some((b) => b.Codigo_Banco === valor('banco')) ? valor('banco') : null
  // La subactividad solo vale si pertenece al ranking de la vista: el de la URL o, si no viene, el
  // primero del catálogo (el que muestra la página por defecto).
  const rankingDeLaVista = datosRanking ?? rankings[0]
  const subactividad = rankingDeLaVista?.Subactividades?.includes(valor('subactividad')) ? valor('subactividad') : null

  return { periodo, ranking, banco, subactividad }
}

// Cómo sincronizar el período de la URL con el del encabezado (PeriodoContext), sin modificarlo.
// Recibe el período válido de la URL (o null), el del encabezado y el que tenía el encabezado la
// vez anterior (null la primera vez). Devuelve qué hacer:
//   { tipo: 'url', periodo }        → escribir ese período en la URL;
//   { tipo: 'encabezado', periodo } → cambiar el encabezado a ese período;
//   null                            → ya están sincronizados.
export function decidirPeriodo({ periodoUrl, periodoGlobal, periodoGlobalAnterior }) {
  if (!periodoGlobal) return null
  // El usuario eligió otro período en el encabezado: la URL lo sigue.
  const eligioEnEncabezado =
    periodoGlobalAnterior != null && periodoGlobal !== periodoGlobalAnterior && periodoGlobal !== periodoUrl
  if (eligioEnEncabezado) return { tipo: 'url', periodo: periodoGlobal }
  // La URL trae otro período (enlace abierto, atrás/adelante, un Link o el agente): manda la URL.
  if (periodoUrl && periodoUrl !== periodoGlobal) return { tipo: 'encabezado', periodo: periodoUrl }
  // La URL no trae un período válido: se escribe el del encabezado para que el enlace sea completo.
  if (!periodoUrl) return { tipo: 'url', periodo: periodoGlobal }
  return null
}

// Arma la query de la vista actual. Los filtros vacíos (null) no van en la URL.
export function escribirFiltros(filtros) {
  const parametros = new URLSearchParams()
  for (const nombre of PARAMETROS) {
    if (filtros[nombre]) parametros.set(nombre, filtros[nombre])
  }
  return parametros
}
