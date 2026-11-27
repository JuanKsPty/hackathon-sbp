import { InfoIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { NOMBRE_APP } from './navegacion.js'

// Pie de todas las páginas: fuente, período y aviso (lámina 9). Fuente y aviso llegan en cada
// respuesta del API; si el API no responde se muestran los textos de respaldo de api/fuente.js.
export function BarraFuente() {
  const { fuente, aviso } = useFuente()
  const { periodo, detallePeriodo } = usePeriodo()

  return (
    <footer className="border-t bg-card">
      <div
        role="note"
        data-guia="global.barra-fuente"
        aria-label="Fuente y aviso de los datos"
        className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-6"
      >
        <div className="flex items-center gap-3">
          <img src="/marca/logo.svg" alt="" className="size-7 shrink-0 rounded" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{NOMBRE_APP}</span>
            <span>Superintendencia de Bancos de Panamá · Hackathon SBP 2026</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:items-end sm:text-right">
          <span className="inline-flex items-center gap-1.5 font-medium text-aviso">
            <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {aviso}
          </span>
          <span>
            Fuente: {fuente} · Período: {periodo ? formatearPeriodo(periodo) : 'sin seleccionar'}
            {detallePeriodo?.Archivo ? ` · ${detallePeriodo.Archivo}` : ''}
          </span>
        </div>
      </div>
    </footer>
  )
}
