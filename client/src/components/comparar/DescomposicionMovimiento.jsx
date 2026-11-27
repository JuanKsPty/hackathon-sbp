import { useMemo } from 'react'
import { InfoIcon, MousePointerClickIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import { movimientosDescomposicion as pedirDescomposicion } from '@/api/cliente.js'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { Estado } from './Estado.jsx'

// Las tres piezas del API (contracts/consulta.md) con su explicación. Suman Var_Saldo exacto.
const PIEZAS = [
  { clave: 'Nuevos', titulo: 'Préstamos nuevos', explicacion: 'Préstamos que no estaban en el período inicial y entran con su saldo.' },
  { clave: 'Salen', titulo: 'Préstamos que salen', explicacion: 'Préstamos que estaban en el período inicial y ya no están; su saldo resta.' },
  { clave: 'Amortizacion', titulo: 'Amortización', explicacion: 'Cambio de saldo de los préstamos que continúan en los dos períodos.' },
]

// Eje en millones para que quepa en pantalla: 3656013.27 -> "3.7 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })

const claseDeSigno = (valor) => (valor > 0 ? 'text-sube' : valor < 0 ? 'text-baja' : 'text-igual')
const conSigno = (valor) => (typeof valor === 'number' && valor > 0 ? `+${formatearMonto(valor)}` : formatearMonto(valor))

// Por qué cambió el saldo de un banco entre dos períodos (GET /api/movimientos/descomposicion).
// Sin banco elegido, invita a hacer clic en una fila de la tabla de movimientos.
export function DescomposicionMovimiento({ desde, hasta, ranking, banco, activa }) {
  const pedir = Boolean(activa && banco && ranking)
  const consulta = useConsulta(
    (opciones) => pedirDescomposicion({ desde, hasta, ranking, banco }, opciones),
    [desde, hasta, ranking, banco],
    { activa: pedir },
  )

  if (!banco) {
    return (
      <Vacio
        icono={MousePointerClickIcon}
        titulo="Elige un banco en la tabla"
        descripcion="Haz clic en una fila de la tabla de movimientos para ver por qué cambió el saldo de ese banco: préstamos nuevos, préstamos que salen y amortización."
      />
    )
  }

  const fila = consulta.datos?.descomposicion?.[0]
  return (
    <Estado
      consulta={consulta}
      activa={pedir}
      vacio={!fila}
      tituloVacio="Sin descomposición"
      descripcionVacio="El API no devolvió datos para ese banco en este ranking y estos períodos."
    >
      {fila && <Detalle fila={fila} continuidad={consulta.datos.Continuidad} desde={desde} hasta={hasta} />}
    </Estado>
  )
}

function Detalle({ fila, continuidad, desde, hasta }) {
  const datos = useMemo(
    () => PIEZAS.map((p) => ({ clave: p.clave, nombre: p.titulo, saldo: fila[p.clave]?.Saldo, operaciones: fila[p.clave]?.Operaciones })),
    [fila],
  )
  const config = { saldo: { label: 'Saldo' } }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-medium">
          {fila.Banco} <span className="text-xs font-normal text-muted-foreground">{fila.Codigo_Banco}</span>
          <span className="font-normal text-muted-foreground"> · {fila.Ranking}</span>
        </p>
        <dl className="mt-2 grid gap-3 sm:grid-cols-3">
          <Dato titulo={`Saldo al ${formatearPeriodo(desde)}`}>{formatearMonto(fila.Saldo_anterior)}</Dato>
          <Dato titulo="Variación del saldo" clase={claseDeSigno(fila.Var_Saldo)}>
            {conSigno(fila.Var_Saldo)}
          </Dato>
          <Dato titulo={`Saldo al ${formatearPeriodo(hasta)}`}>{formatearMonto(fila.Saldo_actual)}</Dato>
        </dl>
      </div>

      <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
        <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => compacto.format(v)} />
          <YAxis type="category" dataKey="nombre" width={130} tickLine={false} axisLine={false} interval={0} />
          <ReferenceLine x={0} stroke="var(--border)" />
          <ChartTooltip
            cursor={{ fillOpacity: 0.3 }}
            content={<ChartTooltipContent hideLabel formatter={(valor, nombre, item) => <Globo valor={valor} nombre={item?.payload?.nombre} />} />}
          />
          <Bar dataKey="saldo" radius={4} isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.clave} fill={d.saldo < 0 ? 'var(--baja)' : 'var(--sube)'} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="grid gap-3 md:grid-cols-3">
        {PIEZAS.map((p) => {
          const pieza = fila[p.clave]
          return (
            <div key={p.clave} className="flex flex-col gap-1 rounded-lg border p-3">
              <p className="text-sm font-medium">{p.titulo}</p>
              <p className={`cifra text-lg font-semibold ${claseDeSigno(pieza?.Saldo)}`}>{conSigno(pieza?.Saldo)}</p>
              <p className="text-xs text-muted-foreground">
                <span className="cifra">{formatearEntero(pieza?.Operaciones)}</span> operaciones
              </p>
              <p className="text-xs text-muted-foreground">{p.explicacion}</p>
            </div>
          )
        })}
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Las tres piezas suman la variación del saldo.</span>
        {continuidad && (
          <span>
            En todo el universo válido, <span className="cifra">{formatearEntero(continuidad.Continuan)}</span> préstamos continúan,{' '}
            <span className="cifra">{formatearEntero(continuidad.Entran)}</span> entran y{' '}
            <span className="cifra">{formatearEntero(continuidad.Salen)}</span> salen.
          </span>
        )}
      </p>
    </div>
  )
}

function Dato({ titulo, clase = '', children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className={`cifra text-base font-semibold ${clase}`}>{children}</dd>
    </div>
  )
}

function Globo({ valor, nombre }) {
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="text-muted-foreground">{nombre}</span>
      <span className="cifra font-medium">{conSigno(valor)}</span>
    </span>
  )
}
