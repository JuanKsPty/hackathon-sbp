import { useState } from 'react'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Navegacion } from './Navegacion.jsx'
import { NOMBRE_APP } from './navegacion.js'

// Encabezado del celular y la tablet (< 1024 px): logo y botón del menú. En escritorio no se muestra,
// porque el menú lateral ya está a la vista. El agente es un botón flotante abajo a la derecha
// (BotonAgente). El perfil o la sesión y el tema están al pie del menú lateral (PerfilLateral), y el
// período junto al título de Panel, Rankings y Calidad (PeriodoDePagina).
export function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <MenuIcon aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Secciones de la app y perfil</SheetDescription>
          <Navegacion alNavegar={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>

      <img src="/marca/logo.svg" alt="" className="size-7 shrink-0 rounded" />
      <p className="hidden truncate font-semibold sm:block">{NOMBRE_APP}</p>
    </div>
  )
}
