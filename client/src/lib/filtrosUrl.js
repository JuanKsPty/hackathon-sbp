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
  // La subactividad solo vale si pertenece al ranking de la URL.
  const subactividad = datosRanking?.Subactividades?.includes(valor('subactividad')) ? valor('subactividad') : null

  return { periodo, ranking, banco, subactividad }
}

// Arma la query de la vista actual. Los filtros vacíos (null) no van en la URL.
export function escribirFiltros(filtros) {
  const parametros = new URLSearchParams()
  for (const nombre of PARAMETROS) {
    if (filtros[nombre]) parametros.set(nombre, filtros[nombre])
  }
  return parametros
}
