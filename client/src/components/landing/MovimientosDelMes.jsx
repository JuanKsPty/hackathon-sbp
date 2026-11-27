import { ArrowDownIcon, ArrowLeftRightIcon, ArrowRightIcon, ArrowUpIcon, CalendarRangeIcon, MinusIcon } from 'lucide-react'
import { Etiqueta, SeccionGris, TituloDosTonos } from '@/components/marca'
import { Badge } from '@/components/ui/badge'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { cn } from '@/lib/utils'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { contarSignificativos, movimientosPrincipales } from './datosLanding.js'
import { ordinal, tono, variacionCorta } from './formatoLanding.js'

const MOTIVOS = {
  cambio_posicion: 'Cambio de posición',
  cambio_lider: 'Cambio de líder',
  var_saldo_pct: 'Variación de saldo',
}

const COLORES = { sube: 'text-sube bg-sube-fondo', baja: 'text-baja bg-baja-fondo', igual: 'text-muted-foreground bg-muted' }
const LIMITE = 6

const numero = new Intl.NumberFormat('es-PA')

// Movimientos del mes: los significativos más grandes frente al corte anterior, según la regla vigente
// del Administrador (GET /api/parametros). Se calculan con los rankings públicos de los dos períodos.
export function MovimientosDelMes({ datos }) {
  const { periodo, anterior, movimientos } = datos
  const comparacion = movimientos.datos?.comparacion ?? null
  const principales = comparacion ? movimientosPrincipales(comparacion, LIMITE) : []
  const total = comparacion ? contarSignificativos(comparacion) : 0
  const regla = movimientos.datos?.regla

  return (
    <SeccionGris role="region" aria-labelledby="titulo-movimientos" className="flex min-w-0 flex-col gap-5 sm:p-8">
      <div className="flex flex-col gap-3">
        <Etiqueta icono={ArrowLeftRightIcon}>Frente al corte anterior</Etiqueta>
        <TituloDosTonos
          id="titulo-movimientos"
          fuerte="Movimientos del mes"
          suave={anterior ? `del ${formatearPeriodo(anterior)} al ${formatearPeriodo(periodo)}` : undefined}
        />
        {anterior && total > 0 && (
          <p className="text-sm text-muted-foreground">
            {total > principales.length
              ? `Los ${formatearEntero(principales.length)} más grandes de ${formatearEntero(total)} movimientos significativos.`
              : `${formatearEntero(total)} ${total === 1 ? 'movimiento significativo' : 'movimientos significativos'}.`}
          </p>
        )}
      </div>

      <div data-guia="panel.movimientos" className="min-w-0">
        {periodo && !anterior && !movimientos.cargando ? (
          <Vacio
            icono={CalendarRangeIcon}
            titulo="No hay un corte anterior para comparar"
            descripcion={`${formatearPeriodo(periodo)} es el primer período cargado.`}
          />
        ) : (
          <EstadoBloque
            consulta={movimientos}
            filas={4}
            vacio={principales.length === 0}
            tituloVacio="Sin movimientos significativos"
            mensajeVacio={anterior ? `Entre el ${formatearPeriodo(anterior)} y el ${formatearPeriodo(periodo)} ningún banco cumplió la regla.` : undefined}
          >
            <ul className="grid gap-3 md:grid-cols-2">
              {principales.map((m) => (
                <FilaMovimiento key={`${m.Ranking}-${m.Codigo_Banco}`} movimiento={m} />
              ))}
            </ul>
          </EstadoBloque>
        )}
      </div>

      <ReglaVigente regla={regla} />
    </SeccionGris>
  )
}

function FilaMovimiento({ movimiento: m }) {
  const sentido = tono(m.Cambio_Posicion)
  const Icono = sentido === 'sube' ? ArrowUpIcon : sentido === 'baja' ? ArrowDownIcon : MinusIcon
  const varPct = variacionCorta(m.Var_Saldo_Pct)
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-tarjeta bg-card p-4 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 animate-aparecer dark:shadow-none dark:ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Badge variant="outline" className="w-fit">
            {m.Ranking}
          </Badge>
          <span className="font-medium break-words">{m.Banco}</span>
        </div>
        <span className={cn('cifra flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm font-medium', COLORES[sentido])}>
          <span className="sr-only">
            Posición {formatearEntero(m.Posicion_anterior)} a {formatearEntero(m.Posicion_actual)}
          </span>
          <span aria-hidden="true" className="flex items-center gap-1">
            <Icono className="size-3.5" />
            {ordinal(m.Posicion_anterior)}
            <ArrowRightIcon className="size-3" />
            {ordinal(m.Posicion_actual)}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="cifra text-xs text-muted-foreground">
          Saldo {m.Var_Saldo > 0 ? '+' : ''}
          {formatearMonto(m.Var_Saldo)}
          {varPct && <span className={cn('ml-1 font-medium', tono(m.Var_Saldo_Pct) === 'baja' ? 'text-baja' : 'text-sube')}>({varPct})</span>}
        </span>
        <span className="flex flex-wrap gap-1">
          {m.Motivos.map((motivo) => (
            <Badge key={motivo} variant={motivo === 'cambio_lider' ? 'destacado' : 'secondary'}>
              {MOTIVOS[motivo] ?? motivo}
            </Badge>
          ))}
        </span>
      </div>
    </li>
  )
}

// Criterios con que se decide qué es significativo (parámetros del Administrador).
function ReglaVigente({ regla }) {
  if (!regla) return null
  const criterios = []
  if (regla.min_cambio_posicion_abs != null) criterios.push(`cambia ${numero.format(regla.min_cambio_posicion_abs)} o más posiciones`)
  if (regla.cambio_lider) criterios.push('cambia el líder')
  if (regla.min_var_saldo_pct_abs != null) criterios.push(`su saldo varía ${numero.format(regla.min_var_saldo_pct_abs)} % o más`)
  if (criterios.length === 0) return null
  return <p className="text-xs text-muted-foreground">Un movimiento es significativo si {criterios.join(', o ')} (regla vigente del Administrador).</p>
}
