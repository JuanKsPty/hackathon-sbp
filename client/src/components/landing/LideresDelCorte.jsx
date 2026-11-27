import { Link } from 'react-router'
import { ArrowRightIcon, ArrowUpIcon, CrownIcon, MinusIcon, SparklesIcon } from 'lucide-react'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { cn } from '@/lib/utils'
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { lideresDelCorte } from './datosLanding.js'
import { ordinal } from './formatoLanding.js'

// Líder (posición 1) de cada uno de los 6 rankings: banco, saldo, ponderación y de qué posición
// viene frente al corte anterior. Todo sale de GET /api/rankings de los dos períodos (R2).
export function LideresDelCorte({ datos }) {
  const { periodo, anterior, lideres } = datos
  const lista = lideres.datos ? lideresDelCorte(lideres.datos.rankingsActual, lideres.datos.rankingsAnterior) : []

  return (
    <section aria-labelledby="titulo-lideres" className="flex flex-col gap-5 rounded-3xl bg-muted p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-lideres" className="text-2xl font-medium tracking-tight sm:text-3xl">
          Líder de cada ranking{' '}
          <span className="text-muted-foreground">{periodo ? `al ${formatearPeriodo(periodo)}` : 'del período'}</span>
        </h2>
        <Link to="/rankings" className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-medium hover:bg-accent">
          Todos los rankings
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div data-guia="panel.lideres">
        <EstadoBloque
          consulta={lideres}
          filas={4}
          vacio={lista.length === 0}
          tituloVacio="Sin rankings en este período"
          mensajeVacio="El API no devolvió posiciones para el período elegido."
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map(({ ranking, lider, antes }, i) => (
              <li
                key={ranking}
                style={{ animationDelay: `${i * 60}ms` }}
                className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-5 text-card-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none"
              >
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sube-fondo px-2.5 py-0.5 text-xs font-medium text-sube">
                  <CrownIcon className="size-3.5" aria-hidden="true" />
                  {ranking}
                </span>
                {lider && lider.Operaciones_Validas !== 0 ? (
                  <>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-lg font-medium tracking-tight break-words">{lider.Banco}</span>
                      <span className="cifra text-2xl font-medium tracking-tight">{formatearMonto(lider.Saldo_Actividad)}</span>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="cifra text-muted-foreground">Ponderación {formatearPorcentaje(lider.Ponderacion_Pct)}</span>
                      {anterior && antes && <CambioLider antes={antes} anterior={anterior} />}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin operaciones válidas en este ranking.</span>
                )}
              </li>
            ))}
          </ul>
        </EstadoBloque>
      </div>
    </section>
  )
}

// Cómo llegó el líder: sigue, sube desde otra posición o es nuevo en el ranking.
function CambioLider({ antes, anterior }) {
  const { posicionAnterior, liderAnterior } = antes
  const corte = formatearPeriodo(anterior)
  let Icono = MinusIcon
  let texto = `Sigue líder desde el ${corte}`
  let clase = 'bg-muted text-muted-foreground'
  if (posicionAnterior === null) {
    Icono = SparklesIcon
    texto = 'Nuevo en el ranking'
    clase = 'bg-destacado-fondo text-destacado'
  } else if (posicionAnterior !== 1) {
    Icono = ArrowUpIcon
    texto = `Sube desde el ${ordinal(posicionAnterior)}`
    clase = 'bg-sube-fondo text-sube'
  }
  return (
    <span className={cn('cifra inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', clase)} title={liderAnterior ? `Antes lideraba ${liderAnterior}` : undefined}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
      {liderAnterior && <span className="sr-only">. Antes lideraba {liderAnterior}</span>}
    </span>
  )
}
