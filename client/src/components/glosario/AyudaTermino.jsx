import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { definicion } from '@/lib/glosario.js'

// Ícono ⓘ que explica un término del glosario (#129). Se abre al pasar el mouse, al enfocarlo con
// Tab o al tocarlo en el celular. Va al lado del texto, nunca dentro de otro botón.
export function AyudaTermino({ clave, className = '' }) {
  const entrada = definicion(clave)
  if (!entrada) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Qué significa ${entrada.termino}`}
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${className}`}
        >
          <InfoIcon className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 text-left font-normal whitespace-normal">
        <span>
          <span className="font-semibold">{entrada.termino}: </span>
          {entrada.definicion}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
