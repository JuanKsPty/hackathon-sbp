// Datos en vivo de la presentación (/presentacion). Todas las cifras de las láminas salen de aquí, es
// decir, del API (R2): períodos, calidad, rankings del último período, regla de movimientos y estado
// de la IA. Son endpoints abiertos al sitio público (nginx.publico.conf).
import { calidad, parametros, rankings } from '@/api/cliente.js'
import { estadoIA } from '@/api/ia.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'

export function useDatosPresentacion() {
  const { periodos, cargando: cargandoPeriodos, error: errorPeriodos } = usePeriodo()
  // La presentación siempre muestra el período más reciente que reportó el API.
  const ultimo = periodos.at(-1)?.Fecha ?? null

  const consultaCalidad = useConsulta((opciones) => calidad({}, opciones))
  const consultaRankings = useConsulta((opciones) => rankings({ periodo: ultimo }, opciones), [ultimo], {
    activa: Boolean(ultimo),
  })
  const consultaParametros = useConsulta((opciones) => parametros(opciones))
  const consultaIA = useConsulta((opciones) => estadoIA(opciones))

  const calidadPorPeriodo = Array.isArray(consultaCalidad.datos?.periodos) ? consultaCalidad.datos.periodos : []

  return {
    cargando: cargandoPeriodos || consultaCalidad.cargando,
    sinApi: Boolean(errorPeriodos),
    periodos,
    ultimo,
    detalleUltimo: periodos.at(-1) ?? null,
    calidad: calidadPorPeriodo,
    calidadUltimo: calidadPorPeriodo.find((p) => p.Fecha === ultimo) ?? null,
    rankings: Array.isArray(consultaRankings.datos?.rankings) ? consultaRankings.datos.rankings : [],
    regla: consultaParametros.datos?.regla_significativo ?? null,
    ia: consultaIA.datos ?? null,
  }
}
