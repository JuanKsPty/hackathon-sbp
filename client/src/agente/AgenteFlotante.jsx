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
      <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Asistente IA</p>
          <p className="text-xs text-muted-foreground">Pregunta en lenguaje natural. No calcula: cada cifra sale del motor.</p>
          <Link
            to="/asistente"
            onClick={cerrar}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir página completa
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </Link>
        </div>
        <Button variant="ghost" size="icon" onClick={cerrar} aria-label="Minimizar el asistente">
          <MinusIcon aria-hidden="true" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <ChatAsistente enPanel className="min-h-[24rem]" />
        <GraficosAsistente />
      </div>
    </section>
  )
}
