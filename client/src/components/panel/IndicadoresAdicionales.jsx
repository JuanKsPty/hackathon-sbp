import { InfoIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { indicadores as pedirIndicadores } from '@/api/cliente.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { tramosParaGrafico } from '@/lib/tramos.js'
import { EstadoBloque } from './EstadoBloque.jsx'

// Días de mora y HHI vienen del API con 2 y 4 decimales.
const decimales = new Intl.NumberFormat('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const formatearDecimal = (valor) => (typeof valor === 'number' && Number.isFinite(valor) ? decimales.format(valor) : '—')

// Eje en millones para que quepa en pantalla: 87562053.92 -> "87.6 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })

// Indicadores adicionales (criterio 6, innovación): morosidad, vencimientos y concentración de
// GET /api/indicadores. Es un análisis aparte: no forma parte de los 6 rankings oficiales, y así lo
// rotula la tarjeta con el texto `analisis` del API. Todas las cifras salen del API (R2).
export function IndicadoresAdicionales() {
  const { periodo } = usePeriodo()
  const consulta = useConsulta((opciones) => pedirIndicadores({ periodo }, opciones), [periodo], { activa: Boolean(periodo) })
  const datos = consulta.datos

  return (
    <Card data-guia="panel.indicadores-adicionales" className="min-w-0">
      <CardHeader>
        <CardTitle>Indicadores adicionales</CardTitle>
        <CardDescription>
          {periodo ? `Morosidad, vencimientos y concentración al ${formatearPeriodo(periodo)}` : 'Período elegido junto al título'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EstadoBloque
          consulta={consulta}
          filas={5}
          vacio={!datos?.morosidad || datos.morosidad.total?.Operaciones === 0}
          tituloVacio="Sin cartera en este período"
          mensajeVacio="El período elegido no tiene préstamos válidos para calcular estos indicadores."
        >
          <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{datos?.analisis ?? 'Análisis adicional: no forma parte de los 6 rankings oficiales ni de su cálculo'}</span>
          </p>
          <Tabs defaultValue="morosidad">
            <TabsList className="w-full">
              <TabsTrigger value="morosidad">Morosidad</TabsTrigger>
              <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
              <TabsTrigger value="concentracion">Concentración</TabsTrigger>
            </TabsList>
            <TabsContent value="morosidad" className="flex flex-col gap-4 pt-2">
              <Morosidad morosidad={datos?.morosidad} />
            </TabsContent>
            <TabsContent value="vencimientos" className="flex flex-col gap-4 pt-2">
              <Vencimientos vencimientos={datos?.vencimientos} />
            </TabsContent>
            <TabsContent value="concentracion" className="flex flex-col gap-3 pt-2">
              <Concentracion rankings={datos?.concentracion ?? []} />
            </TabsContent>
          </Tabs>
        </EstadoBloque>
      </CardContent>
    </Card>
  )
}

function Cifras({ cifras }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {cifras.map(({ nombre, valor }) => (
        <div key={nombre} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{nombre}</dt>
          <dd className="cifra text-base font-semibold break-words">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function Morosidad({ morosidad }) {
  const total = morosidad?.total
  if (!total) return null
  return (
    <>
      <Cifras
        cifras={[
          { nombre: '% del saldo vencido', valor: formatearPorcentaje(total.Pct_Vencido) },
          { nombre: '% del saldo en mora', valor: formatearPorcentaje(total.Pct_Saldo_En_Mora) },
          { nombre: 'Préstamos en mora', valor: formatearEntero(total.Operaciones_En_Mora) },
          { nombre: 'Días de mora (promedio)', valor: formatearDecimal(total.Dias_Mora_Promedio) },
        ]}
      />
      <p className="-mt-2 text-xs text-muted-foreground">
        Sobre el saldo de todo el universo local válido. En mora: préstamos con días de mora mayores que cero.
      </p>
      <Subtitulo>Monto vencido por tramo</Subtitulo>
      <GraficoTramos tramos={total.Tramos_Vencido} color="var(--baja)" etiqueta="Monto vencido" />
      <Subtitulo>Por banco</Subtitulo>
      <p className="-mt-2 text-xs text-muted-foreground">% vencido y % en mora, sobre el saldo de cada banco.</p>
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="px-1.5">Banco</TableHead>
            <TableHead className="px-1.5 text-right">% vencido</TableHead>
            <TableHead className="px-1.5 text-right">% en mora</TableHead>
            <TableHead className="px-1.5 text-right">Días mora</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(morosidad.bancos ?? []).map((b) => (
            <TableRow key={b.Codigo_Banco}>
              <TableCell className="px-1.5 font-medium whitespace-normal">{b.Banco}</TableCell>
              <TableCell className="px-1.5 text-right">{formatearPorcentaje(b.Pct_Vencido)}</TableCell>
              <TableCell className="px-1.5 text-right">{formatearPorcentaje(b.Pct_Saldo_En_Mora)}</TableCell>
              <TableCell className="px-1.5 text-right">{formatearDecimal(b.Dias_Mora_Promedio)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

function Vencimientos({ vencimientos }) {
  const total = vencimientos?.total
  if (!total) return null
  return (
    <>
      <Cifras
        cifras={[
          { nombre: 'Saldo', valor: formatearMonto(total.Saldo) },
          { nombre: 'Por vencer', valor: formatearMonto(total.Monto_Por_Vencer) },
          { nombre: 'Vencido', valor: formatearMonto(total.Monto_Vencido) },
        ]}
      />
      <Subtitulo>Saldo por vencer, por tramo</Subtitulo>
      <GraficoTramos tramos={total.Tramos_Por_Vencer} color="var(--chart-1)" etiqueta="Por vencer" />
    </>
  )
}

function Concentracion({ rankings }) {
  if (rankings.length === 0) return <p className="text-sm text-muted-foreground">El API no devolvió concentración para este período.</p>
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Top 3: parte del saldo del ranking que suman los tres primeros bancos. HHI (Herfindahl-Hirschman): va de 0 a 10 000, y 10 000 significa un solo banco.
      </p>
      <ul className="flex flex-col divide-y">
        {rankings.map((r) => (
          <li key={r.Ranking} className="flex flex-col gap-1 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-medium">{r.Ranking}</span>
              <span className="cifra text-sm">
                Top 3 {formatearPorcentaje(r.Participacion_Top3_Pct)} · HHI {formatearDecimal(r.HHI)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {(r.Top3 ?? []).map((b) => `${b.Posicion}. ${b.Banco} (${formatearPorcentaje(b.Participacion_Pct)})`).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}

const Subtitulo = ({ children }) => <h3 className="text-sm font-medium">{children}</h3>

// Barras horizontales, una por tramo, en el orden del API (de menor a mayor plazo).
function GraficoTramos({ tramos, color, etiqueta }) {
  const datos = tramosParaGrafico(tramos)
  if (datos.length === 0) return <p className="text-sm text-muted-foreground">Sin tramos para mostrar.</p>
  const config = { monto: { label: etiqueta, color } }
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: datos.length * 30 + 24 }}>
      <BarChart data={datos} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => compacto.format(v)} />
        <YAxis type="category" dataKey="tramo" width={104} tickLine={false} axisLine={false} interval={0} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.3 }}
          content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formatearMonto(v)}</span>} />}
        />
        <Bar dataKey="monto" fill="var(--color-monto)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
