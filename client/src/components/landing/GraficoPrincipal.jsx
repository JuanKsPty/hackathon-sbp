import { useId, useState } from 'react'
import { PlaceholderGrafico } from '@/components/estados/PlaceholderGrafico.jsx'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { subactividades as pedirSubactividades } from '@/api/cliente.js'
import { Segmentado } from '@/components/marca'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { saldoPorSubactividad } from './datosLanding.js'
import { montoCompacto } from './formatoLanding.js'
import { TarjetaGrafico } from './TarjetaGrafico.jsx'

// Degradado horizontal verde para las barras (DISENO.md: verde con relleno degradado suave).
function Degradado({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--color-saldo)" stopOpacity={0.25} />
        <stop offset="100%" stopColor="var(--color-saldo)" stopOpacity={0.85} />
      </linearGradient>
    </defs>
  )
}

const config = { saldo: { label: 'Saldo', color: 'var(--chart-1)' } }

// Gráfico principal: control segmentado con los rankings, el saldo de los 12 bancos del ranking
// elegido (GET /api/rankings) y su desglose por subactividad (GET /api/subactividades). R2.
export function GraficoPrincipal({ datos }) {
  const { periodo, rankings } = datos
  const lista = rankings.datos?.rankings ?? []
  const [elegido, setElegido] = useState('')
  const actual = lista.find((r) => r.Ranking === elegido) ?? lista[0] ?? null
  const ranking = actual?.Ranking ?? null
  const idBancos = `deg-bancos-${useId().replace(/:/g, '')}`
  const idSub = `deg-sub-${useId().replace(/:/g, '')}`

  const subs = useConsulta((o) => pedirSubactividades({ periodo, ranking }, o), [periodo, ranking], { activa: Boolean(periodo && ranking) })
  const filasSub = saldoPorSubactividad(subs.datos?.subactividades?.filter((s) => s.Ranking === ranking))

  const filas = [...(actual?.bancos ?? [])]
    .sort((a, b) => a.Posicion - b.Posicion)
    .map((b) => ({ codigo: b.Codigo_Banco, nombre: `${b.Posicion}. ${b.Banco}`, saldo: b.Saldo_Actividad, ponderacion: b.Ponderacion_Pct }))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <EstadoBloque consulta={rankings} alto={600} vacio={lista.length === 0} tituloVacio="Sin rankings en este período">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmentado
              ariaLabel="Ranking de las gráficas"
              opciones={lista.map((r) => ({ valor: r.Ranking, etiqueta: r.Ranking }))}
              valor={ranking}
              onCambio={setElegido}
            />
            {ranking && (
              <Link
                to={`/rankings?ranking=${encodeURIComponent(ranking)}${periodo ? `&periodo=${periodo}` : ''}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Tabla de {ranking}
                <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
              </Link>
            )}
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_1fr]">
            <TarjetaGrafico id="titulo-grafico" fuerte={`Saldo por banco en ${ranking}`} suave={`al ${formatearPeriodo(periodo)}`} pie="En el orden del ranking. La ponderación es el saldo de la actividad sobre la cartera local válida del banco.">
              <ChartContainer config={config} className="aspect-auto h-[420px] w-full">
                <BarChart data={filas} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={6}>
                  <Degradado id={idBancos} />
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
                  <Bar dataKey="saldo" fill={`url(#${idBancos})`} stroke="var(--color-saldo)" strokeOpacity={0.6} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ChartContainer>
            </TarjetaGrafico>

            <TarjetaGrafico id="titulo-subactividades" fuerte="Por subactividad" suave={ranking ? `en ${ranking}` : undefined} pie="Suma de los bancos del ranking en cada subactividad.">
              {subs.error ? (
                <p className="text-sm text-muted-foreground">No se pudo leer el desglose por subactividad.</p>
              ) : subs.cargando || !subs.datos ? (
                <PlaceholderGrafico alto={200} />
              ) : (
                <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, filasSub.length * 44 + 40) }}>
                  <BarChart data={filasSub} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap={8}>
                    <Degradado id={idSub} />
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={montoCompacto} />
                    <YAxis type="category" dataKey="subactividad" width={120} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
                    <ChartTooltip cursor={{ fillOpacity: 0.15 }} content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formatearMonto(v)}</span>} />} />
                    <Bar dataKey="saldo" fill={`url(#${idSub})`} stroke="var(--color-saldo)" strokeOpacity={0.6} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </TarjetaGrafico>
          </div>
        </div>
      </EstadoBloque>
    </div>
  )
}
