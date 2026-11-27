import { Link } from 'react-router'
import { ArrowRightIcon, ArrowUpIcon, CrownIcon, MinusIcon, SparklesIcon } from 'lucide-react'
import { Etiqueta, SeccionGris, TituloDosTonos } from '@/components/marca'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { lideresDelCorte } from './datosLanding.js'
import { ordinal } from './formatoLanding.js'

// Líder (posición 1) de cada uno de los 6 rankings: banco, saldo, ponderación y de qué posición
// viene frente al corte anterior. Todo sale de GET /api/rankings de los dos períodos (R2).
export function LideresDelCorte({ datos }) {
  const { periodo, anterior, lideres } = datos
  const lista = lideres.datos ? lideresDelCorte(lideres.datos.rankingsActual, lideres.datos.rankingsAnterior) : []

  return (
    <SeccionGris role="region" aria-labelledby="titulo-lideres" className="flex flex-col gap-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <Etiqueta icono={CrownIcon}>Primer lugar por saldo</Etiqueta>
          <TituloDosTonos
            id="titulo-lideres"
            fuerte="Líder de cada ranking"
            suave={periodo ? `al ${formatearPeriodo(periodo)}` : 'del período'}
          />
        </div>
        <Link to="/rankings" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Todos los rankings
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
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
                className="flex min-w-0 flex-col gap-3 rounded-tarjeta bg-card p-5 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 animate-aparecer dark:shadow-none dark:ring-border"
              >
                <Badge variant="marca" size="pildora" className="w-fit">
                  {ranking}
                </Badge>
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
    </SeccionGris>
  )
}

// Cómo llegó el líder: sigue, sube desde otra posición o es nuevo en el ranking.
function CambioLider({ antes, anterior }) {
  const { posicionAnterior, liderAnterior } = antes
  const corte = formatearPeriodo(anterior)
  let Icono = MinusIcon
  let texto = `Sigue líder desde el ${corte}`
  let variante = 'igual'
  if (posicionAnterior === null) {
    Icono = SparklesIcon
    texto = 'Nuevo en el ranking'
    variante = 'destacado'
  } else if (posicionAnterior !== 1) {
    Icono = ArrowUpIcon
    texto = `Sube desde el ${ordinal(posicionAnterior)}`
    variante = 'sube'
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <Badge variant={variante} className="cifra">
        <Icono aria-hidden="true" />
        {texto}
      </Badge>
      {liderAnterior && <span className="text-muted-foreground">Antes lideraba {liderAnterior}</span>}
    </span>
  )
}
