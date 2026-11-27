import { Outlet } from 'react-router'
import { BarraFuente } from './BarraFuente.jsx'
import { Encabezado } from './Encabezado.jsx'
import { Navegacion } from './Navegacion.jsx'
import { useControlPeriodo } from './SelectorPeriodo.jsx'
import { AgenteFlotante } from '@/agente/AgenteFlotante.jsx'

// Estructura de todas las páginas: barra lateral (>= 1024 px), encabezado y barra de fuente fijos arriba.
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
          <BarraFuente />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      {/* Chat del agente (#119) encima de la pantalla actual; se abre desde el encabezado. */}
      <AgenteFlotante />
    </div>
  )
}
