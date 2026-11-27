import { Bar, BarChart, Cell, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { EJE } from './graficos.js'
import { GloboGrafico, MarcoGrafico } from './MarcoGrafico.jsx'

// Las cuatro exclusiones de la cascada (sección 7). Cada una con su propia escala: E2 suele ser
// mucho mayor que las demás y en un solo gráfico las aplastaría.
const EXCLUSIONES = [
  { campo: 'E1_Duplicados', nombre: 'E1 · Duplicados' },
  { campo: 'E2_Destino_Extranjero', nombre: 'E2 · Destino extranjero' },
  { campo: 'E3_Saldo_No_Positivo', nombre: 'E3 · Saldo ≤ 0' },
  { campo: 'E4_Actividad_No_Catalogada', nombre: 'E4 · Actividad no catalogada' },
]

// Filas excluidas E1–E4 en cada corte (GET /api/calidad sin período: todos los cortes).
// El corte elegido va en naranja y los demás en gris.
export function CalidadPorCorte({ consulta }) {
  const { periodo } = usePeriodo()
  const cortes = [...(consulta.datos?.periodos ?? [])].sort((a, b) => a.Fecha.localeCompare(b.Fecha))

  return (
    <MarcoGrafico
      titulo="Exclusiones por corte"
      descripcion="Filas que la cascada E1 → E4 deja fuera del universo válido, en cada corte."
      consulta={consulta}
      vacio={cortes.length === 0}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {EXCLUSIONES.map((e) => {
          const datos = cortes.map((c) => ({ periodo: c.Fecha, valor: c[e.campo] ?? null }))
          const actual = cortes.find((c) => c.Fecha === periodo) ?? cortes.at(-1)
          return (
            <div key={e.campo} className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/50 p-3">
              <span className="text-[11px] text-muted-foreground">{e.nombre}</span>
              <span className="cifra text-xl font-medium tracking-tight">{formatearEntero(actual?.[e.campo])}</span>
              <ChartContainer config={{ valor: { label: e.nombre, color: 'var(--chart-4)' } }} className="aspect-auto h-[90px] w-full">
                <BarChart data={datos} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="periodo" {...EJE} tick={{ fontSize: 10 }} tickFormatter={(f) => formatearPeriodo(f).split(' ').slice(1, 2).join(' ')} />
                  <ChartTooltip cursor={{ fillOpacity: 0.2 }} content={<GloboGrafico titulo={(l) => formatearPeriodo(l)} formatear={(v) => formatearEntero(v)} />} />
                  <Bar dataKey="valor" name="Filas" radius={[4, 4, 0, 0]}>
                    {datos.map((d) => (
                      <Cell key={d.periodo} fill={d.periodo === (actual?.Fecha ?? '') ? 'var(--chart-2)' : 'var(--chart-5)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )
        })}
      </div>
    </MarcoGrafico>
  )
}
