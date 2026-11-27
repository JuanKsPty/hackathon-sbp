import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, ChartBarBigIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Etiqueta, SeccionGris, Segmentado, TituloDosTonos } from '@/components/marca'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
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

  const config = { saldo: { label: 'Saldo de la actividad', color: 'var(--chart-1)' } }

  return (
    <SeccionGris role="region" aria-labelledby="titulo-grafico" className="flex flex-col gap-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <Etiqueta icono={ChartBarBigIcon}>Los 12 bancos</Etiqueta>
          <TituloDosTonos id="titulo-grafico" fuerte="Saldo por banco" suave="en cada ranking" />
        </div>
        {actual && (
          <Link
            to={`/rankings?ranking=${encodeURIComponent(actual.Ranking)}${periodo ? `&periodo=${periodo}` : ''}`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Ver la tabla de {actual.Ranking}
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        )}
      </div>

      <EstadoBloque consulta={rankings} filas={6} vacio={lista.length === 0} tituloVacio="Sin rankings en este período">
        <div className="flex min-w-0 flex-col gap-4">
          <Segmentado
            ariaLabel="Ranking del gráfico"
            opciones={lista.map((r) => ({ valor: r.Ranking, etiqueta: r.Ranking }))}
            valor={actual?.Ranking}
            onCambio={setElegido}
            className="w-fit"
          />

          <div className="min-w-0 rounded-tarjeta bg-card p-3 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 sm:p-5 dark:shadow-none dark:ring-border">
            <ChartContainer config={config} className="aspect-auto h-[440px] w-full">
              <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={6}>
                <defs>
                  <linearGradient id={idDegradado} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-saldo)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-saldo)" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={montoCompacto} />
                <YAxis type="category" dataKey="nombre" width={130} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
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
          </div>
          <p className="text-xs text-muted-foreground">
            {actual ? `${actual.Ranking} · saldo de la actividad al ${formatearPeriodo(periodo)}, en el orden del ranking.` : null}
          </p>
        </div>
      </EstadoBloque>
    </SeccionGris>
  )
}
