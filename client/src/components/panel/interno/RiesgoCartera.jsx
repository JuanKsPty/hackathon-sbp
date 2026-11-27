import { InfoIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { EJE } from './graficos.js'
import { MarcoGrafico } from './MarcoGrafico.jsx'
import { Seccion } from './Seccion.jsx'

const decimales = new Intl.NumberFormat('es-PA', { maximumFractionDigits: 2 })
const formatearHHI = (v) => (typeof v === 'number' ? decimales.format(v) : '—')
const corto = (texto, n) => (texto && texto.length > n ? `${texto.slice(0, n - 1)}.` : texto)

const CONFIG_CONCENTRACION = { top3: { label: 'Top 3', color: 'var(--chart-1)' } }
const CONFIG_MORA = {
  mora: { label: '% del saldo en mora', color: 'var(--chart-2)' },
  vencido: { label: '% del saldo vencido', color: 'var(--baja)' },
}

// Concentración por ranking y morosidad por banco del corte elegido (GET /api/indicadores).
// Es un análisis adicional: no forma parte de los 6 rankings oficiales, y así lo rotula con el texto
// `analisis` que manda el API. Equivale al bloque "Indicadores adicionales" del panel (data-guia).
export function RiesgoCartera({ consulta }) {
  const datos = consulta.datos?.at(-1) ?? null
  const concentracion = (datos?.concentracion ?? []).map((c) => ({
    ranking: c.Ranking,
    top3: c.Participacion_Top3_Pct,
    hhi: c.HHI,
    bancos: (c.Top3 ?? []).map((b) => b.Banco),
  }))
  const mora = [...(datos?.morosidad?.bancos ?? [])]
    .sort((a, b) => (b.Pct_Saldo_En_Mora ?? 0) - (a.Pct_Saldo_En_Mora ?? 0))
    .map((b) => ({ banco: b.Banco, mora: b.Pct_Saldo_En_Mora, vencido: b.Pct_Vencido, dias: b.Dias_Mora_Promedio }))

  return (
    <Seccion
      id="titulo-riesgo"
      data-guia="panel.indicadores-adicionales"
      titulo={datos ? `Concentración y morosidad al ${formatearPeriodo(datos.periodo)}` : 'Concentración y morosidad'}
    >
      <p className="-mt-2 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{datos?.analisis ?? 'Análisis adicional: no forma parte de los 6 rankings oficiales ni de su cálculo'}</span>
      </p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <MarcoGrafico
          titulo="Concentración por ranking"
          descripcion="Parte del saldo de cada ranking que suman sus tres primeros bancos. El globo muestra el HHI (0 a 10 000)."
          consulta={consulta}
          vacio={concentracion.length === 0}
        >
          <ChartContainer config={CONFIG_CONCENTRACION} className="aspect-auto h-[260px] w-full">
            <BarChart data={concentracion} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="25%">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" {...EJE} domain={[0, 'auto']} tickFormatter={(v) => `${v} %`} />
              <YAxis type="category" dataKey="ranking" {...EJE} width={104} interval={0} tickFormatter={(v) => corto(v, 14)} />
              <ChartTooltip cursor={{ fillOpacity: 0.2 }} content={<GloboConcentracion />} />
              <Bar dataKey="top3" name="Top 3" fill="var(--color-top3)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </MarcoGrafico>
        <MarcoGrafico
          titulo="Morosidad por banco"
          descripcion="Saldo en mora (días de mora mayores que cero) y saldo vencido, sobre el saldo de cada banco."
          consulta={consulta}
          vacio={mora.length === 0}
        >
          <ChartContainer config={CONFIG_MORA} className="aspect-auto w-full" style={{ height: Math.max(240, mora.length * 30 + 60) }}>
            <BarChart data={mora} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" {...EJE} tickFormatter={(v) => `${v} %`} />
              <YAxis type="category" dataKey="banco" {...EJE} width={118} interval={0} tickFormatter={(v) => corto(v, 17)} />
              <ChartTooltip cursor={{ fillOpacity: 0.2 }} content={<GloboMora />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="mora" name={CONFIG_MORA.mora.label} fill="var(--color-mora)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="vencido" name={CONFIG_MORA.vencido.label} fill="var(--color-vencido)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </MarcoGrafico>
      </div>
    </Seccion>
  )
}

function Globo({ titulo, filas }) {
  return (
    <div className="grid min-w-48 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium">{titulo}</span>
      {filas.map(([nombre, valor]) => (
        <span key={nombre} className="flex justify-between gap-3">
          {nombre} <span className="cifra font-medium">{valor}</span>
        </span>
      ))}
    </div>
  )
}

function GloboConcentracion({ active, payload }) {
  const f = active ? payload?.[0]?.payload : null
  if (!f) return null
  return (
    <Globo
      titulo={f.ranking}
      filas={[
        ['Top 3', formatearPorcentaje(f.top3)],
        ['HHI', formatearHHI(f.hhi)],
        ...f.bancos.map((b, i) => [`${i + 1}.`, b]),
      ]}
    />
  )
}

function GloboMora({ active, payload }) {
  const f = active ? payload?.[0]?.payload : null
  if (!f) return null
  return (
    <Globo
      titulo={f.banco}
      filas={[
        ['En mora', formatearPorcentaje(f.mora)],
        ['Vencido', formatearPorcentaje(f.vencido)],
        ['Días de mora (prom.)', typeof f.dias === 'number' ? decimales.format(f.dias) : '—'],
      ]}
    />
  )
}
