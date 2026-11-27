// Vista de Rankings en la URL (#129): /rankings?periodo=…&ranking=…&banco=…&subactividad=…
// Así un enlace abre exactamente la misma vista. Los valores válidos salen del API
// (períodos, catálogo de rankings y bancos); lo que no es válido se ignora.

// Lee la URL y devuelve solo los valores válidos (null si falta o no es válido).
// La subactividad tiene que pertenecer al ranking de la vista (el de la URL o, si no hay, el primero).
export function leerVista(parametros, { periodos = [], rankings = [], bancos = [] } = {}) {
  const valor = (nombre) => parametros.get(nombre)

  const periodo = periodos.some((p) => p.Fecha === valor('periodo')) ? valor('periodo') : null
  const entradaRanking = rankings.find((r) => r.Ranking === valor('ranking')) ?? null
  const banco = bancos.some((b) => b.Codigo_Banco === valor('banco')) ? valor('banco') : null
  const subactividadesDeLaVista = (entradaRanking ?? rankings[0])?.Subactividades ?? []
  const subactividad = subactividadesDeLaVista.includes(valor('subactividad')) ? valor('subactividad') : null

  return { periodo, ranking: entradaRanking?.Ranking ?? null, banco, subactividad }
}

// Arma los parámetros de la URL; los vacíos (sin filtro) no se escriben.
export function escribirVista({ periodo, ranking, banco, subactividad }) {
  const parametros = new URLSearchParams()
  if (periodo) parametros.set('periodo', periodo)
  if (ranking) parametros.set('ranking', ranking)
  if (banco) parametros.set('banco', banco)
  if (subactividad) parametros.set('subactividad', subactividad)
  return parametros
}
