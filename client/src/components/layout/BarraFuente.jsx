import { InfoIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'

// Siempre visible, bajo la navegación: aviso de datos ficticios, fuente y período. Fuente y aviso
// llegan en cada respuesta del API; si el API no responde se muestran los textos de respaldo de
// api/fuente.js.
export function BarraFuente() {
  const { fuente, aviso } = useFuente()
  const { periodo, detallePeriodo } = usePeriodo()

  return (
    <div
      role="note"
      data-guia="global.barra-fuente"
      aria-label="Fuente y aviso de los datos"
      className="border-b border-aviso/15 bg-aviso-fondo text-xs text-aviso"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-1.5 lg:px-8">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {aviso}
        </span>
        <span aria-hidden="true" className="hidden opacity-50 sm:inline">·</span>
        <span>Fuente: {fuente}</span>
        <span aria-hidden="true" className="hidden opacity-50 sm:inline">·</span>
        <span className="tabular-nums">
          Período: {periodo ? formatearPeriodo(periodo) : 'sin seleccionar'}
          {detallePeriodo?.Archivo ? ` · ${detallePeriodo.Archivo}` : ''}
        </span>
      </div>
    </div>
  )
}
