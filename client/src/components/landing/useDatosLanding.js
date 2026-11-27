import { calidad as pedirCalidad, parametros as pedirParametros, rankings as pedirRankings } from '@/api/cliente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { periodoAnterior } from '@/lib/periodos.js'
import { compararRankings } from './datosLanding.js'

// Junta varias consultas en una con la forma de useConsulta, para EstadoBloque: carga si alguna
// carga, falla si alguna falla y reintentar reintenta las que fallaron.
function combinar(consultas, armar) {
  const cargando = consultas.some((c) => c.activa && (c.cargando || (!c.datos && !c.error)))
  const error = consultas.find((c) => c.activa && c.error)?.error ?? null
  const datos = cargando || error ? null : armar()
  return {
    cargando,
    error,
    datos,
    reintentar: () => consultas.filter((c) => c.error).forEach((c) => c.reintentar()),
  }
}

// Datos de la landing para el período elegido en el encabezado y el anterior (si lo hay).
// Todas las peticiones son públicas: /api/rankings, /api/parametros y /api/calidad.
export function useDatosLanding() {
  const { periodos, periodo, detallePeriodo } = usePeriodo()
  const anterior = periodo ? periodoAnterior(periodos, periodo) : null
  const detalleAnterior = periodos.find((p) => p.Fecha === anterior) ?? null

  const actual = useConsulta((o) => pedirRankings({ periodo }, o), [periodo], { activa: Boolean(periodo) })
  const previo = useConsulta((o) => pedirRankings({ periodo: anterior }, o), [anterior], { activa: Boolean(anterior) })
  const regla = useConsulta(pedirParametros, [], { activa: Boolean(anterior) })
  const calidad = useConsulta((o) => pedirCalidad({ periodo }, o), [periodo], { activa: Boolean(periodo) })

  const conActiva = (consulta, activa) => ({ ...consulta, activa })
  const rankingsActual = actual.datos?.rankings ?? null
  // useConsulta conserva la última respuesta aunque se apague: sin período anterior no se usa.
  const rankingsAnterior = anterior ? (previo.datos?.rankings ?? null) : null
  const reglaVigente = anterior ? (regla.datos?.regla_significativo ?? null) : null

  // Son 6 rankings de 12 bancos: recalcular en cada render es barato.
  const lideres = combinar([conActiva(actual, Boolean(periodo)), conActiva(previo, Boolean(anterior))], () => ({
    rankingsActual,
    rankingsAnterior,
  }))

  const movimientos = combinar(
    [conActiva(actual, Boolean(periodo)), conActiva(previo, Boolean(anterior)), conActiva(regla, Boolean(anterior))],
    () => ({
      comparacion: anterior ? compararRankings(rankingsActual, rankingsAnterior, reglaVigente) : null,
      regla: reglaVigente,
    }),
  )

  const calidadPeriodo = calidad.datos?.periodos?.find((p) => p.Fecha === periodo) ?? calidad.datos?.periodos?.[0] ?? null

  return {
    periodo,
    anterior,
    detallePeriodo,
    detalleAnterior,
    rankings: actual,
    lideres,
    movimientos,
    calidad: { ...calidad, datos: calidad.datos ? calidadPeriodo : null },
  }
}
