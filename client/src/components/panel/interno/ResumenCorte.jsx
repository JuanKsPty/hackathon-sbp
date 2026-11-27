import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircle2Icon, MinusIcon, TriangleAlertIcon } from 'lucide-react'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { useBancoPanel } from '@/contexto/BancoPanelContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { movimientosSignificativos, rankingsLiderados, respuestaDe } from './datosBanco.js'

// Compara dos cifras del API sin hacer cuentas: solo dice si subió, bajó o quedó igual (R2).
function tendencia(actual, anterior) {
  if (typeof actual !== 'number' || typeof anterior !== 'number') return null
  if (actual > anterior) return 'sube'
  if (actual < anterior) return 'baja'
  return 'igual'
}

const ICONOS = { sube: ArrowUpRightIcon, baja: ArrowDownRightIcon, igual: MinusIcon }

// Variación frente al corte anterior: la tendencia y el valor anterior, tal como lo manda el API.
function variacionFrente(actual, anterior, formatear) {
  const t = tendencia(actual, anterior)
  return t ? { tendencia: t, texto: `antes ${formatear(anterior)}` } : null
}

function Indicador({ etiqueta, valor, variacion, detalle }) {
  const Icono = variacion ? ICONOS[variacion.tendencia] : null
  return (
    <Card className="min-w-0 gap-3" size="sm">
      <CardHeader>
        <CardDescription>{etiqueta}</CardDescription>
        <p className="cifra text-2xl font-semibold tracking-tight break-words tabular-nums">{valor}</p>
      </CardHeader>
      {(variacion || detalle) && (
        <CardFooter className="flex flex-wrap items-center gap-2 border-t-0 bg-transparent pt-0 text-xs text-muted-foreground">
          {variacion && (
            <Badge variant={variacion.tendencia} className="cifra">
              <Icono aria-hidden="true" />
              {variacion.texto}
            </Badge>
          )}
          {detalle && <span>{detalle}</span>}
        </CardFooter>
      )}
    </Card>
  )
}

// Cifras clave del corte elegido frente al anterior (#140). Salen de GET /api/periodos,
// GET /api/movimientos y GET /api/movimientos/descomposicion (Continuidad); aquí solo se comparan y se cuentan.
// Con banco (#204), las cifras de ese banco: GET /api/productos?banco= (consultaBanco, una respuesta por corte).
export function ResumenCorte({ desde, movimientos, descomposicion, consultaBanco }) {
  const { periodos, detallePeriodo, cargando, error, reintentar } = usePeriodo()
  const { banco, nombreBanco } = useBancoPanel()
  const anterior = desde ? periodos.find((p) => p.Fecha === desde) ?? null : null
  const reconciliado = detallePeriodo?.Reconciliaciones_OK

  let contenido
  if (cargando) contenido = <Cargando filas={3} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (!detallePeriodo)
    contenido = <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su resumen." />
  else if (banco)
    contenido = (
      <CifrasDelBanco consulta={consultaBanco} periodo={detallePeriodo.Fecha} desde={desde} movimientos={movimientos} banco={banco} nombreBanco={nombreBanco} />
    )
  else {
    const p = detallePeriodo
    const rankings = movimientos?.rankings ?? []
    const significativos = rankings.reduce((suma, r) => suma + (r.movimientos ?? []).filter((m) => m.Significativo !== false).length, 0)
    const cambiosLider = rankings.filter((r) => r.Cambio_Lider)
    const continuidad = descomposicion?.Continuidad

    contenido = (
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Indicador
          etiqueta="Saldo total válido"
          valor={formatearMonto(p.Saldo_Total_Valido)}
          variacion={anterior ? variacionFrente(p.Saldo_Total_Valido, anterior.Saldo_Total_Valido, formatearMonto) : null}
        />
        <Indicador
          etiqueta="Préstamos en el universo válido"
          valor={formatearEntero(p.Universo_Local_Valido)}
          variacion={anterior ? variacionFrente(p.Universo_Local_Valido, anterior.Universo_Local_Valido, formatearEntero) : null}
          detalle={continuidad ? `${formatearEntero(continuidad.Entran)} entran · ${formatearEntero(continuidad.Salen)} salen` : `${formatearEntero(p.Filas_Leidas)} filas leídas`}
        />
        <Indicador
          etiqueta="Movimientos significativos"
          valor={movimientos ? formatearEntero(significativos) : '—'}
          detalle={movimientos ? 'Según la regla vigente' : anterior ? 'Cargando…' : 'Sin corte anterior para comparar'}
        />
        <Indicador
          etiqueta="Cambios de líder"
          valor={movimientos ? formatearEntero(cambiosLider.length) : '—'}
          detalle={
            cambiosLider.length > 0
              ? cambiosLider.map((r) => `${r.Ranking}: ${r.Lider_actual?.Banco ?? 'sin líder'}`).join(' · ')
              : movimientos
                ? 'Ningún ranking cambió de líder'
                : undefined
          }
        />
      </div>
    )
  }

  return (
    <section data-guia="panel.indicadores" aria-label={banco ? `Cifras clave de ${nombreBanco} en el corte` : 'Cifras clave del corte'} className="flex flex-col gap-3">
      {detallePeriodo && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Corte {formatearPeriodo(detallePeriodo.Fecha)}</span>
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          <span>{anterior ? `frente a ${formatearPeriodo(anterior.Fecha)}` : 'primer corte cargado'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-xs break-all">{detallePeriodo.Archivo}</span>
          {typeof reconciliado === 'boolean' && (
            <Badge variant={reconciliado ? 'sube' : 'baja'}>
              {reconciliado ? <CheckCircle2Icon aria-hidden="true" /> : <TriangleAlertIcon aria-hidden="true" />}
              {reconciliado ? 'Reconciliaciones OK' : 'Hay descuadres'}
            </Badge>
          )}
        </div>
      )}
      {contenido}
    </section>
  )
}

