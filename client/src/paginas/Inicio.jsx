import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { CasosDeUso } from '@/components/inicio/CasosDeUso.jsx'
import { PortadaPublica } from '@/components/inicio/PortadaPublica.jsx'
import { BarraFuente } from '@/components/layout/BarraFuente.jsx'
import { NOMBRE_APP, RUTA_PANEL_PUBLICO } from '@/components/layout/navegacion.js'
import { Button } from '@/components/ui/button'

// Landing del sitio público (ruta /): página propia, a pantalla completa y sin el menú de la app.
// Presenta el proyecto y lleva a los datos con "Ver los datos" (el Panel, /panel) o directo a la
// sección que responde cada pregunta (CasosDeUso). Fuente, período y aviso de datos ficticios van en
// el pie fijo (BarraFuente), como en el resto de las pantallas (lámina 9).
export default function Inicio() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 lg:px-6">
          <img src="/marca/logo.svg" alt="Superintendencia de Bancos de Panamá" className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold text-primary sm:text-base">{NOMBRE_APP}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Hackathon SBP 2026</p>
          </div>
          <nav aria-label="Ir a la app" className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/rankings">Rankings</Link>
            </Button>
            <Button asChild size="sm">
              <Link to={RUTA_PANEL_PUBLICO}>
                Ver los datos
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:gap-12 lg:px-6 lg:py-12">
        <PortadaPublica />
        <CasosDeUso />
        <section
          aria-label="Ver los datos"
          className="flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Todos los datos del período, en un solo lugar</h2>
            <p className="text-sm text-muted-foreground">
              El Panel resume la cartera, los líderes de cada ranking, la calidad del archivo y los indicadores
              adicionales. Desde ahí vas a Rankings, Reportes, Calidad y la Verificación.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to={RUTA_PANEL_PUBLICO}>
              Ver los datos
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <BarraFuente />
    </div>
  )
}
