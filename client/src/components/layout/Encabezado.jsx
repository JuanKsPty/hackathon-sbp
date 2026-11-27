import { useState } from 'react'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { IndicadorPerfil } from './IndicadorPerfil.jsx'
import { Navegacion } from './Navegacion.jsx'
import { NOMBRE_APP } from './navegacion.js'
import { SelectorPeriodo } from './SelectorPeriodo.jsx'
import { SelectorTema } from './SelectorTema.jsx'

export function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
      {/* Menú en móvil: el mismo de la barra lateral dentro de un Sheet. */}
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <MenuIcon aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Secciones de la app</SheetDescription>
          <Navegacion alNavegar={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>

      <p className="truncate font-semibold lg:hidden">{NOMBRE_APP}</p>

      <div className="ml-auto flex items-center gap-2">
        <IndicadorPerfil />
        <SelectorPeriodo />
        <SelectorTema />
      </div>
    </div>
  )
}