// Las cifras del banco elegido en el corte, frente al anterior si lo hay. Todas vienen del bloque
// `banco` de GET /api/productos; los movimientos, de GET /api/movimientos filtrados por Codigo_Banco.
function CifrasDelBanco({ consulta, periodo, desde, movimientos, banco, nombreBanco }) {
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (!consulta.datos) return <Cargando filas={3} />
  const actual = respuestaDe(consulta.datos, periodo)?.banco ?? null
  const previo = desde ? (respuestaDe(consulta.datos, desde)?.banco ?? null) : null
  if (!actual) return <Vacio titulo={`Sin cifras de ${nombreBanco}`} descripcion="El API no devolvió el detalle de este banco para el corte." />

  const liderados = rankingsLiderados(actual)
  const suyos = movimientosSignificativos(movimientos, banco)
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <Indicador
        etiqueta={`Cartera válida · ${nombreBanco}`}
        valor={formatearMonto(actual.Total_Cartera_Local_Valida)}
        variacion={previo ? variacionFrente(actual.Total_Cartera_Local_Valida, previo.Total_Cartera_Local_Valida, formatearMonto) : null}
        detalle={`${formatearEntero(actual.Operaciones_Validas)} préstamos válidos`}
      />
      <Indicador
        etiqueta={`Participación de ${nombreBanco} en el sistema`}
        valor={formatearPorcentaje(actual.Participacion_Pct)}
        variacion={previo ? variacionFrente(actual.Participacion_Pct, previo.Participacion_Pct, formatearPorcentaje) : null}
        detalle={`Posición ${formatearEntero(actual.Posicion_Cartera)} por cartera${previo ? ` (antes ${formatearEntero(previo.Posicion_Cartera)})` : ''}`}
      />
      <Indicador
        etiqueta={`Rankings que lidera ${nombreBanco}`}
        valor={formatearEntero(actual.Rankings_Liderados)}
        detalle={liderados.length > 0 ? liderados.join(' · ') : 'No lidera ningún ranking'}
      />
      <Indicador
        etiqueta={`Movimientos significativos · ${nombreBanco}`}
        valor={movimientos ? formatearEntero(suyos.length) : '—'}
        detalle={
          movimientos
            ? suyos.length > 0
              ? suyos.map((m) => `${m.Ranking}: ${formatearEntero(m.Posicion_anterior)} → ${formatearEntero(m.Posicion_actual)}`).join(' · ')
              : 'Sin movimientos significativos en este corte'
            : desde
              ? 'Cargando…'
              : 'Sin corte anterior para comparar'
        }
      />
    </div>
  )
}
