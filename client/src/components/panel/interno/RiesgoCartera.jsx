import { InfoIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { useBancoPanel } from '@/contexto/BancoPanelContext.jsx'
import { alPeriodo, formatearEntero, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'
import { riesgoDelBanco } from './datosBanco.js'
import { EJE } from './graficos.js'
import { MarcoGrafico } from './MarcoGrafico.jsx'
import { NotaSistemaCompleto } from './NotaSistemaCompleto.jsx'
import { Seccion } from './Seccion.jsx'

const decimales = new Intl.NumberFormat('es-PA', { maximumFractionDigits: 2 })
const formatearHHI = (v) => (typeof v === 'number' ? decimales.format(v) : '—')
const corto = (texto, n) => (texto && texto.length > n ? `${texto.slice(0, n - 1)}.` : texto)

const CONFIG_CONCENTRACION = { top3: { label: 'Top 3', color: 'var(--chart-1)' } }
const CONFIG_MORA = {
  mora: { label: '% del saldo en mora', color: 'var(--chart-2)' },
  vencido: { label: '% del saldo vencido', color: 'var(--baja)' },
}
// Con banco elegido, los demás bancos van tenues en el gráfico de morosidad.
const OPACIDAD_OTROS = 0.3

// Concentración por ranking y morosidad por banco del corte elegido (GET /api/indicadores).
// Es un análisis adicional: no forma parte de los 6 rankings oficiales, y así lo rotula con el texto
// `analisis` que manda el API. Equivale al bloque "Indicadores adicionales" del panel (data-guia).
// Con banco (#204): sus cifras de morosidad y vencimientos (morosidad.bancos[] y vencimientos.bancos[]),
// el banco resaltado en el gráfico de morosidad y una nota en la concentración, que es del sistema.
export function RiesgoCartera({ consulta }) {
  const { banco, nombreBanco } = useBancoPanel()
  const datos = consulta.datos?.at(-1) ?? null
  const concentracion = (datos?.concentracion ?? []).map((c) => ({
    ranking: c.Ranking,
    top3: c.Participacion_Top3_Pct,
    hhi: c.HHI,
    bancos: (c.Top3 ?? []).map((b) => (banco && b.Codigo_Banco === banco ? `${b.Banco} (elegido)` : b.Banco)),
  }))
  const mora = [...(datos?.morosidad?.bancos ?? [])]
    .sort((a, b) => (b.Pct_Saldo_En_Mora ?? 0) - (a.Pct_Saldo_En_Mora ?? 0))
    .map((b) => ({ codigo: b.Codigo_Banco, banco: b.Banco, mora: b.Pct_Saldo_En_Mora, vencido: b.Pct_Vencido, dias: b.Dias_Mora_Promedio }))
  const suyo = riesgoDelBanco(datos, banco)
  // Con banco, una celda por barra: el elegido con su color pleno y los demás tenues.
  const celdas = (clave) =>
    banco && mora.map((f) => <Cell key={f.codigo} fill={`var(--color-${clave})`} fillOpacity={f.codigo === banco ? 1 : OPACIDAD_OTROS} />)

  return (
    <Seccion
      id="titulo-riesgo"
      data-guia="panel.indicadores-adicionales"
      titulo={datos ? `Concentración y morosidad ${alPeriodo(datos.periodo)}` : 'Concentración y morosidad'}
    >
      <p className="-mt-2 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{datos?.analisis ?? 'Análisis adicional: no forma parte de los 6 rankings oficiales ni de su cálculo'}</span>
      </p>
      {banco && (
        <MarcoGrafico
          titulo={`Morosidad y vencimientos · ${nombreBanco}`}
          descripcion="Sobre el saldo del banco en el corte (morosidad.bancos[] y vencimientos.bancos[])."
          consulta={consulta}
          vacio={!suyo}
          mensajeVacio="El API no devolvió la morosidad de este banco."
        >
          <CifrasDelBanco riesgo={suyo} />
        </MarcoGrafico>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <MarcoGrafico
          titulo="Concentración por ranking"
          descripcion="Parte del saldo de cada ranking que suman sus tres primeros bancos. El globo muestra el HHI (0 a 10 000)."
          nota={<NotaSistemaCompleto texto="La concentración es del sistema completo: no se filtra por banco. El globo marca el banco si está en el Top 3." />}
          consulta={consulta}
          alto={260}
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
          titulo={banco ? `Morosidad por banco · ${nombreBanco} resaltado` : 'Morosidad por banco'}
          descripcion="Saldo en mora (días de mora mayores que cero) y saldo vencido, sobre el saldo de cada banco."
          consulta={consulta}
          alto={12 * 30 + 60}
          vacio={mora.length === 0}
        >
          <ChartContainer config={CONFIG_MORA} className="aspect-auto w-full" style={{ height: Math.max(240, mora.length * 30 + 60) }}>
            <BarChart data={mora} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" {...EJE} tickFormatter={(v) => `${v} %`} />
              <YAxis type="category" dataKey="banco" {...EJE} width={118} interval={0} tickFormatter={(v) => corto(v, 17)} />
              <ChartTooltip cursor={{ fillOpacity: 0.2 }} content={<GloboMora />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="mora" name={CONFIG_MORA.mora.label} fill="var(--color-mora)" radius={[0, 4, 4, 0]}>
                {celdas('mora')}
              </Bar>
              <Bar dataKey="vencido" name={CONFIG_MORA.vencido.label} fill="var(--color-vencido)" radius={[0, 4, 4, 0]}>
                {celdas('vencido')}
              </Bar>
            </BarChart>
          </ChartContainer>
        </MarcoGrafico>
      </div>
    </Seccion>
  )
}

// Morosidad y vencimientos del banco elegido, tal como los manda GET /api/indicadores.
function CifrasDelBanco({ riesgo }) {
  const m = riesgo?.mora
  const v = riesgo?.vencimientos
  const cifras = [
    ['Saldo', formatearMonto(m?.Saldo ?? v?.Saldo)],
    ['% del saldo en mora', formatearPorcentaje(m?.Pct_Saldo_En_Mora)],
    ['% del saldo vencido', formatearPorcentaje(m?.Pct_Vencido)],
    ['Préstamos en mora', formatearEntero(m?.Operaciones_En_Mora)],
    ['Días de mora (prom.)', typeof m?.Dias_Mora_Promedio === 'number' ? decimales.format(m.Dias_Mora_Promedio) : '—'],
    ['Monto vencido', formatearMonto(v?.Monto_Vencido ?? m?.Monto_Vencido)],
    ['Monto por vencer', formatearMonto(v?.Monto_Por_Vencer)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {cifras.map(([nombre, valor]) => (
        <div key={nombre} className="flex min-w-0 flex-col gap-0.5 rounded-md bg-muted/50 px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">{nombre}</dt>
          <dd className="cifra text-base font-medium break-words">{valor}</dd>
        </div>
      ))}
    </dl>
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
