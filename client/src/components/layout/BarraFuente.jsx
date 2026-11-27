import { InfoIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'

// Siempre visible: fuente, período y aviso. Fuente y aviso llegan en cada respuesta del API;
// si el API no responde se muestran los textos de respaldo de api/fuente.js.
export function BarraFuente() {
  const { fuente, aviso } = useFuente()
  const { periodo, detallePeriodo } = usePeriodo()

  return (
    <div
      role="note"
      aria-label="Fuente y aviso de los datos"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-aviso-fondo px-4 py-1.5 text-xs text-aviso lg:px-6"
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <InfoIcon className="size-3.5" aria-hidden="true" />
        {aviso}
      </span>
      <span>Fuente: {fuente}</span>
      <span>
        Período: {periodo ? formatearPeriodo(periodo) : 'sin seleccionar'}
        {detallePeriodo?.Archivo ? ` · ${detallePeriodo.Archivo}` : ''}
      </span>
    </div>
  )
}
