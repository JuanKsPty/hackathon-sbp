import { useState } from 'react'
import { MenuIcon } from 'lucide-react'
import { BotonAgente } from '@/agente/BotonAgente.jsx'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Navegacion } from './Navegacion.jsx'
import { NOMBRE_APP } from './navegacion.js'

// Encabezado de todas las páginas. Arriba a la derecha va solo el agente; el período, el perfil o la
// sesión y el tema están al pie del menú lateral (PerfilLateral). En el celular el menú se abre con
// el botón de la izquierda.
export function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <MenuIcon aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Secciones de la app, período de los datos y perfil</SheetDescription>
          <Navegacion alNavegar={() => setMenuAbierto(false)} />
        </SheetContent>
      </Sheet>

      <img src="/marca/logo.svg" alt="" className="size-7 shrink-0 rounded lg:hidden" />
      <p className="hidden truncate font-semibold sm:block lg:hidden">{NOMBRE_APP}</p>

      <div className="ml-auto flex items-center">
        <BotonAgente />
      </div>
    </div>
  )
}
