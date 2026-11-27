// Chat del agente (#119) encima de la pantalla, sin cambiar de página y sin bloquearla (se puede
// seguir usando el dashboard). Se abre y se minimiza con el botón del encabezado (BotonAgente) y
// aparece justo debajo de él, arriba a la derecha.
// Es la misma conversación que la página /asistente (conversacion.js). Debajo del chat van los
// gráficos de la última pregunta (#108).
import { useState } from 'react'
import { Link } from 'react-router'
import { ExternalLinkIcon, MinusIcon } from 'lucide-react'
import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { GraficosAsistente } from '@/components/asistente/GraficosAsistente.jsx'
import { Button } from '@/components/ui/button'
import { useGuia } from '@/guia/GuiaContext.jsx'
import { useAgente } from './AgenteContext.jsx'

export function AgenteFlotante() {
  const { abierto, cerrar } = useAgente()
  const { estado } = useGuia()
  const [guiaAntes, setGuiaAntes] = useState(estado.activa)

  // Al empezar una guía o demostración, el chat se minimiza para no tapar la pantalla.
  if (estado.activa !== guiaAntes) {
    setGuiaAntes(estado.activa)
    if (estado.activa) cerrar()
  }

  if (!abierto) return null

  return (
    <section
      id="agente-flotante"
      aria-label="Asistente IA"
      onKeyDown={(e) => {
        if (e.key === 'Escape') cerrar()
      }}
      className="fixed top-[5.75rem] right-4 z-40 flex h-[min(680px,calc(100svh-6.75rem))] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
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
      {/* Tamaño fijo y un solo scroll: el de la lista de mensajes, que lleva los gráficos al final. */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <ChatAsistente enPanel pie={<GraficosAsistente />} />
      </div>
    </section>
  )
}
