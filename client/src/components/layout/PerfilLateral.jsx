import { cn } from '@/lib/utils'
import { SelectorPeriodo } from './SelectorPeriodo.jsx'
import { SelectorTema } from './SelectorTema.jsx'
import { SesionUsuario } from './SesionUsuario.jsx'

// Bloque de perfil al pie del menú lateral: reúne lo que antes estaba en el encabezado (período de
// los datos, perfil o sesión y tema). El encabezado queda solo para el agente.
// En el celular está dentro del menú (Sheet), igual que las secciones.
export function PerfilLateral({ className }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2', className)}>
      <div className="flex flex-col gap-1.5 px-1 pt-1">
        <label htmlFor="selector-periodo-lateral" className="text-xs font-medium tracking-wide uppercase opacity-80">
          Período de los datos
        </label>
        <SelectorPeriodo id="selector-periodo-lateral" className="w-full bg-background text-foreground" />
      </div>
      <div className="flex items-center gap-1 border-t border-sidebar-border pt-2">
        <SesionUsuario />
        <SelectorTema className="shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      </div>
    </div>
  )
}
