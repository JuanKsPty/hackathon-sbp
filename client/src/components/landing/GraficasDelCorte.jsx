import { Link } from 'react-router'
import { ArrowRightIcon, CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatearEntero, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'
import { composicionCartera } from './datosLanding.js'
import { montoCompacto } from './formatoLanding.js'
import { TarjetaGrafico } from './TarjetaGrafico.jsx'

// Gráficas del corte vigente (#139). Solo datos del período elegido, todos del API (R2):
// composición y concentración de GET /api/indicadores (concentracion[]), morosidad de
// GET /api/indicadores (morosidad.bancos[]) y calidad de GET /api/calidad.

// Un verde por macroactividad, del más fuerte al más claro (DISENO.md: --chart-1 es el verde).
const OPACIDADES = [1, 0.78, 0.6, 0.45, 0.32, 0.2, 0.12]
const pct1 = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const hhi = new Intl.NumberFormat('es-PA', { maximumFractionDigits: 0 })

export function ComposicionCartera({ indicadores }) {
  const filas = composicionCartera(indicadores.datos?.concentracion)
  const config = Object.fromEntries(filas.map((f) => [f.ranking, { label: f.ranking, color: 'var(--chart-1)' }]))

  return (
    <TarjetaGrafico id="titulo-composicion" fuerte="Composición de la cartera" suave="por macroactividad" pie="Saldo de cada ranking sobre la suma de los rankings del corte.">
      <EstadoBloque consulta={indicadores} alto={170} vacio={filas.length === 0} tituloVacio="Sin datos de composición">
        <div className="grid items-center gap-4 sm:grid-cols-[170px_1fr]">
          <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[170px]">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="ranking" formatter={(v, n) => <span className="cifra">{n}: {formatearMonto(v)}</span>} />}
              />
              <Pie data={filas} dataKey="saldo" nameKey="ranking" innerRadius="58%" outerRadius="100%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                {filas.map((f, i) => (
                  <Cell key={f.ranking} fill="var(--chart-1)" fillOpacity={OPACIDADES[i] ?? 0.1} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex flex-col gap-2 text-sm">
            {filas.map((f, i) => (
              <li key={f.ranking} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-chart-1" style={{ opacity: OPACIDADES[i] ?? 0.1 }} />
                <span className="min-w-0 flex-1 truncate">{f.ranking}</span>
                <span className="cifra text-muted-foreground">{montoCompacto(f.saldo)}</span>
                <span className="cifra w-14 text-right font-medium">{f.pct === null ? '—' : `${pct1.format(f.pct)} %`}</span>
              </li>
            ))}
          </ul>
        </div>
      </EstadoBloque>
    </TarjetaGrafico>
  )
}

const EXCLUSIONES = [
  { campo: 'E1_Duplicados', nombre: 'E1 Duplicados' },
  { campo: 'E2_Destino_Extranjero', nombre: 'E2 Destino extranjero' },
  { campo: 'E3_Saldo_No_Positivo', nombre: 'E3 Saldo no positivo' },
  { campo: 'E4_Actividad_No_Catalogada', nombre: 'E4 No catalogada' },
]
const CONTROLES = [
  ['R1', 'R1'],
  ['R2', 'R2'],
  ['R3', 'R3'],
  ['Unicidad', 'Unicidad'],
]

export function CalidadCorte({ calidad }) {
  const c = calidad.datos
  const filas = c ? EXCLUSIONES.map((e) => ({ nombre: e.nombre, filas: c[e.campo] ?? 0 })) : []
  const config = { filas: { label: 'Filas excluidas', color: 'var(--chart-3)' } }

  return (
    <TarjetaGrafico
      id="titulo-calidad"
      fuerte="Calidad del corte"
      suave="exclusiones E1–E4"
      accion={
        <Link to="/calidad" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Calidad
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Link>
      }
    >
      <EstadoBloque consulta={calidad} alto={280} vacio={!c} tituloVacio="Sin datos de calidad para este período">
        {c && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="cifra text-2xl font-medium tracking-tight text-foreground">{formatearEntero(c.Universo_Local_Valido)}</span> filas válidas de{' '}
              <span className="cifra">{formatearEntero(c.Filas_Leidas)}</span> leídas
              {c.Filas_Leidas > 0 && <span className="cifra"> ({pct1.format((c.Universo_Local_Valido / c.Filas_Leidas) * 100)} %)</span>}
            </p>
            <ChartContainer config={config} className="aspect-auto h-[180px] w-full">
              <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 40 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v) => formatearEntero(v)} />
                <YAxis type="category" dataKey="nombre" width={140} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
                <ChartTooltip cursor={{ fillOpacity: 0.15 }} content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formatearEntero(v)} filas</span>} />} />
                <Bar dataKey="filas" fill="var(--color-filas)" fillOpacity={0.8} radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 11, formatter: (v) => formatearEntero(v) }} />
              </BarChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-1.5" aria-label="Reconciliaciones del corte">
              {CONTROLES.map(([clave, nombre]) => {
                const ok = c.Reconciliaciones?.[clave]?.ok
                if (typeof ok !== 'boolean') return null
                const Icono = ok ? CheckCircle2Icon : TriangleAlertIcon
                return (
                  <Badge key={clave} variant={ok ? 'sube' : 'baja'}>
                    <Icono aria-hidden="true" />
                    {nombre} {ok ? 'cuadra' : 'descuadre'}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </EstadoBloque>
    </TarjetaGrafico>
  )
}

export function Concentracion({ indicadores }) {
  const filas = (indicadores.datos?.concentracion ?? []).map((c) => ({
    ranking: c.Ranking,
    top3: c.Participacion_Top3_Pct,
    hhi: c.HHI,
    lideres: (c.Top3 ?? []).map((b) => b.Banco).join(', '),
  }))
  const config = { top3: { label: 'Top 3', color: 'var(--chart-1)' } }

  return (
    <TarjetaGrafico id="titulo-concentracion" fuerte="Concentración" suave="participación de los 3 primeros" pie="HHI: índice Herfindahl-Hirschman del ranking (0 a 10 000; más alto, más concentrado).">
      <EstadoBloque consulta={indicadores} alto={260} vacio={filas.length === 0} tituloVacio="Sin datos de concentración">
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 64 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} %`} />
            <YAxis type="category" dataKey="ranking" width={110} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
            <ChartTooltip
              cursor={{ fillOpacity: 0.15 }}
              content={
                <ChartTooltipContent
                  formatter={(v, _n, item) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="cifra font-medium">Top 3: {formatearPorcentaje(v)}</span>
                      <span className="cifra text-muted-foreground">HHI {hhi.format(item?.payload?.hhi ?? 0)}</span>
                      <span className="text-muted-foreground">{item?.payload?.lideres}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="top3"
              fill="var(--color-top3)"
              fillOpacity={0.8}
              radius={[0, 8, 8, 0]}
              label={{ position: 'right', fontSize: 11, formatter: (v) => `${pct1.format(v)} %` }}
            />
          </BarChart>
        </ChartContainer>
      </EstadoBloque>
    </TarjetaGrafico>
  )
}

export function Morosidad({ indicadores }) {
  const total = indicadores.datos?.morosidad?.total
  const filas = [...(indicadores.datos?.morosidad?.bancos ?? [])]
    .map((b) => ({ banco: b.Banco, mora: b.Pct_Saldo_En_Mora, vencido: b.Pct_Vencido }))
    .sort((a, b) => (b.mora ?? 0) - (a.mora ?? 0))
  const config = {
    mora: { label: '% del saldo en mora', color: 'var(--chart-3)' },
    vencido: { label: '% del saldo vencido', color: 'var(--chart-2)' },
  }

  return (
    <TarjetaGrafico
      id="titulo-morosidad"
      fuerte="Morosidad"
      suave="por banco"
      pie={
        total
          ? `Sistema: ${formatearPorcentaje(total.Pct_Saldo_En_Mora)} del saldo en mora y ${formatearPorcentaje(total.Pct_Vencido)} vencido. Análisis adicional, fuera de los 6 rankings.`
          : 'Análisis adicional, fuera de los 6 rankings.'
      }
    >
      {/* 12 bancos: 12 × 30 + 40 px de gráfico, más la leyenda. */}
      <EstadoBloque consulta={indicadores} alto={420} vacio={filas.length === 0} tituloVacio="Sin datos de morosidad">
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(200, filas.length * 30 + 40) }}>
          <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={5} barGap={1}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${v} %`} />
            <YAxis type="category" dataKey="banco" width={130} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
            <ChartTooltip cursor={{ fillOpacity: 0.15 }} content={<ChartTooltipContent formatter={(v, n) => <span className="cifra">{config[n]?.label}: {formatearPorcentaje(v)}</span>} />} />
            <Bar dataKey="mora" fill="var(--color-mora)" fillOpacity={0.85} radius={[0, 6, 6, 0]} />
            <Bar dataKey="vencido" fill="var(--color-vencido)" fillOpacity={0.7} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartContainer>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-3" />% del saldo en mora
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-2 opacity-70" />% del saldo vencido
          </span>
        </div>
      </EstadoBloque>
    </TarjetaGrafico>
  )
}
