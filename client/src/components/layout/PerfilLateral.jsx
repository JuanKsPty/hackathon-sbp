import { cn } from '@/lib/utils'
import { SelectorTema } from './SelectorTema.jsx'
import { SesionUsuario } from './SesionUsuario.jsx'

// Bloque de perfil al pie del menú lateral: el perfil o la sesión (con Salir) y el tema. El
// encabezado queda solo para el agente, y el período de los datos va junto al título de Panel,
// Rankings y Calidad (PeriodoDePagina). En el celular está dentro del menú (Sheet).
export function PerfilLateral({ className }) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-1.5', className)}>
      <SesionUsuario />
      <SelectorTema className="shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
    </div>
  )
}
