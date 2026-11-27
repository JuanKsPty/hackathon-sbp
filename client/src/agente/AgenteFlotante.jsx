// Chat del agente (#119) encima de la pantalla, sin cambiar de página y sin bloquearla (se puede
// seguir usando el dashboard). Se abre y se minimiza con el botón flotante (BotonAgente) o tocando
// afuera, y aparece justo encima de él, abajo a la derecha.
// Es la misma conversación que la página /asistente (conversacion.js). Debajo del chat van los
// gráficos de la última pregunta (#108).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ExternalLinkIcon, MinusIcon, Trash2Icon } from 'lucide-react'
import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { borrarConversacion, useConversacion } from '@/components/asistente/conversacion.js'
import { GraficosAsistente } from '@/components/asistente/GraficosAsistente.jsx'
import { Button } from '@/components/ui/button'
import { useGuia } from '@/guia/GuiaContext.jsx'
import { useAgente } from './AgenteContext.jsx'

export function AgenteFlotante() {
  const { abierto, cerrar, boton } = useAgente()
  const panel = useRef(null)
  const { estado } = useGuia()
  const { mensajes } = useConversacion()
  const [guiaAntes, setGuiaAntes] = useState(estado.activa)

  // Al empezar una guía o demostración, el chat se minimiza para no tapar la pantalla.
  if (estado.activa !== guiaAntes) {
    setGuiaAntes(estado.activa)
    if (estado.activa) cerrar()
  }

  // Tocar afuera del chat lo minimiza. No cuentan el botón flotante (ya lo abre y lo cierra), la
  // capa de la guía ni lo que se abre en un portal desde el chat (listas, menús, ventanas).
  useEffect(() => {
    if (!abierto) return undefined
    const alTocar = (e) => {
      const destino = e.target
      if (!(destino instanceof Element) || !destino.isConnected) return
      if (panel.current?.contains(destino) || boton.current?.contains(destino)) return
      if (destino.closest('[data-guia-capa], [data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"]')) return
      cerrar()
    }
    document.addEventListener('pointerdown', alTocar)
    return () => document.removeEventListener('pointerdown', alTocar)
  }, [abierto, cerrar, boton])

  if (!abierto) return null

  return (
    <section
      id="agente-flotante"
      ref={panel}
      aria-label="Asistente IA"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cerrar()
      }}
      className="fixed right-4 bottom-[7.25rem] z-40 flex h-[min(520px,calc(100svh-8.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-sm font-semibold">Asistente IA</p>
        <div className="flex items-center gap-1">
          {mensajes.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={borrarConversacion} aria-label="Borrar la conversación" title="Borrar la conversación">
              <Trash2Icon aria-hidden="true" />
            </Button>
          )}
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
      {/* Tamaño fijo y un solo scroll: el de la lista de mensajes, que lleva los gráficos al final. */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <ChatAsistente enPanel pie={<GraficosAsistente />} />
      </div>
    </section>
  )
}
