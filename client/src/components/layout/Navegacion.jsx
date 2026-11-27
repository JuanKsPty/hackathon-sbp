import { DownloadIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { useInstalarApp } from '@/hooks/useInstalarApp'
import { cn } from '@/lib/utils'
import { NOMBRE_APP, SECCIONES } from './navegacion.js'

// Menú de secciones. Se usa en la barra lateral (escritorio) y dentro del Sheet (móvil).
// Abajo muestra "Instalar app" cuando el navegador permite instalarla (#8).
export function Navegacion({ alNavegar }) {
  const { disponible, instalar } = useInstalarApp()
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar px-3 py-5 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-2">
        <img src="/marca/logo.svg" alt="" className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-sidebar-primary">{NOMBRE_APP}</p>
          <p className="text-xs">AT03 sintético · 12 bancos</p>
        </div>
      </div>
      <nav aria-label="Secciones">
        <ul className="flex flex-col gap-1">
          {SECCIONES.map(({ ruta, nombre, icono: Icono, guia }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                data-guia={guia}
                end={ruta === '/'}
                onClick={alNavegar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm outline-none transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                  )
                }
              >
                <Icono className="size-4 shrink-0" aria-hidden="true" />
                {nombre}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {disponible && (
        <div className="mt-auto">
          <Button
            variant="ghost"
            onClick={instalar}
            className="w-full justify-start gap-3 px-2 font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <DownloadIcon className="size-4 shrink-0" aria-hidden="true" />
            Instalar app
          </Button>
        </div>
      )}
    </div>
  )
}
