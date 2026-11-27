// Capa visual del cursor guía (#72): resalta el elemento del paso y muestra el globo con el texto.
// Es una versión funcional mínima con los componentes y colores del tema; el diseño final lo define
// @JuanKsPty. La lógica está en GuiaContext.jsx y motor.js.
import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import { CursorGuia } from './CursorGuia.jsx'
import { Button } from '@/components/ui/button'
import { useGuia } from './GuiaContext.jsx'
import { posicionGlobo } from './motor.js'

const HOLGURA = 6 // margen del resaltado alrededor del elemento

export function CapaGuia() {
  const { estado, paso, total, siguiente, anterior, terminar } = useGuia()
  const globo = useRef(null)
  const [tamano, setTamano] = useState({ ancho: 288, alto: 140 })

  // Medir el globo cuando cambia su contenido, para ubicarlo sin que se salga de la pantalla.
  useLayoutEffect(() => {
    if (!globo.current) return
    const { width, height } = globo.current.getBoundingClientRect()
    setTamano((previo) =>
      Math.round(width) === previo.ancho && Math.round(height) === previo.alto ? previo : { ancho: Math.round(width), alto: Math.round(height) },
    )
  }, [estado.activa, estado.indice, estado.fase])

  if (!estado.activa || !paso) return null

  const pantalla = { ancho: window.innerWidth, alto: window.innerHeight }
  const { rect, fase, indice } = estado
  const mostrando = fase === 'mostrando' && rect
  const resaltado = mostrando && {
    top: rect.top - HOLGURA,
    left: rect.left - HOLGURA,
    width: rect.width + HOLGURA * 2,
    height: rect.height + HOLGURA * 2,
  }
  // Sin elemento (buscando o no encontrado), el globo va centrado abajo.
  const lugar = mostrando
    ? posicionGlobo(resaltado, pantalla, tamano)
    : { top: pantalla.alto - tamano.alto - 24, left: (pantalla.ancho - tamano.ancho) / 2 }
  const ultimo = indice === total - 1

  return (
    <div className="pointer-events-none fixed inset-0 z-50" data-guia-capa="">
      {resaltado && (
        <>
          <div
            aria-hidden="true"
            className="absolute rounded-lg ring-4 ring-primary/70 transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ ...resaltado, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.35)' }}
          />
          <CursorGuia
            className="transition-all duration-500 ease-out motion-reduce:transition-none"
            top={rect.top + rect.height / 2}
            left={rect.left + Math.min(rect.width / 2, 48)}
          />
        </>
      )}
      <div
        ref={globo}
        role="dialog"
        aria-live="polite"
        aria-label={`Guía, paso ${indice + 1} de ${total}`}
        className="pointer-events-auto absolute w-72 rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ top: lugar.top, left: lugar.left }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Paso {indice + 1} de {total}
          </span>
          <Button variant="ghost" size="icon" className="size-6" onClick={terminar} aria-label="Cerrar la guía">
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        <p className="leading-relaxed">{paso.texto}</p>
        {fase === 'no-encontrado' && (
          <p className="mt-2 text-xs text-muted-foreground">No encuentro este elemento en la pantalla. Puedes seguir con el próximo paso.</p>
        )}
        {(fase === 'navegando' || fase === 'buscando') && <p className="mt-2 text-xs text-muted-foreground">Buscando en la pantalla…</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={anterior} disabled={indice === 0}>
            <ChevronLeftIcon aria-hidden="true" />
            Anterior
          </Button>
          <Button size="sm" onClick={ultimo ? terminar : siguiente}>
            {ultimo ? 'Listo' : 'Siguiente'}
            {!ultimo && <ChevronRightIcon aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
