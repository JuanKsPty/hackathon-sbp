// Cursor del agente guía (#72): triángulo naranja con la base en arco hacia adentro, borde blanco
// (se ve en tema claro y oscuro) y un brillo naranja suave. La punta está en (4, 3) del viewBox:
// el componente se desplaza para que la punta caiga justo en `top`/`left`.
import { useId } from 'react'

const TAMANO = 32
const PUNTA = { x: 4, y: 3 }

export function CursorGuia({ top, left, className, style }) {
  const filtro = `brillo-cursor-${useId().replaceAll(':', '')}`
  return (
    <svg
      aria-hidden="true"
      width={TAMANO}
      height={TAMANO}
      viewBox="0 0 32 32"
      className={className}
      style={{ position: 'absolute', top: top - PUNTA.y, left: left - PUNTA.x, overflow: 'visible', ...style }}
    >
      <defs>
        <filter id={filtro} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="difuso" />
          <feFlood style={{ floodColor: 'var(--agente)' }} floodOpacity="0.75" />
          <feComposite in2="difuso" operator="in" result="brillo" />
          <feMerge>
            <feMergeNode in="brillo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M4 3 L27 15.5 Q17.5 17.5 13.5 27.5 Z"
        style={{ fill: 'var(--agente)' }}
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
        filter={`url(#${filtro})`}
      />
    </svg>
  )
}
