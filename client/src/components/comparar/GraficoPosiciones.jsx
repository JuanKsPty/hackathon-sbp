import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { COLOR_APAGADO, COLORES_SIN_RESALTAR } from './colores.js'
import { armarSerieDePosiciones } from './series.js'

// Línea de cada banco según lo que esté resaltado.
// `resaltados`: [{ codigo, color }]. Sin ninguno, todas las líneas rotan por los colores del tema.
function estiloDeLinea(banco, indice, resaltados) {
  if (resaltados.length === 0) {
    return { color: COLORES_SIN_RESALTAR[indice % COLORES_SIN_RESALTAR.length], ancho: 2, opacidad: 0.9, puntos: false }
  }
  const resaltado = resaltados.find((r) => r.codigo === banco.codigo)
  if (resaltado) return { color: resaltado.color, ancho: 3.5, opacidad: 1, puntos: true }
  return { color: COLOR_APAGADO, ancho: 1.5, opacidad: 0.3, puntos: false }
}

// Evolución de la posición de cada banco en un ranking a lo largo de los períodos cargados.
// El eje Y va invertido (la posición 1 arriba). Los valores salen de GET /api/rankings por período.
export function GraficoPosiciones({ respuestas, ranking, resaltados, alElegirBanco }) {
  const { puntos, bancos, maxPosicion } = useMemo(() => armarSerieDePosiciones(respuestas, ranking), [respuestas, ranking])
  const estilos = useMemo(
    () => new Map(bancos.map((b, i) => [b.codigo, estiloDeLinea(b, i, resaltados)])),
    [bancos, resaltados],
  )
  const marcas = useMemo(() => Array.from({ length: maxPosicion }, (_, i) => i + 1), [maxPosicion])
  const hayResaltados = resaltados.length > 0

  return (
    <div className="flex flex-col gap-3">
      <ChartContainer config={{}} className="aspect-auto h-[380px] w-full" data-guia="comparar.grafico-posiciones">
        <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="periodo"
            tickFormatter={formatearPeriodo}
            tickLine={false}
            axisLine={false}
            padding={{ left: 16, right: 16 }}
            interval="preserveStartEnd"
          />
          <YAxis
            type="number"
            reversed
            domain={[1, maxPosicion]}
            ticks={marcas}
            interval={0}
            allowDecimals={false}
            width={28}
            tickLine={false}
            axisLine={false}
            padding={{ top: 8, bottom: 8 }}
          />
          <ChartTooltip content={<DetallePosiciones bancos={bancos} resaltados={resaltados} />} />
          {bancos.map((banco) => {
            const { color, ancho, opacidad, puntos: conPuntos } = estilos.get(banco.codigo)
            return (
              <Line
                key={banco.codigo}
                type="monotone"
                dataKey={banco.codigo}
                name={banco.nombre}
                stroke={color}
                strokeWidth={ancho}
                strokeOpacity={opacidad}
                dot={conPuntos ? { r: 4, fill: color, stroke: color } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                className="cursor-pointer"
                onClick={() => alElegirBanco?.(banco.codigo)}
              />
            )
          })}
        </LineChart>
      </ChartContainer>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          La posición 1 está arriba.{' '}
          {hayResaltados ? 'Los bancos resaltados son los que elegiste en la tabla y en la comparación.' : 'Elige un banco para resaltarlo.'}
        </p>
        <div role="group" aria-label="Bancos del gráfico" className="flex flex-wrap gap-1.5">
          {bancos.map((banco) => {
            const { color } = estilos.get(banco.codigo)
            const resaltado = resaltados.some((r) => r.codigo === banco.codigo)
            return (
              <button
                key={banco.codigo}
                type="button"
                aria-pressed={resaltado}
                onClick={() => alElegirBanco?.(banco.codigo)}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-foreground/40 aria-pressed:font-medium"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                {banco.nombre}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Globo del gráfico: el período y la posición de cada banco, de la mejor a la peor.
// Con bancos resaltados muestra solo esos, para no llenar la pantalla con 12 líneas.
function DetallePosiciones({ active, payload, label, resaltados }) {
  if (!active || !payload?.length) return null
  const codigosResaltados = new Set(resaltados.map((r) => r.codigo))
  const items = payload
    .filter((p) => typeof p.value === 'number' && (codigosResaltados.size === 0 || codigosResaltados.has(p.dataKey)))
    .sort((a, b) => a.value - b.value)
  if (items.length === 0) return null
  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{formatearPeriodo(label)}</div>
      {items.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.name}
          </span>
          <span className="cifra font-medium">{formatearEntero(item.value)}</span>
        </div>
      ))}
    </div>
  )
}
