import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, ChartAreaIcon, CrownIcon, MinusIcon } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { rankings as pedirRankings } from '@/api/cliente.js'
import { tendenciaDePosiciones } from '@/components/comparar/series.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { buttonVariants } from '@/components/ui/button'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { Etiqueta, SeccionGris, Segmentado, TituloDosTonos } from '@/components/marca'
import { Tarjeta } from './Tarjeta.jsx'

// Eje en millones: 87562053.92 -> "87.6 M".
const compacto = new Intl.NumberFormat('es-PA', { notation: 'compact', maximumFractionDigits: 1 })

const rankingDe = (respuesta, ranking) => respuesta?.rankings?.find((r) => r.Ranking === ranking)

// "Analytics" del panel interno: evolución de posiciones por ranking. Segmentado de rankings, lista
// lateral con la posición de cada banco (el líder primero) y gráfico de área del banco elegido.
// Una petición a GET /api/rankings por período cargado hasta el elegido; no se calcula nada (R2).
export function EvolucionPosiciones() {
  const { periodos, periodo } = usePeriodo()
  const fechas = periodos.map((p) => p.Fecha).filter((f) => f && (!periodo || f <= periodo)).sort()
  const clave = fechas.join(',')
  const consulta = useConsulta(
    (opciones) => Promise.all(fechas.map((fecha) => pedirRankings({ periodo: fecha }, opciones))),
    [clave],
    { activa: fechas.length > 0 },
  )

  const [rankingElegido, setRanking] = useState(null)
  const [bancoElegido, setBanco] = useState(null)

  const respuestas = consulta.datos ?? []
  const ultima = respuestas.at(-1)
  const anterior = respuestas.length > 1 ? respuestas.at(-2) : null
  const nombres = (ultima?.rankings ?? []).map((r) => r.Ranking)
  const ranking = rankingElegido && nombres.includes(rankingElegido) ? rankingElegido : nombres[0] ?? null

  const bancos = (() => {
    const actual = rankingDe(ultima, ranking)?.bancos ?? []
    const previo = rankingDe(anterior, ranking)?.bancos ?? []
    return [...actual]
      .sort((a, b) => a.Posicion - b.Posicion)
      .map((b) => {
        const antes = previo.find((x) => x.Codigo_Banco === b.Codigo_Banco)?.Posicion ?? null
        return { ...b, Posicion_anterior: antes, tendencia: tendenciaDePosiciones(antes, b.Posicion) }
      })
  })()

  const banco = bancos.find((b) => b.Codigo_Banco === bancoElegido) ?? bancos[0] ?? null
  const serie = respuestas.map((r) => {
    const fila = rankingDe(r, ranking)?.bancos?.find((b) => b.Codigo_Banco === banco?.Codigo_Banco)
    return { periodo: r.periodo, saldo: fila?.Saldo_Actividad ?? null, posicion: fila?.Posicion ?? null, ponderacion: fila?.Ponderacion_Pct ?? null }
  })

  let contenido
  if (fechas.length === 0 && !periodo) contenido = <Vacio titulo="No hay períodos cargados" />
  else if (consulta.error) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (consulta.cargando || !consulta.datos) contenido = <Cargando filas={5} />
  else if (!ranking || bancos.length === 0) contenido = <Vacio titulo="Sin posiciones" descripcion="El API no devolvió rankings para estos períodos." />
  else {
    contenido = (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Tarjeta className="gap-2 p-3 sm:p-3" data-guia="panel.lideres">
          <p className="px-1 text-xs text-muted-foreground">
            Posición al {formatearPeriodo(ultima?.periodo)}
            {anterior ? ` frente a ${formatearPeriodo(anterior.periodo)}` : ''}. Elige un banco.
          </p>
          <ul className="flex max-h-[22rem] flex-col gap-0.5 overflow-y-auto">
            {bancos.map((b) => (
              <li key={b.Codigo_Banco}>
                <FilaBanco banco={b} elegido={b.Codigo_Banco === banco?.Codigo_Banco} alElegir={() => setBanco(b.Codigo_Banco)} />
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">
                {banco?.Posicion === 1 ? 'Líder de ' : 'Saldo en '}
                {ranking}
              </span>
              <span className="text-lg font-medium tracking-tight break-words">{banco?.Banco}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="cifra text-2xl font-medium tracking-tight">{formatearMonto(banco?.Saldo_Actividad)}</span>
              <span className="cifra text-xs text-muted-foreground">
                Posición {formatearEntero(banco?.Posicion)} · Ponderación {formatearPorcentaje(banco?.Ponderacion_Pct)}
              </span>
            </div>
          </div>
          <GraficoArea serie={serie} />
        </Tarjeta>
      </div>
    )
  }

  return (
    <SeccionGris role="region" className="flex flex-col gap-5 animate-aparecer" aria-labelledby="titulo-evolucion">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Etiqueta icono={ChartAreaIcon}>Analytics</Etiqueta>
          <TituloDosTonos fuerte={<span id="titulo-evolucion">Evolución de posiciones</span>} suave="por ranking" />
        </div>
        <Link to="/rankings" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-fit' })}>
          Ver rankings
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </div>
      {nombres.length > 0 && (
        <Segmentado
          ariaLabel="Ranking"
          opciones={nombres.map((n) => ({ valor: n, etiqueta: n }))}
          valor={ranking}
          onCambio={(valor) => {
            setRanking(valor)
            setBanco(null)
          }}
        />
      )}
      {contenido}
    </SeccionGris>
  )
}

function FilaBanco({ banco: b, elegido, alElegir }) {
  const Icono = b.tendencia === 'sube' ? ArrowUpIcon : b.tendencia === 'baja' ? ArrowDownIcon : MinusIcon
  const color = b.tendencia === 'sube' ? 'text-sube' : b.tendencia === 'baja' ? 'text-baja' : 'text-muted-foreground'
  const texto =
    b.tendencia === 'sube' ? `sube desde la ${b.Posicion_anterior}` : b.tendencia === 'baja' ? `baja desde la ${b.Posicion_anterior}` : b.tendencia === 'igual' ? 'se mantiene' : 'sin dato anterior'
  return (
    <button
      type="button"
      aria-pressed={elegido}
      onClick={alElegir}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        elegido && 'bg-muted',
      )}
    >
      <span
        className={cn(
          'cifra flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          b.Posicion === 1 ? 'bg-foreground text-background' : 'bg-muted text-foreground',
        )}
      >
        {b.Posicion === 1 ? <CrownIcon className="size-3.5" aria-label="Líder" /> : formatearEntero(b.Posicion)}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{b.Banco}</span>
      <span className={cn('flex shrink-0 items-center gap-0.5 text-xs', color)} title={texto}>
        <Icono className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{texto}</span>
        <span aria-hidden="true" className="cifra">
          {b.Posicion_anterior ?? '—'}
        </span>
      </span>
    </button>
  )
}

function GraficoArea({ serie }) {
  const id = useId().replace(/:/g, '')
  const config = { saldo: { label: 'Saldo', color: 'var(--sube)' } }
  if (serie.length < 2) {
    return <p className="text-sm text-muted-foreground">Con un solo período cargado aún no hay evolución que mostrar.</p>
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-[240px] w-full sm:h-[280px]">
      <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`relleno-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-saldo)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-saldo)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="periodo" tickFormatter={formatearPeriodo} tickLine={false} axisLine={false} padding={{ left: 12, right: 12 }} />
        <YAxis width={52} tickLine={false} axisLine={false} tickFormatter={(v) => compacto.format(v)} />
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<Globo />} />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="var(--color-saldo)"
          strokeWidth={2.5}
          fill={`url(#relleno-${id})`}
          dot={{ r: 3, fill: 'var(--color-saldo)', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}

function Globo({ active, payload }) {
  const punto = active ? payload?.[0]?.payload : null
  if (!punto) return null
  return (
    <div className="grid min-w-40 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium">{formatearPeriodo(punto.periodo)}</span>
      <span className="flex justify-between gap-3">
        Saldo <span className="cifra font-medium">{formatearMonto(punto.saldo)}</span>
      </span>
      <span className="flex justify-between gap-3">
        Posición <span className="cifra font-medium">{formatearEntero(punto.posicion)}</span>
      </span>
      <span className="flex justify-between gap-3">
        Ponderación <span className="cifra font-medium">{formatearPorcentaje(punto.ponderacion)}</span>
      </span>
    </div>
  )
}
