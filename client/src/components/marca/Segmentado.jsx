import { useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Control segmentado tipo píldora (radiogroup accesible).
 * Teclado: Tab entra a la opción elegida; flechas, Inicio y Fin cambian de opción.
 * Ej.: <Segmentado ariaLabel="Ranking" opciones={[{ valor: 'total', etiqueta: 'Total' }]}
 *        valor={ranking} onCambio={setRanking} />
 */
export function Segmentado({ opciones = [], valor, onCambio, ariaLabel, className, ...props }) {
  const botones = useRef([])
  const elegido = opciones.findIndex((o) => o.valor === valor)

  function ir(indice) {
    const n = opciones.length
    if (!n) return
    const destino = ((indice % n) + n) % n
    onCambio?.(opciones[destino].valor)
    botones.current[destino]?.focus()
  }

  function alTeclear(evento, indice) {
    const acciones = {
      ArrowRight: () => ir(indice + 1),
      ArrowDown: () => ir(indice + 1),
      ArrowLeft: () => ir(indice - 1),
      ArrowUp: () => ir(indice - 1),
      Home: () => ir(0),
      End: () => ir(opciones.length - 1),
    }
    const accion = acciones[evento.key]
    if (!accion) return
    evento.preventDefault()
    accion()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted p-1',
        className,
      )}
      {...props}
    >
      {opciones.map((opcion, indice) => {
        const activa = indice === elegido
        const enfocable = activa || (elegido === -1 && indice === 0)
        return (
          <button
            key={String(opcion.valor)}
            ref={(el) => {
              botones.current[indice] = el
            }}
            type="button"
            role="radio"
            aria-checked={activa}
            tabIndex={enfocable ? 0 : -1}
            onClick={() => onCambio?.(opcion.valor)}
            onKeyDown={(e) => alTeclear(e, indice)}
            className={cn(
              'h-8 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              activa
                ? 'bg-background text-foreground shadow-sm dark:bg-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opcion.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
