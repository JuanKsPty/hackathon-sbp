import { useState } from 'react'
import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { entradaDeGlosario } from './glosario.js'

// Ícono ⓘ que explica un término del glosario. Se abre al pasar el mouse, con el teclado
// (foco) y con un toque en celular; se cierra al tocar fuera o con Escape.
export function IconoGlosario({ termino }) {
  const [abierto, setAbierto] = useState(false)
  const entrada = entradaDeGlosario(termino)
  if (!entrada) return null

  // Radix cierra el tooltip al presionar el disparador: se evita para que un toque lo abra.
  const abrir = (evento) => {
    evento.preventDefault()
    setAbierto(true)
  }

  return (
    <Tooltip open={abierto} onOpenChange={setAbierto}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Qué significa: ${entrada.nombre}`}
          onPointerDown={abrir}
          onClick={abrir}
          className="inline-flex shrink-0 items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <InfoIcon className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="block max-w-xs text-left leading-snug font-normal whitespace-normal">
        <span className="block font-semibold">{entrada.nombre}</span>
        {entrada.definicion}
      </TooltipContent>
    </Tooltip>
  )
}

// Texto del término (o el que se pase como hijo) seguido de su ícono ⓘ.
export function TerminoGlosario({ termino, children }) {
  const entrada = entradaDeGlosario(termino)
  return (
    <span className="inline-flex items-center gap-1">
      {children ?? entrada?.nombre}
      <IconoGlosario termino={termino} />
    </span>
  )
}
