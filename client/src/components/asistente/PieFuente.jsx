import { InfoIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'

// Fuente, período y aviso de datos ficticios al pie de cada tarjeta del asistente (lámina 9).
// Así se ven aunque el chat se abra en un panel lateral. `periodoTexto` reemplaza al período elegido.
export function PieFuente({ periodoTexto }) {
  const { fuente, aviso } = useFuente()
  const { periodo } = usePeriodo()
  const textoPeriodo = periodoTexto ?? (periodo ? formatearPeriodo(periodo) : 'sin seleccionar')

  return (
    <p role="note" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-aviso">
        <InfoIcon className="size-3.5" aria-hidden="true" />
        {aviso}
      </span>
      <span>Fuente: {fuente}</span>
      <span>Período: {textoPeriodo}</span>
    </p>
  )
}
