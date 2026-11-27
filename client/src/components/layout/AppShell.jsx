import { Outlet } from 'react-router'
import { BarraFuente } from './BarraFuente.jsx'
import { Encabezado } from './Encabezado.jsx'
import { AgenteFlotante } from '@/agente/AgenteFlotante.jsx'

// Estructura de todas las páginas (#138): navegación superior y barra de fuente fijas arriba, sin
// barra lateral (en pantallas chicas las secciones van en el menú del encabezado).
export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30">
        <Encabezado />
        <BarraFuente />
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>
      {/* Agente flotante abajo a la derecha (#119): chat encima de la pantalla actual. */}
      <AgenteFlotante />
    </div>
  )
}
