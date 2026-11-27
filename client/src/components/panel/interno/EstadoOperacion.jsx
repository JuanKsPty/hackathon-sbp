import { Link } from 'react-router'
import { ArrowRightIcon, CheckCircle2Icon, FileUpIcon, ScaleIcon, ScrollTextIcon, TriangleAlertIcon } from 'lucide-react'
import { leerBitacora, leerParametros } from '@/api/admin.js'
import { calidad as pedirCalidad } from '@/api/cliente.js'
import {
  COLOR_RESULTADO,
  NOMBRES_OPERACION,
  NOMBRES_PERFIL_BITACORA,
  NOMBRES_RESULTADO,
  formatearFechaHora,
} from '@/components/admin/formato.js'
import { partesDeRegla } from '@/components/comparar/movimientos.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { buttonVariants } from '@/components/ui/button'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { Seccion } from './Seccion.jsx'
import { Tarjeta } from './Tarjeta.jsx'

const ULTIMAS = 3

// Operaciones de sesión (PR #120) que aún no tienen nombre en admin/formato.js.
const OPERACIONES = { inicio_sesion: 'Inicio de sesión', cierre_sesion: 'Cierre de sesión', ...NOMBRES_OPERACION }

// Estado de la operación, solo para el Administrador (#140): último corte cargado con su cascada
// E1–E4 y las reconciliaciones, la regla de movimiento significativo vigente y las últimas entradas
// de la bitácora. Usa GET /api/calidad, GET /api/parametros y GET /api/bitacora (los dos últimos
// responden 403 a otro perfil). Solo lectura: los cambios se hacen en Administración.
export function EstadoOperacion() {
  const { perfil, puede } = usePerfil()
  const { periodos } = usePeriodo()
  const ultimo = periodos.map((p) => p.Fecha).filter(Boolean).sort().at(-1) ?? null
  // Los permisos los configura el Administrador: se pregunta por cada opción (GET /api/perfil).
  const verBitacora = puede('ver_bitacora')
  const esAdmin = perfil === 'admin' || puede('cargar_periodo') || verBitacora

  const consultaCalidad = useConsulta((opciones) => pedirCalidad({ periodo: ultimo }, opciones), [ultimo], { activa: esAdmin && Boolean(ultimo) })
  const consultaRegla = useConsulta((opciones) => leerParametros(perfil, opciones), [perfil], { activa: esAdmin })
  const consultaBitacora = useConsulta((opciones) => leerBitacora(perfil, opciones), [perfil], { activa: verBitacora })

  if (!esAdmin) return null

  return (
    <Seccion
      id="titulo-operacion"
      titulo="Estado de la operación"
      descripcion="Último corte cargado, regla vigente y últimas operaciones. Solo Administrador."
      accion={
        <Link to="/admin" className={buttonVariants({ className: 'w-fit' })}>
          <FileUpIcon aria-hidden="true" />
          Cargar período
        </Link>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <UltimoCorte consulta={consultaCalidad} ultimo={ultimo} />
        <ReglaActual consulta={consultaRegla} />
        {verBitacora && <UltimasOperaciones consulta={consultaBitacora} />}
      </div>
    </Seccion>
  )
}

function Estado({ consulta, filas = 3, children }) {
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (!consulta.datos) return <Cargando filas={filas} />
  return children
}

function UltimoCorte({ consulta, ultimo }) {
  const c = consulta.datos?.periodos?.[0] ?? null
  const r = c?.Reconciliaciones ?? {}
  const cascada = [
    ['Filas leídas', c?.Filas_Leidas],
    ['E1 · Duplicados', c?.E1_Duplicados],
    ['E2 · Destino extranjero', c?.E2_Destino_Extranjero],
    ['E3 · Saldo ≤ 0', c?.E3_Saldo_No_Positivo],
    ['E4 · Actividad no catalogada', c?.E4_Actividad_No_Catalogada],
    ['Universo local válido', c?.Universo_Local_Valido],
  ]
  const controles = [
    ['R1', r.R1?.ok],
    ['R2', r.R2?.ok],
    ['R3', r.R3?.ok],
    ['Unicidad', r.Unicidad?.ok],
    ['Cascada', c?.Cascada_Cuadra],
  ]

  return (
    <Tarjeta>
      <h3 className="font-medium">Último corte cargado</h3>
      {!ultimo ? (
        <Vacio titulo="No hay períodos cargados" descripcion="Carga un archivo AT03 en Administración." />
      ) : (
        <Estado consulta={consulta} filas={5}>
          {c && (
            <div className="flex flex-col gap-4">
              <dl className="grid gap-x-4 gap-y-1 text-sm min-[420px]:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Archivo</dt>
                <dd className="font-mono text-xs break-all min-[420px]:self-center">{c.Archivo}</dd>
                <dt className="text-muted-foreground">Fecha de corte</dt>
                <dd>{formatearPeriodo(c.Fecha)}</dd>
                <dt className="text-muted-foreground">Saldo total válido</dt>
                <dd className="cifra">{formatearMonto(c.Saldo_Total_Valido)}</dd>
              </dl>
              <dl className="grid grid-cols-2 gap-2">
                {cascada.map(([nombre, valor]) => (
                  <div key={nombre} className="flex min-w-0 flex-col gap-0.5 rounded-md bg-muted/50 px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{nombre}</dt>
                    <dd className="cifra text-base font-medium">{formatearEntero(valor)}</dd>
                  </div>
                ))}
              </dl>
              <ul className="flex flex-wrap gap-1.5" aria-label="Controles del corte">
                {controles.map(([nombre, ok]) => (
                  <li
                    key={nombre}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      ok ? 'bg-sube-fondo text-sube' : 'bg-baja-fondo text-baja',
                    )}
                  >
                    {ok ? <CheckCircle2Icon className="size-3.5" aria-hidden="true" /> : <TriangleAlertIcon className="size-3.5" aria-hidden="true" />}
                    {nombre} {ok ? 'OK' : nombre === 'Cascada' ? 'no cuadra' : 'con diferencias'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Estado>
      )}
    </Tarjeta>
  )
}

function ReglaActual({ consulta }) {
  const partes = partesDeRegla(consulta.datos?.regla_significativo)
  return (
    <Tarjeta>
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <ScaleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Regla de movimiento significativo
        </h3>
        {consulta.datos?.origen && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {consulta.datos.origen === 'administrador' ? 'Cambiada por el Administrador' : 'Por defecto'}
          </span>
        )}
      </div>
      <Estado consulta={consulta} filas={2}>
        {partes.length > 0 ? (
          <p className="text-sm">Un movimiento es significativo si el banco {partes.join(', o ')}.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Todos los criterios están apagados.</p>
        )}
      </Estado>
      <Link to="/admin" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
        Cambiar la regla
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </Tarjeta>
  )
}

function UltimasOperaciones({ consulta }) {
  const operaciones = (consulta.datos?.operaciones ?? []).slice(0, ULTIMAS)
  return (
    <Tarjeta>
      <h3 className="flex items-center gap-2 font-medium">
        <ScrollTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        Últimas operaciones
      </h3>
      <Estado consulta={consulta} filas={4}>
        {operaciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay operaciones registradas.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {operaciones.map((o, i) => (
              <li key={`${o.fecha_hora}-${i}`} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{OPERACIONES[o.operacion] ?? o.operacion}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', COLOR_RESULTADO[o.resultado] ?? 'bg-muted')}>
                    {NOMBRES_RESULTADO[o.resultado] ?? o.resultado}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatearFechaHora(o.fecha_hora)} · {NOMBRES_PERFIL_BITACORA[o.perfil] ?? o.perfil}
                  {o.archivo ? ` · ${o.archivo}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Estado>
      <Link to="/admin" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
        Ver la bitácora completa
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </Tarjeta>
  )
}
