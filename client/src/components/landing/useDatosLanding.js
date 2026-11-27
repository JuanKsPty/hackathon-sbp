import { calidad as pedirCalidad, indicadores as pedirIndicadores, rankings as pedirRankings } from '@/api/cliente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'

// Datos del dashboard público para el período elegido en el encabezado. El público ve solo el corte
// vigente: aquí no se pide ningún otro período.
// Todas las peticiones son públicas: /api/rankings, /api/calidad y /api/indicadores.
export function useDatosLanding() {
  const { periodo, detallePeriodo } = usePeriodo()
  const activa = Boolean(periodo)

  const rankings = useConsulta((o) => pedirRankings({ periodo }, o), [periodo], { activa })
  const calidad = useConsulta((o) => pedirCalidad({ periodo }, o), [periodo], { activa })
  const indicadores = useConsulta((o) => pedirIndicadores({ periodo }, o), [periodo], { activa })

  const calidadPeriodo = calidad.datos?.periodos?.find((p) => p.Fecha === periodo) ?? calidad.datos?.periodos?.[0] ?? null

  return {
    periodo,
    detallePeriodo,
    rankings,
    calidad: { ...calidad, datos: calidad.datos ? calidadPeriodo : null },
    indicadores,
  }
}
