import { Link } from 'react-router'
import { ArrowRightIcon, CheckCircle2Icon, ClipboardCheckIcon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { cn } from '@/lib/utils'
import { formatearEntero, formatearMonto } from '@/lib/formato.js'

// Exclusiones en cascada (sección 7): nombre corto de cada regla.
const EXCLUSIONES = [
  { campo: 'E1_Duplicados', codigo: 'E1', nombre: 'Duplicados' },
  { campo: 'E2_Destino_Extranjero', codigo: 'E2', nombre: 'Destino extranjero' },
  { campo: 'E3_Saldo_No_Positivo', codigo: 'E3', nombre: 'Saldo no positivo' },
  { campo: 'E4_Actividad_No_Catalogada', codigo: 'E4', nombre: 'Actividad no catalogada' },
]

const CONTROLES = [
  { clave: 'R1', nombre: 'Reconciliación 1', regla: 'Subactividades = saldo de la actividad' },
  { clave: 'R2', nombre: 'Reconciliación 2', regla: '6 actividades = cartera del banco' },
  { clave: 'R3', nombre: 'Reconciliación 3', regla: '12 carteras = universo válido' },
  { clave: 'Unicidad', nombre: 'Unicidad', regla: 'Ningún préstamo repetido' },
]

// Confianza en los datos: universo local válido, exclusiones E1–E4 y reconciliaciones R1–R3 del
// período, todo de GET /api/calidad (R2). Enlaza a Calidad de datos y a Verificación del jurado.
export function ConfianzaDatos({ datos }) {
  const { calidad } = datos
  const c = calidad.datos

  return (
    <section aria-labelledby="titulo-confianza" className="flex flex-col gap-5 rounded-3xl border bg-card p-4 text-card-foreground shadow-sm sm:p-8">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-confianza" className="text-2xl font-medium tracking-tight sm:text-3xl">
          Confianza en los datos <span className="text-muted-foreground">antes de cada ranking</span>
        </h2>
        <p className="text-sm text-muted-foreground">Cada fila del AT03 pasa por cuatro exclusiones en cascada y tres reconciliaciones.</p>
      </div>

      <EstadoBloque consulta={calidad} filas={4} vacio={!c} tituloVacio="Sin datos de calidad para este período">
        {c && (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-4 rounded-2xl bg-muted p-4 sm:p-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Universo local válido</span>
                <span className="cifra text-3xl font-medium tracking-tight">{formatearEntero(c.Universo_Local_Valido)}</span>
                <span className="cifra text-xs text-muted-foreground">
                  de {formatearEntero(c.Filas_Leidas)} filas leídas · saldo {formatearMonto(c.Saldo_Total_Valido)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                {EXCLUSIONES.map((e) => (
                  <div key={e.codigo} className="flex flex-col gap-0.5 rounded-xl bg-card p-3">
                    <dt className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{e.codigo}</span> {e.nombre}
                    </dt>
                    <dd className="cifra text-lg font-medium">{formatearEntero(c[e.campo])}</dd>
                  </div>
                ))}
              </dl>
              {typeof c.Cascada_Cuadra === 'boolean' && (
                <Estado ok={c.Cascada_Cuadra} texto={c.Cascada_Cuadra ? 'La cascada cuadra con las filas leídas' : 'La cascada no cuadra'} />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <ul className="flex flex-col divide-y rounded-2xl border">
                {CONTROLES.map((control) => {
                  const ok = c.Reconciliaciones?.[control.clave]?.ok
                  return (
                    <li key={control.clave} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{control.nombre}</span>
                        <span className="text-xs text-muted-foreground">{control.regla}</span>
                      </div>
                      {typeof ok === 'boolean' ? <Estado ok={ok} texto={ok ? 'Cuadra' : 'Descuadre'} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link to="/calidad" className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/85">
                  <ShieldCheckIcon className="size-4" aria-hidden="true" />
                  Calidad de datos
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </Link>
                <Link to="/verificacion" className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium hover:bg-accent">
                  <ClipboardCheckIcon className="size-4" aria-hidden="true" />
                  Verificación del jurado
                </Link>
              </div>
            </div>
          </div>
        )}
      </EstadoBloque>
    </section>
  )
}

function Estado({ ok, texto }) {
  const Icono = ok ? CheckCircle2Icon : TriangleAlertIcon
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', ok ? 'bg-sube-fondo text-sube' : 'bg-baja-fondo text-baja')}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
    </span>
  )
}
