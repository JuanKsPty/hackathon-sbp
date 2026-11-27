import { Link } from 'react-router'
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CalendarRangeIcon, CrownIcon, MinusIcon, SparklesIcon } from 'lucide-react'
import { ExplicacionesMovimientos } from '@/components/asistente/ExplicacionesMovimientos.jsx'
import { ReglaVigente } from '@/components/comparar/ReglaVigente.jsx'
import { nombreDeMotivo } from '@/components/comparar/movimientos.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { buttonVariants } from '@/components/ui/button'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { Etiqueta, SeccionGris, Tarjeta, TituloDosTonos } from './marca.jsx'

const MAXIMO = 4

// Las tres piezas de GET /api/movimientos/descomposicion: suman Var_Saldo exacto (lo calcula el API).
const PIEZAS = [
  { clave: 'Nuevos', titulo: 'Nuevos' },
  { clave: 'Salen', titulo: 'Salen' },
  { clave: 'Amortizacion', titulo: 'Amortización' },
]

const conSigno = (valor, texto) => (typeof valor === 'number' && valor > 0 ? `+${texto}` : texto)
const claseSigno = (valor) => (valor > 0 ? 'text-sube' : valor < 0 ? 'text-baja' : 'text-muted-foreground')

// Movimientos significativos del corte con la descomposición de su saldo (préstamos nuevos, que salen
// y amortización) y su explicación (IA o reglas). Todo sale de GET /api/movimientos y
// GET /api/movimientos/descomposicion; la explicación la pide ExplicacionesMovimientos.
export function MovimientosExplicados({ desde, hasta, consultaMovimientos, consultaDescomposicion }) {
  const datos = consultaMovimientos.datos
  const filasDescomposicion = consultaDescomposicion.datos?.descomposicion ?? []
  const buscarPiezas = (ranking, banco) => filasDescomposicion.find((f) => f.Ranking === ranking && f.Codigo_Banco === banco) ?? null

  const rankings = datos?.rankings ?? []
  const cambiosLider = rankings.filter((r) => r.Cambio_Lider)
  const lista = rankings
    .flatMap((r) => (r.movimientos ?? []).filter((m) => m.Significativo !== false).map((m) => ({ ...m, Ranking: r.Ranking })))
    .sort((a, b) => Math.abs(b.Cambio_Posicion ?? 0) - Math.abs(a.Cambio_Posicion ?? 0) || Math.abs(b.Var_Saldo_Pct ?? 0) - Math.abs(a.Var_Saldo_Pct ?? 0))

  let contenido
  if (!desde) {
    contenido = (
      <Vacio
        icono={CalendarRangeIcon}
        titulo="No hay un período anterior para comparar"
        descripcion={hasta ? `${formatearPeriodo(hasta)} es el primer período cargado. Elige uno posterior en el encabezado.` : undefined}
      />
    )
  } else if (consultaMovimientos.error) {
    contenido = <ErrorApi error={consultaMovimientos.error} alReintentar={consultaMovimientos.reintentar} />
  } else if (!datos) {
    contenido = <Cargando filas={4} />
  } else if (lista.length === 0 && cambiosLider.length === 0) {
    contenido = (
      <Vacio
        titulo="Sin movimientos significativos"
        descripcion={`Entre ${formatearPeriodo(desde)} y ${formatearPeriodo(hasta)} ningún banco cumplió la regla ni cambió el líder.`}
      />
    )
  } else {
    contenido = (
      <div className="flex flex-col gap-4">
        {cambiosLider.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-xl bg-destacado-fondo p-3 text-sm text-destacado">
            {cambiosLider.map((r) => (
              <li key={r.Ranking} className="flex flex-wrap items-center gap-x-1.5">
                <CrownIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="font-medium">{r.Ranking}:</span>
                <span>{r.Lider_anterior?.Banco ?? 'sin líder'}</span>
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">pasa a</span>
                <span className="font-semibold">{r.Lider_actual?.Banco ?? 'sin líder'}</span>
              </li>
            ))}
          </ul>
        )}
        <ul className="flex flex-col gap-3">
          {lista.slice(0, MAXIMO).map((m) => (
            <FilaMovimiento key={`${m.Ranking}-${m.Codigo_Banco}`} movimiento={m} piezas={buscarPiezas(m.Ranking, m.Codigo_Banco)} cargandoPiezas={consultaDescomposicion.cargando} />
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {lista.length > MAXIMO
              ? `Se muestran ${formatearEntero(MAXIMO)} de ${formatearEntero(lista.length)}, los de mayor cambio de posición.`
              : `${formatearEntero(lista.length)} ${lista.length === 1 ? 'movimiento' : 'movimientos'} en total.`}
          </p>
          <Link to="/comparar" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-full' })}>
            Ver todos en Comparar
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
        <ReglaVigente regla={datos.regla_significativo} />
      </div>
    )
  }

  return (
    <SeccionGris aria-labelledby="titulo-movimientos">
      <div className="flex flex-col gap-2">
        <Etiqueta icono={SparklesIcon}>Movimientos</Etiqueta>
        <TituloDosTonos
          fuerte={<span id="titulo-movimientos">Movimientos significativos</span>}
          suave="y por qué ocurrieron"
        />
        {desde && hasta && (
          <p className="text-sm text-muted-foreground">
            {formatearPeriodo(desde)} → {formatearPeriodo(hasta)}. Cada saldo se descompone en préstamos nuevos, préstamos que salen y
            amortización de los que continúan.
          </p>
        )}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta data-guia="panel.movimientos">{contenido}</Tarjeta>
        <ExplicacionesMovimientos guia="panel.explicaciones" className="rounded-2xl border-0 shadow-sm ring-1 ring-border/60" />
      </div>
    </SeccionGris>
  )
}

function FilaMovimiento({ movimiento: m, piezas, cargandoPiezas }) {
  const sube = m.Cambio_Posicion > 0
  const baja = m.Cambio_Posicion < 0
  const Icono = sube ? ArrowUpIcon : baja ? ArrowDownIcon : MinusIcon
  const color = sube ? 'text-sube bg-sube-fondo' : baja ? 'text-baja bg-baja-fondo' : 'text-muted-foreground bg-muted'
  const varPct = m.Var_Saldo_Pct === null || m.Var_Saldo_Pct === undefined ? null : conSigno(m.Var_Saldo_Pct, formatearPorcentaje(m.Var_Saldo_Pct))

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium break-words">{m.Banco}</span>
          <span className="text-xs text-muted-foreground">{m.Ranking}</span>
        </div>
        <span className={cn('cifra inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color)}>
          <span className="sr-only">
            {sube ? 'Sube' : baja ? 'Baja' : 'Se mantiene'} de la posición {formatearEntero(m.Posicion_anterior)} a la {formatearEntero(m.Posicion_actual)}
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1">
            <Icono className="size-3.5" />
            {formatearEntero(m.Posicion_anterior)}
            <ArrowRightIcon className="size-3" />
            {formatearEntero(m.Posicion_actual)}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={cn('cifra text-sm font-medium', claseSigno(m.Var_Saldo))}>
          Saldo {conSigno(m.Var_Saldo, formatearMonto(m.Var_Saldo))}
          {varPct && <span className="font-normal text-muted-foreground"> ({varPct})</span>}
        </span>
        <span className="flex flex-wrap gap-1">
          {(m.Motivos ?? []).map((motivo) => (
            <span key={motivo} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {nombreDeMotivo(motivo)}
            </span>
          ))}
        </span>
      </div>
      {piezas ? (
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-2 dark:bg-muted/40" aria-label="Descomposición del cambio de saldo">
          {PIEZAS.map((p) => {
            const pieza = piezas[p.clave]
            return (
              <div key={p.clave} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[11px] text-muted-foreground">{p.titulo}</dt>
                <dd className={cn('cifra truncate text-xs font-medium sm:text-sm', claseSigno(pieza?.Saldo))} title={formatearMonto(pieza?.Saldo)}>
                  {conSigno(pieza?.Saldo, formatearMonto(pieza?.Saldo))}
                </dd>
                <dd className="cifra text-[11px] text-muted-foreground">{formatearEntero(pieza?.Operaciones)} op.</dd>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">{cargandoPiezas ? 'Cargando la descomposición…' : 'Sin descomposición para este banco.'}</p>
      )}
    </li>
  )
}
