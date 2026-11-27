// Capa visual de la demostración (#123): cursor naranja que se desliza entre los elementos, onda
// al "tocar" y globo con el texto del paso. Aparece y desaparece con animación (tw-animate-css).
// Aspecto provisional hasta el diseño final de @JuanKsPty; el recorrido está en DemostracionContext.
import { CursorGuia } from '@/guia/CursorGuia.jsx'
import { useDemostracion } from './DemostracionContext.jsx'

const ANCHO_GLOBO = 260

export function CapaDemostracion() {
  const { estado } = useDemostracion()
  if (!estado.visible || !estado.pos) return null
  const { pos, fase, texto } = estado

  const saliendo = fase === 'saliendo'
  const animacion = fase === 'entrando' ? 'animate-in fade-in zoom-in-50 duration-300' : saliendo ? 'animate-out fade-out zoom-out-50 duration-500 fill-mode-forwards' : ''
  // Globo abajo a la derecha del cursor, sin salirse de la pantalla.
  const globo = {
    top: Math.min(pos.top + 28, window.innerHeight - 96),
    left: Math.min(Math.max(pos.left + 12, 8), window.innerWidth - ANCHO_GLOBO - 8),
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50" data-demostracion="" aria-live="polite">
      {fase === 'tocando' && (
        <span
          aria-hidden="true"
          className="absolute size-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-agente/50"
          style={{ top: pos.top, left: pos.left }}
        />
      )}
      <div className={animacion} style={{ transformOrigin: `${pos.left}px ${pos.top}px` }}>
        <CursorGuia
          top={pos.top}
          left={pos.left}
          className="transition-all duration-700 ease-in-out motion-reduce:transition-none"
        />
      </div>
      {texto && !saliendo && (
        <p
          role="status"
          className="absolute rounded-lg border border-agente/40 bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg transition-all duration-700 ease-in-out motion-reduce:transition-none"
          style={{ ...globo, width: ANCHO_GLOBO }}
        >
          {texto}
        </p>
      )}
    </div>
  )
}
