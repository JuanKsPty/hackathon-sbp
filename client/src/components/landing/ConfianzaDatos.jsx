import { Link } from 'react-router'
import { ArrowRightIcon, CheckCircle2Icon, ClipboardCheckIcon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { Etiqueta, SeccionGris, TituloDosTonos } from '@/components/marca'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
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
    <SeccionGris role="region" aria-labelledby="titulo-confianza" className="flex flex-col gap-5 sm:p-8">
      <div className="flex flex-col gap-3">
        <Etiqueta icono={ShieldCheckIcon}>Calidad de datos</Etiqueta>
        <TituloDosTonos id="titulo-confianza" fuerte="Confianza en los datos" suave="antes de cada ranking" />
        <p className="text-sm text-muted-foreground">Cada fila del AT03 pasa por cuatro exclusiones en cascada y tres reconciliaciones.</p>
      </div>

      <EstadoBloque consulta={calidad} filas={4} vacio={!c} tituloVacio="Sin datos de calidad para este período">
        {c && (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-4 rounded-tarjeta bg-card p-4 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 sm:p-5 dark:shadow-none dark:ring-border">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Universo local válido</span>
                <span className="cifra text-3xl font-medium tracking-tight">{formatearEntero(c.Universo_Local_Valido)}</span>
                <span className="cifra text-xs text-muted-foreground">
                  de {formatearEntero(c.Filas_Leidas)} filas leídas · saldo {formatearMonto(c.Saldo_Total_Valido)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2">
                {EXCLUSIONES.map((e) => (
                  <div key={e.codigo} className="flex flex-col gap-0.5 rounded-xl bg-muted p-3">
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
              <ul className="flex flex-col divide-y rounded-tarjeta bg-card text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border">
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
                <Link to="/calidad" className={buttonVariants({ size: 'pildora' })}>
                  <ShieldCheckIcon aria-hidden="true" data-icon="inline-start" />
                  Calidad de datos
                  <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
                </Link>
                <Link to="/verificacion" className={buttonVariants({ variant: 'outline', size: 'pildora' })}>
                  <ClipboardCheckIcon aria-hidden="true" data-icon="inline-start" />
                  Verificación del jurado
                </Link>
              </div>
            </div>
          </div>
        )}
      </EstadoBloque>
    </SeccionGris>
  )
}

function Estado({ ok, texto }) {
  const Icono = ok ? CheckCircle2Icon : TriangleAlertIcon
  return (
    <Badge variant={ok ? 'sube' : 'baja'} className="w-fit shrink-0">
      <Icono aria-hidden="true" />
      {texto}
    </Badge>
  )
}
