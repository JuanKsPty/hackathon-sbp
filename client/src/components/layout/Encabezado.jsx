import { useState } from 'react'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Navegacion } from './Navegacion.jsx'
import { NOMBRE_APP } from './navegacion.js'
import { PanelAsistente } from './PanelAsistente.jsx'
import { SelectorPeriodo } from './SelectorPeriodo.jsx'
import { SesionUsuario } from './SesionUsuario.jsx'
import { SelectorTema } from './SelectorTema.jsx'

export function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
      {/* Menú en móvil: el mismo de la barra lateral dentro de un Sheet. Por debajo de 640 px el
          encabezado no tiene sitio para la sesión (sitio interno) y va dentro del menú. */}
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <MenuIcon aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Secciones de la app</SheetDescription>
          <Navegacion alNavegar={() => setMenuAbierto(false)} conSesion />
        </SheetContent>
      </Sheet>

      <img src="/marca/logo.svg" alt="" className="size-7 shrink-0 lg:hidden" />
      <p className="hidden truncate font-semibold sm:block lg:hidden">{NOMBRE_APP}</p>

      <div className="ml-auto flex items-center gap-2">
        <PanelAsistente />
        {__INTERNO__ && <SesionUsuario className="hidden sm:inline-flex" />}
        <SelectorPeriodo />
        <SelectorTema />
      </div>
    </div>
  )
}
