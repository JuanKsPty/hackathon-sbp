import { useId } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { useBancoPanel } from '@/contexto/BancoPanelContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { composicionPorCorte, cortesDeBanco, cortesDelSistema, serieDelBanco } from './datosBanco.js'
import { EJE, formatoCompacto } from './graficos.js'
import { GloboGrafico, MarcoGrafico } from './MarcoGrafico.jsx'
import { Seccion } from './Seccion.jsx'

// Colores de los cortes en el gráfico de composición: el elegido en azul, los anteriores en gris.
const COLORES_CORTE = ['color-mix(in oklab, var(--chart-5) 45%, transparent)', 'var(--chart-5)', 'var(--chart-1)']
const MAX_CORTES = 3

// La cartera por corte (#140): evolución del saldo total válido y del universo local válido
// (GET /api/periodos) y la composición por macroactividad en cada corte (Total_Ranking de
// GET /api/indicadores, uno por período). Ninguna cifra se calcula aquí (R2).
// Con banco (#204), lo mismo del banco: su cartera, sus operaciones válidas y su saldo en cada ranking,
// del bloque `banco` de GET /api/productos?banco= en cada corte (consultaBanco).
export function CarteraPorCorte({ consultaIndicadores, consultaBanco }) {
  const { periodos, periodo } = usePeriodo()
  const { banco, nombreBanco } = useBancoPanel()
  const cortes = banco
    ? serieDelBanco(consultaBanco.datos)
    : periodos.filter((p) => p.Fecha && (!periodo || p.Fecha <= periodo)).sort((a, b) => a.Fecha.localeCompare(b.Fecha))
  // Con banco: los campos de GET /api/productos; sin banco, los de GET /api/periodos.
  const campos = banco ? { saldo: 'Total_Cartera_Local_Valida', prestamos: 'Operaciones_Validas' } : { saldo: 'Saldo_Total_Valido', prestamos: 'Universo_Local_Valido' }
  const sinCortes = cortes.length === 0 || (banco && cortes.every((c) => c[campos.saldo] === null))

  const cortesComposicion = (banco ? cortesDeBanco(consultaBanco.datos) : cortesDelSistema(consultaIndicadores.datos)).slice(-MAX_CORTES)
  const fechas = cortesComposicion.map((c) => c.periodo)
  const colores = COLORES_CORTE.slice(-fechas.length)
  const composicion = composicionPorCorte(cortesComposicion)
  const configComposicion = Object.fromEntries(fechas.map((f, i) => [`c${f}`, { label: formatearPeriodo(f), color: colores[i] }]))
  const de = banco ? ` · ${nombreBanco}` : ''

  return (
    <Seccion
      id="titulo-cartera"
      titulo={banco ? `La cartera de ${nombreBanco} corte a corte` : 'La cartera corte a corte'}
      descripcion={banco ? 'Cómo creció la cartera válida del banco y cómo se reparte entre las macroactividades.' : 'Cómo creció el universo válido y cómo se reparte entre las macroactividades.'}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <MarcoGrafico
          titulo={`Saldo total válido${de}`}
          descripcion={banco ? 'Cartera local válida del banco en cada corte cargado.' : 'Universo local válido, en cada corte cargado.'}
          consulta={banco ? consultaBanco : undefined}
          alto={200}
          vacio={sinCortes}
          mensajeVacio={banco ? 'El API no devolvió la cartera de este banco.' : undefined}
        >
          <AreaPorCorte datos={cortes} campo={campos.saldo} nombre="Saldo total válido" formatear={formatearMonto} />
        </MarcoGrafico>
        <MarcoGrafico
          titulo={banco ? `Operaciones válidas${de}` : 'Préstamos válidos'}
          descripcion={banco ? 'Operaciones válidas del banco en cada corte.' : 'Préstamos del universo local válido en cada corte.'}
          consulta={banco ? consultaBanco : undefined}
          alto={200}
          vacio={sinCortes}
          mensajeVacio={banco ? 'El API no devolvió la cartera de este banco.' : undefined}
        >
          <AreaPorCorte datos={cortes} campo={campos.prestamos} nombre={banco ? 'Operaciones válidas' : 'Préstamos válidos'} formatear={formatearEntero} color="var(--chart-3)" />
        </MarcoGrafico>
      </div>
      <MarcoGrafico
        titulo={`Composición por macroactividad${de}`}
        descripcion={
          banco
            ? 'Saldo del banco en cada ranking en los últimos cortes. Sale de /api/productos.'
            : 'Saldo de cada ranking en los últimos cortes. Análisis adicional: sale de /api/indicadores.'
        }
        consulta={banco ? consultaBanco : consultaIndicadores}
        alto={300}
        vacio={composicion.length === 0}
        mensajeVacio={banco ? 'El API no devolvió el saldo por ranking de este banco.' : undefined}
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
