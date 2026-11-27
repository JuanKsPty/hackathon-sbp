import { DownloadIcon, InfoIcon } from 'lucide-react'
import { calidad as pedirCalidad, urlDescarga } from '@/api/cliente.js'
import { useFuente } from '@/api/fuente.js'
import { AlertasPorTipo } from '@/components/calidad/AlertasPorTipo.jsx'
import { CascadaPeriodos } from '@/components/calidad/CascadaPeriodos.jsx'
import { ConteosIndependientes } from '@/components/calidad/ConteosIndependientes.jsx'
import { FilasExcluidas } from '@/components/calidad/FilasExcluidas.jsx'
import { Reconciliaciones } from '@/components/calidad/Reconciliaciones.jsx'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Button } from '@/components/ui/button'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearPeriodo } from '@/lib/formato.js'
import { Pagina } from './Pagina.jsx'

// Calidad de datos (#65): cascada E1-E4 de todos los períodos y, del período elegido en el
// encabezado, reconciliaciones, alertas, conteos independientes y filas excluidas.
// Todas las cifras vienen de GET /api/calidad y GET /api/excluidas (R2).
export default function Calidad() {
  const { periodo } = usePeriodo()
  const { datos, error, cargando, reintentar } = useConsulta(pedirCalidad)

  let contenido
  if (cargando) contenido = <Cargando filas={6} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (!datos?.periodos?.length)
    contenido = <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su calidad de datos." />
  else contenido = <Contenido periodos={datos.periodos} periodoElegido={periodo} />

  return (
    <Pagina titulo="Calidad de datos" descripcion="Cascada de exclusiones, reconciliaciones y alertas del archivo AT03.">
      {contenido}
    </Pagina>
  )
}

function Contenido({ periodos, periodoElegido }) {
  const elegido = periodos.find((p) => p.Fecha === periodoElegido) ?? periodos.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <FuenteDelPeriodo calidad={elegido} />
      <CascadaPeriodos periodos={periodos} periodoElegido={elegido.Fecha} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Reconciliaciones reconciliaciones={elegido.Reconciliaciones} />
        <AlertasPorTipo calidad={elegido} />
      </div>
      <ConteosIndependientes conteos={elegido.Conteos_Independientes} />
      <FilasExcluidas periodo={elegido.Fecha} />
    </div>
  )
}

// Fuente, período y aviso de datos ficticios del período que se está viendo (lámina 9).
function FuenteDelPeriodo({ calidad }) {
  const { fuente, aviso } = useFuente()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-aviso-fondo px-4 py-3 text-sm text-aviso">
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <InfoIcon className="size-4" aria-hidden="true" />
          {aviso}
        </span>
        <span>
          Fuente: {fuente} · Período: {formatearPeriodo(calidad.Fecha)} · Archivo: {calidad.Archivo}
        </span>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={urlDescarga('calidad', { periodo: calidad.Fecha })} download>
          <DownloadIcon aria-hidden="true" />
          Reporte de calidad (CSV)
        </a>
      </Button>
    </div>
  )
}
