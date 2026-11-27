import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CalendarRangeIcon, CrownIcon, LockIcon, MinusIcon } from 'lucide-react'
import { movimientos as pedirMovimientos } from '@/api/cliente.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { periodoAnterior } from '@/lib/periodos.js'
import { EstadoBloque } from './EstadoBloque.jsx'

// Por qué un movimiento es significativo (Motivos de GET /api/movimientos).
const MOTIVOS = {
  cambio_posicion: 'Cambio de posición',
  cambio_lider: 'Cambio de líder',
  var_saldo_pct: 'Variación de saldo',
}

// El API manda los montos y porcentajes sin signo explícito: solo se agrega el "+" al mostrarlos.
const conSigno = (valor, texto) => (typeof valor === 'number' && valor > 0 ? `+${texto}` : texto)

// Movimientos significativos entre el período anterior al elegido y el elegido
// (GET /api/movimientos?desde&hasta&solo_significativos=true), con los cambios de líder.
// GET /api/movimientos es solo de Analista y Administrador: Público ve un aviso y no se hace la petición.
// Todas las cifras salen del API (R2).
export function MovimientosSignificativos() {
  const { perfil } = usePerfil()
  const { periodos, periodo } = usePeriodo()
  const [ranking, setRanking] = useState('')

  const permitido = perfil === 'analista' || perfil === 'admin'
  const desde = periodo ? periodoAnterior(periodos, periodo) : null
  const activa = permitido && Boolean(desde && periodo)

  const consulta = useConsulta(
    // PerfilContext fija el X-Perfil al cambiar de perfil, antes de volver a pedir.
    (opciones) => pedirMovimientos({ desde, hasta: periodo, solo_significativos: true }, opciones),
    [perfil, desde, periodo],
    { activa },
  )

  // useConsulta conserva la última respuesta aunque la consulta quede inactiva (otro perfil, primer período).
  const datos = activa ? consulta.datos : null
  // Con solo_significativos=true el API ya filtra; el filtro por Significativo es solo un resguardo.
  const conMovimientos = (datos?.rankings ?? [])
    .map((r) => ({ ...r, movimientos: (r.movimientos ?? []).filter((m) => m.Significativo !== false) }))
    .filter((r) => r.Cambio_Lider || r.movimientos.length > 0)
  const cambiosDeLider = conMovimientos.filter((r) => r.Cambio_Lider)
  const total = conMovimientos.reduce((suma, r) => suma + r.movimientos.length, 0)
  const visibles = ranking && conMovimientos.some((r) => r.Ranking === ranking) ? conMovimientos.filter((r) => r.Ranking === ranking) : conMovimientos
  const tramo = datos ? `${formatearPeriodo(datos.periodo_anterior)} → ${formatearPeriodo(datos.periodo_actual)}` : null

  let contenido
  if (!permitido) {
    contenido = (
      <Alert>
        <LockIcon aria-hidden="true" />
        <AlertTitle>Opción del Analista</AlertTitle>
        <AlertDescription>
          Los movimientos entre períodos son una opción del perfil Analista. Cambia de perfil en el encabezado para verlos.
        </AlertDescription>
      </Alert>
    )
  } else if (periodo && !desde && periodos.length > 0) {
    contenido = (
      <Vacio
        icono={CalendarRangeIcon}
        titulo="No hay un período anterior para comparar"
        descripcion={`${formatearPeriodo(periodo)} es el primer período cargado. Elige uno posterior en el encabezado para ver sus movimientos.`}
      />
    )
  } else {
    contenido = (
      <EstadoBloque
        consulta={consulta}
        filas={4}
        vacio={conMovimientos.length === 0}
        tituloVacio="Sin movimientos significativos"
        mensajeVacio={tramo ? `Entre ${tramo} ningún banco cumplió la regla de movimiento significativo ni cambió el líder.` : undefined}
      >
        <div className="flex flex-col gap-4">
          <CambiosDeLider rankings={cambiosDeLider} />

          {conMovimientos.length > 1 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por ranking">
              {['', ...conMovimientos.map((r) => r.Ranking)].map((opcion) => (
                <Button
                  key={opcion || 'todos'}
                  variant={ranking === opcion ? 'secondary' : 'ghost'}
                  size="xs"
                  aria-pressed={ranking === opcion}
                  onClick={() => setRanking(opcion)}
                >
                  {opcion || 'Todos'}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {visibles
              .filter((r) => r.movimientos.length > 0)
              .map((r) => (
                <section key={r.Ranking} aria-label={r.Ranking} className="flex flex-col">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground">{r.Ranking}</h3>
                  <ul className="flex flex-col divide-y">
                    {r.movimientos.map((m) => (
                      <FilaMovimiento key={m.Codigo_Banco} movimiento={m} />
                    ))}
                  </ul>
                </section>
              ))}
          </div>

          <ReglaVigente regla={datos?.regla_significativo} />
        </div>
      </EstadoBloque>
    )
  }

  return (
    <Card data-guia="panel.movimientos" className="min-w-0">
      <CardHeader>
        <CardTitle>Movimientos significativos</CardTitle>
        <CardDescription>{tramo ?? 'Cambios frente al período anterior al elegido en el encabezado'}</CardDescription>
        {permitido && (
          <CardAction className="flex flex-col items-end gap-2">
            {datos && total > 0 && (
              <Badge variant="secondary" className="cifra">
                {formatearEntero(total)} {total === 1 ? 'movimiento' : 'movimientos'}
              </Badge>
            )}
            <Link to="/comparar" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Comparar
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}

// Rankings cuyo primer lugar cambió entre los dos períodos.
function CambiosDeLider({ rankings }) {
  if (rankings.length === 0) {
    return <p className="text-sm text-muted-foreground">Ningún ranking cambió de líder en este tramo.</p>
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-destacado-fondo p-3 text-destacado">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <CrownIcon className="size-4" aria-hidden="true" />
        {rankings.length === 1 ? 'Cambio de líder' : 'Cambios de líder'}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {rankings.map((r) => (
          <li key={r.Ranking}>
            <span className="font-medium">{r.Ranking}:</span>{' '}
            <span>{r.Lider_anterior?.Banco ?? 'sin líder'}</span>
            <ArrowRightIcon className="mx-1 inline size-3.5 align-text-bottom" aria-hidden="true" />
            <span className="sr-only">pasa a</span>
            <span className="font-semibold">{r.Lider_actual?.Banco ?? 'sin líder'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilaMovimiento({ movimiento: m }) {
  const sube = m.Cambio_Posicion > 0
  const baja = m.Cambio_Posicion < 0
  const Icono = sube ? ArrowUpIcon : baja ? ArrowDownIcon : MinusIcon
  const color = sube ? 'text-sube' : baja ? 'text-baja' : 'text-muted-foreground'
  const varSaldo = conSigno(m.Var_Saldo, formatearMonto(m.Var_Saldo))
  const varPct = m.Var_Saldo_Pct === null ? null : conSigno(m.Var_Saldo_Pct, formatearPorcentaje(m.Var_Saldo_Pct))

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-medium break-words">{m.Banco}</span>
        <span className={`cifra flex shrink-0 items-center gap-1 text-sm ${color}`}>
          <span className="sr-only">
            {sube ? 'Sube' : baja ? 'Baja' : 'Se mantiene'} de la posición {formatearEntero(m.Posicion_anterior)} a la{' '}
            {formatearEntero(m.Posicion_actual)}
          </span>
          <span aria-hidden="true" className="flex items-center gap-1">
            <Icono className="size-3.5" />
            {formatearEntero(m.Posicion_anterior)}
            <ArrowRightIcon className="size-3" />
            {formatearEntero(m.Posicion_actual)}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="cifra text-xs text-muted-foreground">
          Saldo {varSaldo}
          {varPct && ` (${varPct})`}
        </span>
        <span className="flex flex-wrap gap-1">
          {(m.Motivos ?? []).map((motivo) => (
            <Badge key={motivo} variant="outline">
              {MOTIVOS[motivo] ?? motivo}
            </Badge>
          ))}
        </span>
      </div>
    </li>
  )
}

const numero = new Intl.NumberFormat('es-PA')
const tieneValor = (valor) => valor !== null && valor !== undefined

// Criterios con que el API decidió qué es significativo (parámetros del Administrador). Un criterio
// en null está apagado.
function ReglaVigente({ regla }) {
  if (!regla) return null
  const criterios = []
  if (tieneValor(regla.min_cambio_posicion_abs)) criterios.push(`cambio de ${numero.format(regla.min_cambio_posicion_abs)} o más posiciones`)
  if (regla.cambio_lider) criterios.push('cambio de líder')
  if (tieneValor(regla.min_var_saldo_pct_abs)) criterios.push(`variación de saldo de ${numero.format(regla.min_var_saldo_pct_abs)} % o más`)
  if (criterios.length === 0) return null
  return <p className="text-xs text-muted-foreground">Es significativo si cumple alguno de estos criterios: {criterios.join('; ')}.</p>
}
