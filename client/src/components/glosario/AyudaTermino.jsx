import { useState } from 'react'
import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { definicion } from '@/lib/glosario.js'

// Ícono ⓘ que explica un término del glosario (#129). Se abre al pasar el mouse, al enfocarlo con
// Tab o al tocarlo en el celular, y se cierra al tocar fuera o con Escape. Va al lado del texto,
// nunca dentro de otro botón.
export function AyudaTermino({ clave, className = '' }) {
  const [abierto, setAbierto] = useState(false)
  const entrada = definicion(clave)
  if (!entrada) return null

  // El Tooltip de Radix no se abre con un toque y se cierra al presionar el ícono: por eso se
  // controla a mano. Presionar o tocar el ícono lo deja abierto; mouse y teclado siguen igual.
  const abrir = (evento) => {
    evento.preventDefault()
    setAbierto(true)
  }

  return (
    <Tooltip open={abierto} onOpenChange={setAbierto}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Qué significa ${entrada.termino}`}
          onPointerDown={abrir}
          onClick={abrir}
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
