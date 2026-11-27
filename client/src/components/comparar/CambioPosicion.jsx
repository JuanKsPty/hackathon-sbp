import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react'

// Cómo se muestra cada tendencia de posición: icono, color (tokens sube/baja/igual) y texto,
// para que no dependa solo del color.
const TENDENCIAS = {
  sube: { Icono: ArrowUpIcon, clase: 'text-sube', texto: 'Sube' },
  baja: { Icono: ArrowDownIcon, clase: 'text-baja', texto: 'Baja' },
  igual: { Icono: MinusIcon, clase: 'text-igual', texto: 'Se mantiene' },
  sin_dato: { Icono: MinusIcon, clase: 'text-muted-foreground', texto: 'Sin dato' },
}

// Cambio_Posicion de un movimiento: "Sube 2", "Baja 1" o "Se mantiene". `cantidad` es el valor que
// manda el API (se muestra sin signo).
export function CambioPosicion({ tendencia, cantidad }) {
  const { Icono, clase, texto } = TENDENCIAS[tendencia] ?? TENDENCIAS.sin_dato
  const conCantidad = (tendencia === 'sube' || tendencia === 'baja') && typeof cantidad === 'number'
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${clase}`}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
      {conCantidad && <span className="cifra">{Math.abs(cantidad)}</span>}
    </span>
  )
}

// Solo el icono, con texto para lectores de pantalla (lo usa la comparación de bancos).
export function IconoTendencia({ tendencia }) {
  const { Icono, clase, texto } = TENDENCIAS[tendencia] ?? TENDENCIAS.sin_dato
  return (
    <span className={`inline-flex ${clase}`} title={texto}>
      <Icono className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{texto}</span>
    </span>
  )
}
