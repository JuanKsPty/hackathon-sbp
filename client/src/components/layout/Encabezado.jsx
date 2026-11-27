import { useState } from 'react'
import { MenuIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { cn } from '@/lib/utils'
import { BotonOtroSitio } from './BotonOtroSitio.jsx'
import { Navegacion } from './Navegacion.jsx'
import { seccionesVisibles } from './navegacion.js'
import { MARCA, nombreCorto } from './nombres.js'
import { PanelAsistente } from './PanelAsistente.jsx'
import { SelectorPeriodo } from './SelectorPeriodo.jsx'
import { SesionUsuario } from './SesionUsuario.jsx'
import { SelectorTema } from './SelectorTema.jsx'

// Navegación superior (#138): secciones a la izquierda, "RADAR SBP" al centro y, a la derecha,
// asistente, sesión (interno), período, tema y la píldora hacia el otro sitio.
// - Desde 1280 px las secciones van en línea. Por debajo, en un menú (Sheet) con la misma lista.
// - Por debajo de 768 px la sesión y el otro sitio van dentro del menú; por debajo de 640 px,
//   también el nombre. Cada control se monta una sola vez (los del agente usan data-guia).
export function Encabezado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { puede } = usePerfil()

  return (
    <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
      <div className="flex min-w-0 items-center gap-1">
        <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Abrir menú">
              <MenuIcon aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <SheetDescription className="sr-only">Secciones de la app</SheetDescription>
            <Navegacion alNavegar={() => setMenuAbierto(false)} conSesion />
          </SheetContent>
        </Sheet>

        <nav aria-label="Secciones" className="hidden min-w-0 xl:block">
          <ul className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
            {seccionesVisibles(puede).map((seccion) => (
              <li key={seccion.ruta}>
                <NavLink
                  to={seccion.ruta}
                  data-guia={seccion.guia}
                  end={seccion.ruta === '/'}
                  title={seccion.nombre}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-8 items-center rounded-full px-2.5 text-sm whitespace-nowrap outline-none transition-colors',
                      'text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                      isActive && 'bg-muted font-medium text-foreground',
                    )
                  }
                >
                  {nombreCorto(seccion)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Link
        to="/"
        className="hidden rounded-full px-2 text-sm font-semibold tracking-[0.22em] whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:block"
        aria-label={`${MARCA}, ir al inicio`}
      >
        {MARCA}
      </Link>

      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
        <PanelAsistente />
        {__INTERNO__ && <SesionUsuario className="hidden lg:inline-flex" />}
        <SelectorPeriodo className="min-w-32 sm:min-w-36" />
        <SelectorTema />
        <BotonOtroSitio className="hidden md:inline-flex" />
      </div>
    </div>
  )
}
