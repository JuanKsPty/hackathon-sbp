import { ArrowRightIcon, CheckCircle2Icon, RadarIcon, TriangleAlertIcon } from 'lucide-react'
import { BloqueOscuro, Cifra, Etiqueta, TituloDosTonos } from '@/components/marca'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'

// Compara dos cifras del API sin hacer cuentas: solo dice si subió, bajó o quedó igual (R2).
function tendencia(actual, anterior) {
  if (typeof actual !== 'number' || typeof anterior !== 'number') return null
  if (actual > anterior) return 'sube'
  if (actual < anterior) return 'baja'
  return 'igual'
}

// Variación para <Cifra>: la tendencia y el valor del corte anterior, tal como lo manda el API.
function variacionFrente(actual, anterior, formatear) {
  const t = tendencia(actual, anterior)
  return t ? { tendencia: t, texto: `antes ${formatear(anterior)}` } : undefined
}

// El saldo completo (12 cifras) no cabe a 30 px en 360: el valor de la Cifra baja a 24 px hasta sm.
const claseCifra = 'min-w-0 [&>p:nth-child(2)]:text-2xl [&>p:nth-child(2)]:break-words sm:[&>p:nth-child(2)]:text-3xl'

// Bloque oscuro del panel interno (#140): el período elegido, el corte anterior y las cifras clave
// con su variación. Las cifras salen de GET /api/periodos, GET /api/movimientos y
// GET /api/movimientos/descomposicion (Continuidad); aquí solo se comparan y se cuentan.
export function ResumenCorte({ nombrePerfil, desde, movimientos, descomposicion }) {
  const { periodos, detallePeriodo, cargando, error, reintentar } = usePeriodo()
  const anterior = desde ? periodos.find((p) => p.Fecha === desde) ?? null : null

  let contenido
  if (cargando) contenido = <Cargando filas={3} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (!detallePeriodo)
    contenido = (
      <div className="rounded-tarjeta bg-card p-4 text-card-foreground">
        <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su resumen." />
      </div>
    )
  else {
    const p = detallePeriodo
    const rankings = movimientos?.rankings ?? []
    const significativos = rankings.reduce((suma, r) => suma + (r.movimientos ?? []).filter((m) => m.Significativo !== false).length, 0)
    const cambiosLider = rankings.filter((r) => r.Cambio_Lider)
    const continuidad = descomposicion?.Continuidad

    contenido = (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Cifra
          className={claseCifra}
          etiqueta="Saldo total válido"
          valor={formatearMonto(p.Saldo_Total_Valido)}
          variacion={anterior ? variacionFrente(p.Saldo_Total_Valido, anterior.Saldo_Total_Valido, formatearMonto) : undefined}
        />
        <Cifra
          className={claseCifra}
          etiqueta="Préstamos en el universo válido"
          valor={formatearEntero(p.Universo_Local_Valido)}
          variacion={anterior ? variacionFrente(p.Universo_Local_Valido, anterior.Universo_Local_Valido, formatearEntero) : undefined}
          detalle={
            continuidad
              ? `${formatearEntero(continuidad.Entran)} entran · ${formatearEntero(continuidad.Salen)} salen`
              : `${formatearEntero(p.Filas_Leidas)} filas leídas`
          }
        />
        <Cifra
          className={claseCifra}
          etiqueta="Movimientos significativos"
          valor={movimientos ? formatearEntero(significativos) : '—'}
          detalle={movimientos ? 'Según la regla vigente' : anterior ? 'Cargando…' : 'Sin corte anterior para comparar'}
        />
        <Cifra
          className={claseCifra}
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

  const reconciliado = detallePeriodo?.Reconciliaciones_OK

  return (
    <BloqueOscuro className="animate-aparecer">
      <div data-guia="panel.indicadores" className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta icono={RadarIcon}>Panel del {nombrePerfil}</Etiqueta>
            {detallePeriodo && typeof reconciliado === 'boolean' && (
              <span
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium',
                  reconciliado ? 'bg-bloque-foreground/10 text-bloque-foreground' : 'bg-baja-fondo text-baja',
                )}
              >
                {reconciliado ? (
                  <CheckCircle2Icon className="size-3.5 text-brillo" aria-hidden="true" />
                ) : (
                  <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
                )}
                {reconciliado ? 'Reconciliaciones OK' : 'Hay descuadres'}
              </span>
            )}
          </div>
          <TituloDosTonos como="h1" fuerte="Qué cambió" suave={detallePeriodo ? `al ${formatearPeriodo(detallePeriodo.Fecha)}` : 'en el período'} />
          {detallePeriodo && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-bloque-muted">
              <span>Corte {formatearPeriodo(detallePeriodo.Fecha)}</span>
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              <span>{anterior ? `frente a ${formatearPeriodo(anterior.Fecha)}` : 'primer corte cargado'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs break-all">{detallePeriodo.Archivo}</span>
            </p>
          )}
        </div>
        {contenido}
      </div>
    </BloqueOscuro>
  )
}
