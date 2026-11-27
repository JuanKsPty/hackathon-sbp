import { NavLink } from 'react-router'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { cn } from '@/lib/utils'
import { NOMBRE_APP, seccionesVisibles } from './navegacion.js'
import { PerfilLateral } from './PerfilLateral.jsx'

// Menú lateral. Se usa en la barra lateral (escritorio) y dentro del Sheet (móvil).
// - Arriba: el emblema de la SBP y el nombre de la app.
// - En medio: las secciones que el perfil puede usar (opciones de GET /api/perfil).
// - Al pie: el bloque de perfil con el período de los datos, la sesión y el tema (PerfilLateral).
export function Navegacion({ alNavegar }) {
  const { puede } = usePerfil()
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-sidebar px-3 py-5 text-sidebar-foreground">
      <div className="flex items-center gap-3 px-2">
        <img src="/marca/logo.svg" alt="Superintendencia de Bancos de Panamá" className="size-10 shrink-0 rounded-md" />
        <div className="min-w-0">
          <p className="text-base leading-tight font-semibold text-sidebar-primary">{NOMBRE_APP}</p>
          <p className="text-xs opacity-80">Hackathon SBP 2026</p>
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
                    'hover:bg-muted hover:text-sidebar-foreground',
                    'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    // Ítem activo: fondo azul claro y una marca a la izquierda para ver "estás aquí".
                    isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]',
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
      <PerfilLateral className="mt-auto" />
    </div>
  )
}
