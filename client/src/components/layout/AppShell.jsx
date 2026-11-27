import { Outlet } from 'react-router'
import { BarraFuente } from './BarraFuente.jsx'
import { Encabezado } from './Encabezado.jsx'
import { Navegacion } from './Navegacion.jsx'
import { useControlPeriodo } from './SelectorPeriodo.jsx'
import { AgenteFlotante } from '@/agente/AgenteFlotante.jsx'
import { BotonAgente } from '@/agente/BotonAgente.jsx'

// Estructura de todas las páginas: barra lateral (>= 1024 px), encabezado fijo arriba y, al pie, la
// fuente, el período y el aviso (BarraFuente).
export function AppShell() {
  // El agente puede elegir el período desde cualquier página y tamaño de pantalla (#125).
  useControlPeriodo()
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-svh">
          <Navegacion />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30">
          <Encabezado />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
        <BarraFuente />
      </div>
      {/* Chat del agente (#119) encima de la pantalla actual; se abre con el botón flotante. */}
      <AgenteFlotante />
      <BotonAgente />
    </div>
  )
}
