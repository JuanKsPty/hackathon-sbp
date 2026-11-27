import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { EJE, formatoCompacto } from './graficos.js'
import { MarcoGrafico } from './MarcoGrafico.jsx'
import { Seccion } from './Seccion.jsx'
import { SelectorRanking } from './SelectorRanking.jsx'

// Las tres piezas de GET /api/movimientos/descomposicion. Suman Var_Saldo exacto (lo calcula el API).
const CONFIG = {
  Nuevos: { label: 'Préstamos nuevos', color: 'var(--sube)' },
  Salen: { label: 'Préstamos que salen', color: 'var(--baja)' },
  Amortizacion: { label: 'Amortización', color: 'var(--chart-5)' },
}
const conSigno = (v) => (typeof v === 'number' && v > 0 ? `+${formatearMonto(v)}` : formatearMonto(v))

// Por qué cambió el saldo de cada banco en el ranking elegido: barras apiladas con préstamos nuevos
// (suman), préstamos que salen (restan) y amortización. Una sola llamada a
// GET /api/movimientos/descomposicion sin ranking ni banco trae todas las filas; aquí solo se filtran.
export function DescomposicionBancos({ desde, hasta, consulta }) {
  const filas = consulta.datos?.descomposicion ?? []
  const rankings = [...new Set(filas.map((f) => f.Ranking))]
  const [elegido, setElegido] = useState(null)
  const ranking = elegido && rankings.includes(elegido) ? elegido : rankings[0] ?? null

  const datos = filas
    .filter((f) => f.Ranking === ranking)
    .sort((a, b) => (b.Var_Saldo ?? 0) - (a.Var_Saldo ?? 0))
    .map((f) => ({
      banco: f.Banco,
      Nuevos: f.Nuevos?.Saldo ?? null,
      Salen: f.Salen?.Saldo ?? null,
      Amortizacion: f.Amortizacion?.Saldo ?? null,
      Var_Saldo: f.Var_Saldo,
      operaciones: { Nuevos: f.Nuevos?.Operaciones, Salen: f.Salen?.Operaciones, Amortizacion: f.Amortizacion?.Operaciones },
    }))

  return (
    <Seccion
      id="titulo-descomposicion"
      titulo="De dónde sale el cambio de cada banco"
      descripcion="Préstamos nuevos, préstamos que salen y amortización de los que continúan."
      accion={
        <Link to="/comparar" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}>
          Ver la evidencia en Comparar
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      }
    >
      <SelectorRanking etiqueta="Ranking de la descomposición" rankings={rankings} valor={ranking} onCambio={setElegido} />
      <MarcoGrafico
        titulo={ranking ? `Descomposición en ${ranking}` : 'Descomposición por banco'}
        descripcion={
          desde && hasta
            ? `${formatearPeriodo(desde)} → ${formatearPeriodo(hasta)}. Las tres piezas suman la variación del saldo de cada banco.`
            : 'Necesita un corte anterior para comparar.'
        }
        consulta={desde ? consulta : undefined}
        alto={12 * 34 + 60}
        vacio={!desde || datos.length === 0}
        mensajeVacio={desde ? 'El API no devolvió la descomposición para este ranking.' : 'Elige en el encabezado un período que tenga uno anterior.'}
      >
        <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height: Math.max(220, datos.length * 34 + 60) }}>
          <BarChart data={datos} layout="vertical" stackOffset="sign" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" {...EJE} tickFormatter={formatoCompacto} />
            <YAxis type="category" dataKey="banco" {...EJE} width={118} interval={0} tickFormatter={(v) => (v.length > 17 ? `${v.slice(0, 16)}.` : v)} />
            <ReferenceLine x={0} stroke="var(--border)" />
            <ChartTooltip cursor={{ fillOpacity: 0.2 }} content={<GloboBanco />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(CONFIG).map((clave, i) => (
              <Bar key={clave} dataKey={clave} name={CONFIG[clave].label} stackId="piezas" fill={`var(--color-${clave})`} radius={i === 2 ? [0, 4, 4, 0] : 0} />
            ))}
          </BarChart>
        </ChartContainer>
      </MarcoGrafico>
    </Seccion>
  )
}

function GloboBanco({ active, payload }) {
  const fila = active ? payload?.[0]?.payload : null
  if (!fila) return null
  return (
    <div className="grid min-w-52 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium">{fila.banco}</span>
      {Object.keys(CONFIG).map((clave) => (
        <span key={clave} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CONFIG[clave].color }} aria-hidden="true" />
            {CONFIG[clave].label}
          </span>
          <span className="cifra font-medium">
            {conSigno(fila[clave])} <span className="font-normal text-muted-foreground">({formatearEntero(fila.operaciones[clave])} op.)</span>
          </span>
        </span>
      ))}
      <span className="mt-0.5 flex justify-between gap-3 border-t pt-1">
        Variación del saldo <span className="cifra font-medium">{conSigno(fila.Var_Saldo)}</span>
      </span>
    </div>
  )
}
