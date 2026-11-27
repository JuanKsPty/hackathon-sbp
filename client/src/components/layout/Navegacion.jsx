import { DownloadIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useInstalarApp } from '@/hooks/useInstalarApp'
import { cn } from '@/lib/utils'
import { NOMBRE_APP, seccionesVisibles } from './navegacion.js'
import { SesionUsuario } from './SesionUsuario.jsx'

// Menú de secciones. Se usa en la barra lateral (escritorio) y dentro del Sheet (móvil).
// Solo muestra las secciones que el perfil puede usar (opciones de GET /api/perfil).
// `conSesion`: en el sitio interno añade el usuario y Salir bajo las secciones, solo por debajo de
// 640 px (desde ahí lo muestra el encabezado). Abajo muestra "Instalar app" cuando el navegador permite
// instalarla (#8).
export function Navegacion({ alNavegar, conSesion = false }) {
  const { disponible, instalar } = useInstalarApp()
  const { puede } = usePerfil()
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-sidebar px-3 py-5 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-2">
        <img src="/marca/logo.svg" alt="" className="size-9 shrink-0" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-sidebar-primary">{NOMBRE_APP}</p>
          <p className="text-xs">AT03 sintético · 12 bancos</p>
        </div>
      </div>
      <nav aria-label="Secciones">
        <ul className="flex flex-col gap-1">
          {seccionesVisibles(puede).map(({ ruta, nombre, icono: Icono, guia }) => (
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
      {__INTERNO__ && conSesion && <SesionUsuario variante="lista" className="sm:hidden" />}
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
