import { Link } from 'react-router'
import { ArrowRightIcon, ArrowUpRightIcon, RadarIcon } from 'lucide-react'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { cn } from '@/lib/utils'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { contarBancos, contarSignificativos } from './datosLanding.js'
import { montoCompacto, variacionCorta, variacionEntre } from './formatoLanding.js'

// Bloque oscuro de la landing (#139): qué es Radar SBP, el período vigente y 4 cifras del corte.
// Saldo y operaciones salen de GET /api/periodos; bancos de GET /api/rankings; los movimientos
// significativos, de comparar los rankings con el corte anterior según la regla vigente.
export function HeroPeriodo({ datos }) {
  const { cargando, error } = usePeriodo()
  const { periodo, anterior, detallePeriodo: p, detalleAnterior: a, rankings, movimientos } = datos

  const frente = anterior ? `vs. ${formatearPeriodo(anterior)}` : null
  const rankingsPeriodo = rankings.datos?.rankings
  const significativos = movimientos.datos?.comparacion ? contarSignificativos(movimientos.datos.comparacion) : null

  const cifras = [
    {
      etiqueta: 'Cartera local válida',
      valor: montoCompacto(p?.Saldo_Total_Valido),
      detalle: p ? `Saldo total ${formatearMonto(p.Saldo_Total_Valido)}` : null,
      variacion: variacionCorta(variacionEntre(p?.Saldo_Total_Valido, a?.Saldo_Total_Valido)),
    },
    {
      etiqueta: 'Operaciones válidas',
      valor: formatearEntero(p?.Universo_Local_Valido),
      detalle: p ? `de ${formatearEntero(p.Filas_Leidas)} filas leídas` : null,
      variacion: variacionCorta(variacionEntre(p?.Universo_Local_Valido, a?.Universo_Local_Valido)),
    },
    {
      etiqueta: 'Bancos',
      valor: rankingsPeriodo ? formatearEntero(contarBancos(rankingsPeriodo)) : '—',
      detalle: rankingsPeriodo
        ? `en ${formatearEntero(rankingsPeriodo.length)} ${rankingsPeriodo.length === 1 ? 'ranking' : 'rankings'} de crédito`
        : null,
    },
    {
      etiqueta: 'Movimientos significativos',
      valor: anterior ? formatearEntero(significativos) : '—',
      detalle: anterior ? `frente al corte del ${formatearPeriodo(anterior)}` : periodo ? 'Primer corte cargado: no hay con qué comparar' : null,
    },
  ]

  return (
    <section
      aria-labelledby="titulo-landing"
      className="relative isolate overflow-hidden rounded-[28px] bg-[#0B0B0C] px-5 py-8 text-white shadow-sm sm:px-10 sm:py-12 animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none"
    >
      {/* Cuadrícula sutil y brillo menta arriba a la izquierda. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-32 -z-10 size-[28rem] rounded-full bg-[#3DDC97]/25 blur-3xl" />

      <div className="flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
          <RadarIcon className="size-3.5 text-[#3DDC97]" aria-hidden="true" />
          {periodo ? `Corte vigente · ${formatearPeriodo(periodo)}` : cargando ? 'Cargando el período…' : 'Sin períodos cargados'}
        </span>

        <h1 id="titulo-landing" className="max-w-3xl text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-5xl">
          Radar SBP ordena el crédito local de cada banco.{' '}
          <span className="text-white/45">Seis rankings por saldo, con la calidad de los datos a la vista.</span>
        </h1>

        <p className="max-w-2xl text-sm text-white/60 sm:text-base">
          Cada corte mensual del AT03 se valida, se depura y se compara con el anterior.
          {p?.Archivo ? ` Archivo del corte: ${p.Archivo}.` : ''}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/rankings"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-[#0B0B0C] transition-colors hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-[#3DDC97] focus-visible:outline-none"
          >
            Ver rankings
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
          <Link
            to="/reportes"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#3DDC97] focus-visible:outline-none"
          >
            Reportes y descargas
            <ArrowUpRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-white/70">
            No se pudieron leer los períodos del API. Vuelve a intentarlo en unos segundos.
          </p>
        ) : (
          <dl data-guia="panel.indicadores" className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {cifras.map((c) => (
              <div key={c.etiqueta} className="flex min-w-0 flex-col gap-1 bg-[#0B0B0C]/90 p-4 sm:p-5">
                <dt className="text-xs text-white/55">{c.etiqueta}</dt>
                <dd className={cn('cifra text-2xl font-medium tracking-tight sm:text-3xl', cargando && 'animate-pulse text-white/40')}>{c.valor}</dd>
                {(c.detalle || c.variacion) && (
                  <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/55">
                    {c.variacion && (
                      <span className={cn('cifra rounded-full px-1.5 py-0.5 font-medium', c.variacion.startsWith('-') ? 'bg-[#F0786B]/15 text-[#F59A90]' : 'bg-[#3DDC97]/15 text-[#3DDC97]')}>
                        {c.variacion} {frente}
                      </span>
                    )}
                    {c.detalle && <span className="cifra">{c.detalle}</span>}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}
