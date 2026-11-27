import { ArrowRightIcon, CheckCircle2Icon, RadarIcon, TriangleAlertIcon } from 'lucide-react'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { BloqueOscuro, Cifra, Etiqueta, TituloDosTonos } from './marca.jsx'

// Compara dos cifras del API sin hacer cuentas: solo dice si subió, bajó o quedó igual (R2).
function tendencia(actual, anterior) {
  if (typeof actual !== 'number' || typeof anterior !== 'number') return null
  if (actual > anterior) return 'sube'
  if (actual < anterior) return 'baja'
  return 'igual'
}

const FLECHA = { sube: '▲', baja: '▼', igual: '=' }

function variacionFrente(actual, anterior, formatear, fechaAnterior) {
  const t = tendencia(actual, anterior)
  if (!t) return undefined
  return { tendencia: t, texto: `${FLECHA[t]} antes ${formatear(anterior)}`, titulo: `Al ${formatearPeriodo(fechaAnterior)}` }
}

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
      <div className="rounded-2xl bg-white p-4 text-foreground">
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
      <dl className="grid grid-cols-1 gap-x-6 gap-y-6 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <Cifra
          etiqueta="Saldo total válido"
          valor={formatearMonto(p.Saldo_Total_Valido)}
          variacion={anterior ? variacionFrente(p.Saldo_Total_Valido, anterior.Saldo_Total_Valido, formatearMonto, anterior.Fecha) : undefined}
        />
        <Cifra
          etiqueta="Préstamos en el universo válido"
          valor={formatearEntero(p.Universo_Local_Valido)}
          variacion={anterior ? variacionFrente(p.Universo_Local_Valido, anterior.Universo_Local_Valido, formatearEntero, anterior.Fecha) : undefined}
          detalle={
            continuidad
              ? `${formatearEntero(continuidad.Entran)} entran · ${formatearEntero(continuidad.Salen)} salen · ${formatearEntero(continuidad.Continuan)} continúan`
              : `${formatearEntero(p.Filas_Leidas)} filas leídas`
          }
        />
        <Cifra
          etiqueta="Movimientos significativos"
          valor={movimientos ? formatearEntero(significativos) : '—'}
          detalle={movimientos ? 'Según la regla vigente del Administrador' : anterior ? 'Cargando…' : 'Sin corte anterior para comparar'}
        />
        <Cifra
          etiqueta="Cambios de líder"
          valor={movimientos ? formatearEntero(cambiosLider.length) : '—'}
          detalle={cambiosLider.length > 0 ? cambiosLider.map((r) => `${r.Ranking}: ${r.Lider_actual?.Banco ?? 'sin líder'}`).join(' · ') : movimientos ? 'Ningún ranking cambió de líder' : undefined}
        />
      </dl>
    )
  }

  const reconciliado = detallePeriodo?.Reconciliaciones_OK

  return (
    <BloqueOscuro className="p-5 sm:p-8">
      <div data-guia="panel.indicadores" className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta icono={RadarIcon} className="bg-emerald-400/15 text-emerald-300">
              Panel del {nombrePerfil}
            </Etiqueta>
            {detallePeriodo && typeof reconciliado === 'boolean' && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${reconciliado ? 'bg-white/10 text-white/80' : 'bg-rose-400/15 text-rose-300'}`}
              >
                {reconciliado ? <CheckCircle2Icon className="size-3.5" aria-hidden="true" /> : <TriangleAlertIcon className="size-3.5" aria-hidden="true" />}
                {reconciliado ? 'Reconciliaciones OK' : 'Hay descuadres'}
              </span>
            )}
          </div>
          <TituloDosTonos
            como="h1"
            fuerte="Qué cambió"
            suave={detallePeriodo ? `al ${formatearPeriodo(detallePeriodo.Fecha)}` : 'en el período'}
            className="text-3xl text-white sm:text-5xl [&>span:last-child]:text-white/45"
          />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
            {detallePeriodo && (
              <>
                <span>Corte {formatearPeriodo(detallePeriodo.Fecha)}</span>
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                <span>{anterior ? `frente a ${formatearPeriodo(anterior.Fecha)}` : 'primer corte cargado'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs break-all">{detallePeriodo.Archivo}</span>
              </>
            )}
          </p>
        </div>
        {contenido}
      </div>
    </BloqueOscuro>
  )
}
