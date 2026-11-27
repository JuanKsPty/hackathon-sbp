// Agente flotante (#119): botón abajo a la derecha que abre el chat del asistente encima de la
// pantalla, sin cambiar de página y sin bloquearla (se puede seguir usando el dashboard).
// Es la misma conversación que el panel lateral y la página /asistente (conversacion.js).
// Aspecto provisional: el diseño final lo define @JuanKsPty; la lógica no depende de él.
import { useState } from 'react'
import { Link } from 'react-router'
import { BotIcon, ExternalLinkIcon, MinusIcon } from 'lucide-react'
import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { Button } from '@/components/ui/button'
import { useGuia } from '@/guia/GuiaContext.jsx'
import { useAgente } from './AgenteContext.jsx'

export function AgenteFlotante() {
  const { abierto, cerrar, alternar, boton } = useAgente()
  const { estado } = useGuia()
  const [guiaAntes, setGuiaAntes] = useState(estado.activa)

  // Al empezar una guía o demostración, el chat se minimiza para no tapar la pantalla.
  if (estado.activa !== guiaAntes) {
    setGuiaAntes(estado.activa)
    if (estado.activa) cerrar()
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {abierto && (
        <section
          aria-label="Asistente IA"
          className="flex h-[min(620px,calc(100svh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
            <p className="text-sm font-semibold">Asistente IA</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link to="/asistente" onClick={cerrar} aria-label="Abrir en página completa" title="Abrir en página completa">
                  <ExternalLinkIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={cerrar} aria-label="Minimizar el asistente" title="Minimizar">
                <MinusIcon aria-hidden="true" />
              </Button>
            </div>
          </header>
          {/* Tamaño fijo: el chat ocupa el alto del panel y solo su lista de mensajes hace scroll. */}
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <ChatAsistente enPanel />
          </div>
        </section>
      )}
      <Button
        ref={boton}
        size="icon"
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={abierto ? 'Minimizar el asistente' : 'Abrir el asistente IA'}
        data-guia="global.abrir-asistente"
        className="size-12 rounded-full shadow-lg"
      >
        <BotIcon className="size-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
