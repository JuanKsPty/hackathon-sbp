import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { cn } from '@/lib/utils'
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { montoCompacto } from './formatoLanding.js'

// Gráfico principal de la landing: control segmentado con los 6 rankings y el saldo de los 12 bancos
// del ranking elegido, en el orden del ranking. Datos de GET /api/rankings (R2).
export function GraficoPrincipal({ datos }) {
  const { periodo, rankings } = datos
  const lista = rankings.datos?.rankings ?? []
  const [elegido, setElegido] = useState('')
  const actual = lista.find((r) => r.Ranking === elegido) ?? lista[0] ?? null
  const idDegradado = `degradado-${useId().replace(/:/g, '')}`

  const filas = [...(actual?.bancos ?? [])]
    .sort((a, b) => a.Posicion - b.Posicion)
    .map((b) => ({ codigo: b.Codigo_Banco, nombre: `${b.Posicion}. ${b.Banco}`, saldo: b.Saldo_Actividad, ponderacion: b.Ponderacion_Pct }))

  const config = { saldo: { label: 'Saldo de la actividad', color: 'var(--sube)' } }

  return (
    <section aria-labelledby="titulo-grafico" className="flex flex-col gap-5 rounded-3xl border bg-card p-4 text-card-foreground shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-grafico" className="text-2xl font-medium tracking-tight sm:text-3xl">
          Saldo por banco <span className="text-muted-foreground">en cada ranking</span>
        </h2>
        {actual && (
          <Link
            to={`/rankings?ranking=${encodeURIComponent(actual.Ranking)}${periodo ? `&periodo=${periodo}` : ''}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium hover:bg-accent"
          >
            Ver la tabla de {actual.Ranking}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <EstadoBloque consulta={rankings} filas={6} vacio={lista.length === 0} tituloVacio="Sin rankings en este período">
        <div className="flex flex-col gap-4">
          {/* Control segmentado provisional: se cambia por <Segmentado> de components/marca (#138). */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div role="radiogroup" aria-label="Ranking del gráfico" className="inline-flex gap-1 rounded-full bg-muted p-1">
              {lista.map((r) => {
                const activo = r.Ranking === actual?.Ranking
                return (
                  <button
                    key={r.Ranking}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => setElegido(r.Ranking)}
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
                      activo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r.Ranking}
                  </button>
                )
              })}
            </div>
          </div>

          <ChartContainer config={config} className="aspect-auto h-[440px] w-full">
            <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={6}>
              <defs>
                <linearGradient id={idDegradado} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--color-saldo)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-saldo)" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={montoCompacto} />
              <YAxis
                type="category"
                dataKey="nombre"
                width={130}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={{ fillOpacity: 0.15 }}
                content={
                  <ChartTooltipContent
                    formatter={(valor, _n, item) => (
                      <div className="flex flex-col gap-0.5">
                        <span className="cifra font-medium">{formatearMonto(valor)}</span>
                        <span className="cifra text-muted-foreground">Ponderación {formatearPorcentaje(item?.payload?.ponderacion)}</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="saldo" fill={`url(#${idDegradado})`} stroke="var(--color-saldo)" strokeOpacity={0.6} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground">
            {actual ? `${actual.Ranking} · saldo de la actividad al ${formatearPeriodo(periodo)}, en el orden del ranking.` : null}
          </p>
        </div>
      </EstadoBloque>
    </section>
  )
}
