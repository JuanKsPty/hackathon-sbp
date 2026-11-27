import { Link } from 'react-router'
import { ArrowRightIcon, CheckCircle2Icon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { buttonVariants } from '@/components/ui/button'
import { formatearEntero, formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { Tarjeta } from './Tarjeta.jsx'

// Tipos de alerta del reporte de calidad (los mismos de components/calidad/AlertasPorTipo.jsx).
// Una alerta no excluye la fila del cálculo.
const TIPOS = [
  { campo: 'Banco_Fuera_Catalogo', nombre: 'Banco fuera de catálogo' },
  { campo: 'Facilidad_Fuera_Catalogo', nombre: 'Facilidad fuera de catálogo' },
  { campo: 'Incoherencia_Consumo', nombre: 'Incoherencia de CONSUMO' },
  { campo: 'Tipo_Dato', nombre: 'Tipo de dato inválido' },
]

// Alertas de calidad del período elegido (GET /api/calidad?periodo): total, conteo por tipo y estado de
// las reconciliaciones. El detalle está en la página Calidad de datos.
export function AlertasCalidad({ consulta }) {
  const calidad = consulta.datos?.periodos?.[0] ?? null

  let contenido
  if (consulta.error) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (consulta.cargando || !consulta.datos) contenido = <Cargando filas={3} />
  else if (!calidad) contenido = <Vacio titulo="Sin reporte de calidad" />
  else {
    const total = calidad.Alertas_Total ?? 0
    const r = calidad.Reconciliaciones ?? {}
    const controles = [
      ['R1', r.R1?.ok],
      ['R2', r.R2?.ok],
      ['R3', r.R3?.ok],
      ['Unicidad', r.Unicidad?.ok],
    ]
    contenido = (
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className={cn('cifra text-3xl font-medium tracking-tight', total > 0 ? 'text-destacado' : 'text-sube')}>{formatearEntero(total)}</span>
          <span className="text-sm text-muted-foreground">{total === 1 ? 'alerta' : 'alertas'} al {formatearPeriodo(calidad.Fecha)}</span>
        </div>
        <dl className="flex flex-col divide-y text-sm">
          {TIPOS.map((t) => (
            <div key={t.campo} className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-muted-foreground">{t.nombre}</dt>
              <dd className="cifra font-medium">{formatearEntero(calidad.Alertas?.[t.campo])}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-1.5" aria-label="Reconciliaciones">
          {controles.map(([nombre, ok]) => (
            <li
              key={nombre}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                ok ? 'bg-sube-fondo text-sube' : 'bg-baja-fondo text-baja',
              )}
            >
              {ok ? <CheckCircle2Icon className="size-3.5" aria-hidden="true" /> : <TriangleAlertIcon className="size-3.5" aria-hidden="true" />}
              {nombre} {ok ? 'OK' : 'con diferencias'}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <Tarjeta>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="flex items-center gap-2 font-medium">
            <ShieldCheckIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Alertas de calidad
          </h3>
          <p className="text-xs text-muted-foreground">Se reportan, pero no excluyen la fila del cálculo.</p>
        </div>
      </div>
      {contenido}
      <Link to="/calidad" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
        Ver calidad de los datos
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </Tarjeta>
  )
}
