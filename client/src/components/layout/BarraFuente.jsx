import { InfoIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { NOMBRE_APP } from './navegacion.js'

// Pie fijo de todas las páginas: fuente, período y aviso (lámina 9). Va abajo, pero pegado al borde
// de la pantalla (sticky), así que se ve siempre sin desplazarse. Fuente y aviso llegan en cada
// respuesta del API; si el API no responde se muestran los textos de respaldo de api/fuente.js.
export function BarraFuente() {
  const { fuente, aviso } = useFuente()
  const { periodo, detallePeriodo } = usePeriodo()

  return (
    <footer className="sticky bottom-0 z-20 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div
        role="note"
        data-guia="global.barra-fuente"
        aria-label="Fuente y aviso de los datos"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-2 text-[11px] text-muted-foreground sm:text-xs lg:px-6"
      >
        <span className="hidden items-center gap-2 font-medium text-foreground md:inline-flex">
          <img src="/marca/logo.svg" alt="" className="size-5 shrink-0 rounded-sm" />
          {NOMBRE_APP}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-aviso">
          <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {aviso}
        </span>
        <span className="md:ml-auto">
          Fuente: {fuente} · Período: {periodo ? formatearPeriodo(periodo) : 'sin seleccionar'}
          {detallePeriodo?.Archivo ? <span className="hidden sm:inline"> · {detallePeriodo.Archivo}</span> : null}
        </span>
      </div>
    </footer>
  )
}
