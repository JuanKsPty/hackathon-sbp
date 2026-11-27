import { ExplicacionesMovimientos } from '@/components/asistente/ExplicacionesMovimientos.jsx'
import { IndicadoresAdicionales } from '@/components/panel/IndicadoresAdicionales.jsx'
import { LideresRankings } from '@/components/panel/LideresRankings.jsx'
import { MovimientosSignificativos } from '@/components/panel/MovimientosSignificativos.jsx'
import { ResumenPeriodo } from '@/components/panel/ResumenPeriodo.jsx'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { Pagina } from './Pagina.jsx'


// Panel (#60): indicadores del período, líder de cada ranking, movimientos significativos con su
// explicación (Analista y Administrador) e indicadores adicionales. El período se elige en el encabezado.
export default function Panel() {
  // Comparar períodos es configurable por el Administrador (perfiles y permisos): se pregunta por la opción.
  const { puede } = usePerfil()
  const analiza = puede('comparar_periodos')

  return (
    <Pagina titulo="Panel" descripcion="Vista general del período: cartera válida, líderes y movimientos destacados.">
      <ResumenPeriodo />
      <LideresRankings />
      {/* Movimientos y explicaciones comparan dos períodos: solo Analista y Administrador. */}
      <div className={analiza ? 'grid items-start gap-6 xl:grid-cols-2' : undefined}>
        <MovimientosSignificativos />
        {analiza && <ExplicacionesMovimientos guia="panel.explicaciones" />}
      </div>
      <IndicadoresAdicionales />
    </Pagina>
  )
}
