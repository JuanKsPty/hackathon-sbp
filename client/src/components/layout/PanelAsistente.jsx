import { useState } from 'react'
import { Link } from 'react-router'
import { BotIcon, ExternalLinkIcon } from 'lucide-react'
import { ChatAsistente } from '@/components/asistente/ChatAsistente.jsx'
import { GraficosAsistente } from '@/components/asistente/GraficosAsistente.jsx'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useGuia } from '@/guia/GuiaContext.jsx'

// Asistente IA en un panel lateral, disponible desde cualquier página (#62).
// La conversación es la misma de la página /asistente (conversacion.js). Debajo del chat aparecen
// los gráficos de la última pregunta (#108).
export function PanelAsistente() {
  const [abierto, setAbierto] = useState(false)
  const { estado } = useGuia()
  const [guiaAntes, setGuiaAntes] = useState(estado.activa)

  // Cursor guía (#72): al empezar una guía se cierra el panel para no tapar el elemento señalado.
  // Se ajusta durante el render (no en un efecto) al ver que la guía cambió.
  if (estado.activa !== guiaAntes) {
    setGuiaAntes(estado.activa)
    if (estado.activa) setAbierto(false)
  }

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Abrir asistente IA" data-guia="global.abrir-asistente">
          <BotIcon aria-hidden="true" />
          <span className="hidden 2xl:inline">Asistente</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Asistente IA</SheetTitle>
          <SheetDescription>Pregunta por los rankings en lenguaje natural. No calcula: cada cifra sale del motor.</SheetDescription>
          <Link
            to="/asistente"
            onClick={() => setAbierto(false)}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir página completa
            <ExternalLinkIcon className="size-3" aria-hidden="true" />
          </Link>
        </SheetHeader>
        {/* El chat llena el alto del panel (sin tarjeta). Si la última pregunta trae gráficos (#108), van
            debajo: el chat conserva un alto mínimo y el panel se desplaza hasta ellos. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <ChatAsistente enPanel className="min-h-[28rem]" />
          <GraficosAsistente />
        </div>
      </SheetContent>
    </Sheet>
  )
}
