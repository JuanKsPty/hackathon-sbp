import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircle2Icon, MinusIcon, TriangleAlertIcon } from 'lucide-react'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'

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
export function ResumenCorte({ desde, movimientos, descomposicion }) {
  const { periodos, detallePeriodo, cargando, error, reintentar } = usePeriodo()
  const anterior = desde ? periodos.find((p) => p.Fecha === desde) ?? null : null
  const reconciliado = detallePeriodo?.Reconciliaciones_OK

  let contenido
  if (cargando) contenido = <Cargando filas={3} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (!detallePeriodo)
    contenido = <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su resumen." />
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
    <section data-guia="panel.indicadores" aria-label="Cifras clave del corte" className="flex flex-col gap-3">
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
