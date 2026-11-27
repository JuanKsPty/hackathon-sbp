import { useId } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { EJE, formatoCompacto } from './graficos.js'
import { GloboGrafico, MarcoGrafico } from './MarcoGrafico.jsx'
import { Seccion } from './Seccion.jsx'

// Colores de los cortes en el gráfico de composición: el elegido en azul, los anteriores en gris.
const COLORES_CORTE = ['color-mix(in oklab, var(--chart-5) 45%, transparent)', 'var(--chart-5)', 'var(--chart-1)']
const MAX_CORTES = 3

// La cartera por corte (#140): evolución del saldo total válido y del universo local válido
// (GET /api/periodos) y la composición por macroactividad en cada corte (Total_Ranking de
// GET /api/indicadores, uno por período). Ninguna cifra se calcula aquí (R2).
export function CarteraPorCorte({ consultaIndicadores }) {
  const { periodos, periodo } = usePeriodo()
  const cortes = periodos.filter((p) => p.Fecha && (!periodo || p.Fecha <= periodo)).sort((a, b) => a.Fecha.localeCompare(b.Fecha))

  const respuestas = (consultaIndicadores.datos ?? []).slice(-MAX_CORTES)
  const fechas = respuestas.map((r) => r.periodo)
  const colores = COLORES_CORTE.slice(-fechas.length)
  const nombres = (respuestas.at(-1)?.concentracion ?? []).map((c) => c.Ranking)
  const composicion = nombres.map((ranking) => {
    const fila = { ranking }
    for (const r of respuestas) fila[`c${r.periodo}`] = r.concentracion?.find((c) => c.Ranking === ranking)?.Total_Ranking ?? null
    return fila
  })
  const configComposicion = Object.fromEntries(fechas.map((f, i) => [`c${f}`, { label: formatearPeriodo(f), color: colores[i] }]))

  return (
    <Seccion id="titulo-cartera" titulo="La cartera corte a corte" descripcion="Cómo creció el universo válido y cómo se reparte entre las macroactividades.">
      <div className="grid gap-4 md:grid-cols-2">
        <MarcoGrafico titulo="Saldo total válido" descripcion="Universo local válido, en cada corte cargado." vacio={cortes.length === 0}>
          <AreaPorCorte datos={cortes} campo="Saldo_Total_Valido" nombre="Saldo total válido" formatear={formatearMonto} />
        </MarcoGrafico>
        <MarcoGrafico titulo="Préstamos válidos" descripcion="Préstamos del universo local válido en cada corte." vacio={cortes.length === 0}>
          <AreaPorCorte datos={cortes} campo="Universo_Local_Valido" nombre="Préstamos válidos" formatear={formatearEntero} color="var(--chart-3)" />
        </MarcoGrafico>
      </div>
      <MarcoGrafico
        titulo="Composición por macroactividad"
        descripcion="Saldo de cada ranking en los últimos cortes. Análisis adicional: sale de /api/indicadores."
        consulta={consultaIndicadores}
        vacio={composicion.length === 0}
      >
        <ChartContainer config={configComposicion} className="aspect-auto h-[300px] w-full">
          <BarChart data={composicion} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="ranking" {...EJE} interval={0} tickFormatter={(v) => (v.length > 9 ? `${v.slice(0, 8)}.` : v)} />
            <YAxis {...EJE} width={52} tickFormatter={formatoCompacto} />
            <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<GloboGrafico formatear={(v) => formatearMonto(v)} />} />
            <ChartLegend content={<ChartLegendContent />} />
            {fechas.map((f) => (
              <Bar key={f} dataKey={`c${f}`} name={formatearPeriodo(f)} fill={`var(--color-c${f})`} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ChartContainer>
      </MarcoGrafico>
    </Seccion>
  )
}

function AreaPorCorte({ datos, campo, nombre, formatear, color = 'var(--chart-1)' }) {
  const id = useId().replace(/:/g, '')
  const serie = datos.map((p) => ({ periodo: p.Fecha, valor: p[campo] ?? null }))
  return (
    <ChartContainer config={{ valor: { label: nombre, color } }} className="aspect-auto h-[200px] w-full">
      <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`relleno-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-valor)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-valor)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="periodo" {...EJE} tickFormatter={formatearPeriodo} padding={{ left: 12, right: 12 }} />
        <YAxis {...EJE} width={52} tickFormatter={formatoCompacto} domain={['auto', 'auto']} />
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<GloboGrafico titulo={(l) => formatearPeriodo(l)} formatear={(v) => formatear(v)} />} />
        <Area type="monotone" dataKey="valor" name={nombre} stroke="var(--color-valor)" strokeWidth={2.5} fill={`url(#relleno-${id})`} dot={{ r: 3, fill: 'var(--color-valor)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ChartContainer>
  )
}
