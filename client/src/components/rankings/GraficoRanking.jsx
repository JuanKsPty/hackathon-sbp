import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatearMonto, formatearPorcentaje } from '@/lib/formato.js'

// Qué se grafica: el saldo de la actividad o la ponderación dentro de la cartera del banco.
const METRICAS = {
  saldo: { campo: 'Saldo_Actividad', etiqueta: 'Saldo de la actividad', color: 'var(--chart-1)', formato: formatearMonto },
  ponderacion: { campo: 'Ponderacion_Pct', etiqueta: 'Ponderación', color: 'var(--chart-2)', formato: formatearPorcentaje },
}

// Eje en millones para que quepa en pantalla: 87562053.92 -> "87.6 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })

// Barras horizontales, una por banco, en el orden del ranking. Un clic en una barra elige ese banco.
export function GraficoRanking({ bancos, bancoResaltado, alElegirBanco }) {
  const [metrica, setMetrica] = useState('saldo')
  const { campo, etiqueta, color, formato } = METRICAS[metrica]

  const datos = [...bancos]
    .sort((a, b) => a.Posicion - b.Posicion)
    .map((b) => ({ codigo: b.Codigo_Banco, nombre: `${b.Posicion}. ${b.Banco}`, valor: b[campo] }))

  const config = { valor: { label: etiqueta, color } }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Valor del gráfico">
        {Object.entries(METRICAS).map(([clave, m]) => (
          <Button
            key={clave}
            size="sm"
            variant={clave === metrica ? 'default' : 'outline'}
            aria-pressed={clave === metrica}
            onClick={() => setMetrica(clave)}
          >
            {m.etiqueta}
          </Button>
        ))}
      </div>
      <ChartContainer config={config} className="aspect-auto h-[420px] w-full" data-guia="rankings.grafico">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (metrica === 'saldo' ? compacto.format(v) : `${v} %`)}
          />
          <YAxis type="category" dataKey="nombre" width={170} tickLine={false} axisLine={false} interval={0} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.3 }}
            content={<ChartTooltipContent formatter={(v) => <span className="cifra font-medium">{formato(v)}</span>} />}
          />
          <Bar
            dataKey="valor"
            radius={4}
            className="cursor-pointer"
            onClick={(dato) => alElegirBanco?.(dato?.payload?.codigo ?? dato?.codigo)}
          >
            {datos.map((d) => (
              <Cell
                key={d.codigo}
                fill="var(--color-valor)"
                fillOpacity={!bancoResaltado || bancoResaltado === d.codigo ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
