// Presentación de la app (/presentacion, sitio público): láminas a pantalla completa, sin el
// AppShell. Usa el estilo SBP (paleta E+) con los componentes de marca/, igual que el Inicio público
// (client/DISENO.md).
// Las cifras salen del API en vivo (components/presentacion/useDatosPresentacion.js).
//
// Navegación: flechas, Av Pág / Re Pág, espacio, Inicio y Fin; F pone pantalla completa; en el
// celular se desliza. La lámina actual queda en la URL (?lamina=3) para poder recargar o compartirla.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ChevronLeftIcon, ChevronRightIcon, HouseIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { useFuente } from '@/api/fuente.js'
import { SelectorTema } from '@/components/layout/SelectorTema.jsx'
import { LAMINAS } from '@/components/presentacion/indice.js'
import { ALTO_LIENZO, ANCHO_LIENZO } from '@/components/presentacion/piezas.jsx'
import { useDatosPresentacion } from '@/components/presentacion/useDatosPresentacion.js'
import { Button } from '@/components/ui/button'
import { formatearPeriodo } from '@/lib/formato.js'

const TOTAL = LAMINAS.length
const limitar = (n) => Math.min(TOTAL - 1, Math.max(0, n))

// Escala que hace caber el lienzo de 1600 × 900 en el contenedor, sin deformarlo.
function useEscala(ref) {
  const [escala, setEscala] = useState(1)
  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return undefined
    const medir = () => {
      const { width, height } = nodo.getBoundingClientRect()
      setEscala(Math.min(width / ANCHO_LIENZO, height / ALTO_LIENZO))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [ref])
  return escala
}

function usePantallaCompleta() {
  const [activa, setActiva] = useState(() => Boolean(document.fullscreenElement))
  useEffect(() => {
    const alCambiar = () => setActiva(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])
  const alternar = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])
  return { activa, alternar }
}

export default function Presentacion() {
  const [params, setParams] = useSearchParams()
  const indice = limitar((Number.parseInt(params.get('lamina') ?? '1', 10) || 1) - 1)
  const ir = useCallback(
    (n) => setParams({ lamina: String(limitar(n) + 1) }, { replace: true }),
    [setParams],
  )

  const datos = useDatosPresentacion()
  const { fuente, aviso } = useFuente()
  const contenedor = useRef(null)
  const escala = useEscala(contenedor)
  const pantalla = usePantallaCompleta()

  useEffect(() => {
    const anterior = document.title
    document.title = `${LAMINAS[indice].titulo} · Presentación · Rankings de Crédito`
    return () => {
      document.title = anterior
    }
  }, [indice])

  // Teclado: se ignora si hay un modificador o si el foco está en un campo de texto.
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const acciones = {
        ArrowRight: () => ir(indice + 1),
        ArrowDown: () => ir(indice + 1),
        PageDown: () => ir(indice + 1),
        ' ': () => ir(indice + 1),
        ArrowLeft: () => ir(indice - 1),
        ArrowUp: () => ir(indice - 1),
        PageUp: () => ir(indice - 1),
        Home: () => ir(0),
        End: () => ir(TOTAL - 1),
        f: pantalla.alternar,
        F: pantalla.alternar,
      }
      const accion = acciones[e.key]
      if (!accion) return
      // Espacio sobre un botón o enlace: que haga su clic, no que pase de lámina.
      if (e.key === ' ' && e.target.closest?.('button, a')) return
      e.preventDefault()
      accion()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [indice, ir, pantalla.alternar])

  // Deslizar en pantallas táctiles.
  const inicioToque = useRef(null)
  const alEmpezarToque = (e) => {
    const t = e.touches[0]
    inicioToque.current = { x: t.clientX, y: t.clientY }
  }
  const alTerminarToque = (e) => {
    const inicio = inicioToque.current
    inicioToque.current = null
    if (!inicio) return
    const t = e.changedTouches[0]
    const dx = t.clientX - inicio.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - inicio.y)) ir(indice + (dx < 0 ? 1 : -1))
  }

  const { Componente, titulo } = LAMINAS[indice]

  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-seccion"
      onTouchStart={alEmpezarToque}
      onTouchEnd={alTerminarToque}
    >
      <h1 className="sr-only">Presentación de Rankings de Crédito</h1>

      <div ref={contenedor} className="relative min-h-0 flex-1">
        <section
          aria-roledescription="lámina"
          aria-label={`${indice + 1} de ${TOTAL}: ${titulo}`}
          className="absolute top-1/2 left-1/2 flex flex-col overflow-hidden bg-background text-foreground shadow-tarjeta"
          style={{
            width: ANCHO_LIENZO,
            height: ALTO_LIENZO,
            transform: `translate(-50%, -50%) scale(${escala})`,
          }}
        >
          {/* Avance de la presentación. */}
          <div className="h-1.5 w-full bg-muted" aria-hidden="true">
            <div className="h-full bg-marca transition-[width] duration-300" style={{ width: `${((indice + 1) / TOTAL) * 100}%` }} />
          </div>

          <div key={indice} className="min-h-0 flex-1 animate-aparecer">
            <Componente datos={datos} />
          </div>

          {/* Fuente, período y aviso en todas las láminas (lámina 9 del reto). */}
          <footer className="flex h-16 shrink-0 items-center justify-between gap-6 px-[72px] text-base text-muted-foreground">
            <p className="flex items-center gap-3 truncate">
              <span className="rounded-full bg-aviso-fondo px-3 py-1 font-medium text-aviso">{aviso}</span>
              <span className="truncate">
                Fuente: {fuente}
                {datos.ultimo ? ` · Período: ${formatearPeriodo(datos.ultimo)}` : ''}
              </span>
            </p>
            <p className="cifra shrink-0">
              {indice + 1} / {TOTAL}
            </p>
          </footer>
        </section>
      </div>

      {/* Controles fuera del lienzo: no se escalan y no tapan la lámina. */}
      <nav aria-label="Controles de la presentación" className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <HouseIcon aria-hidden="true" className="size-4" />
          Ir al inicio
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => ir(indice - 1)} disabled={indice === 0} aria-label="Lámina anterior">
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <span className="cifra min-w-16 text-center text-sm text-muted-foreground" aria-live="polite">
            {indice + 1} / {TOTAL}
          </span>
          <Button variant="outline" size="icon" onClick={() => ir(indice + 1)} disabled={indice === TOTAL - 1} aria-label="Lámina siguiente">
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <SelectorTema />
          <Button
            variant="ghost"
            size="icon"
            onClick={pantalla.alternar}
            aria-label={pantalla.activa ? 'Salir de pantalla completa' : 'Pantalla completa (F)'}
          >
            {pantalla.activa ? <MinimizeIcon aria-hidden="true" /> : <MaximizeIcon aria-hidden="true" />}
          </Button>
        </div>
      </nav>
    </main>
  )
}
