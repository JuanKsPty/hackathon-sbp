import { Link } from 'react-router'
import { ArrowUpRightIcon, DownloadIcon, LockKeyholeIcon } from 'lucide-react'
import { urlDescarga } from '@/api/cliente.js'
import { BloqueOscuro, Etiqueta, TituloDosTonos } from '@/components/marca'
import { buttonVariants } from '@/components/ui/button'
import { formatearPeriodo } from '@/lib/formato.js'
import { urlSitioInterno } from './datosLanding.js'

// Entregables abiertos al público (contracts/exportaciones.md): 2 rankings, 3 subactividades, 4 calidad.
const DESCARGAS = [
  { tipo: 'rankings', nombre: 'Rankings' },
  { tipo: 'subactividades', nombre: 'Subactividades' },
  { tipo: 'calidad', nombre: 'Calidad E1–E4' },
]

// Cierre de la landing: descargas del período y el acceso al sitio interno (Analista y Administrador),
// que vive en otro dominio (#120).
export function CierreLanding({ datos }) {
  const { periodo } = datos
  const interno = urlSitioInterno(typeof window === 'undefined' ? {} : window.location, import.meta.env.VITE_URL_INTERNO)

  return (
    <BloqueOscuro role="region" aria-labelledby="titulo-cierre" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Etiqueta icono={DownloadIcon}>{periodo ? `Descargas del ${formatearPeriodo(periodo)}` : 'Descargas'}</Etiqueta>
        <TituloDosTonos id="titulo-cierre" fuerte="Llévate los datos." suave="En CSV, del corte que elijas en el encabezado." />
      </div>

      <div className="flex flex-wrap gap-2">
        {DESCARGAS.map(({ tipo, nombre }) => (
          <a key={tipo} href={urlDescarga(tipo, { periodo })} download className={buttonVariants({ variant: 'borde-claro', size: 'lg' })}>
            <DownloadIcon aria-hidden="true" data-icon="inline-start" />
            {nombre}
          </a>
        ))}
        <Link to="/reportes" className={buttonVariants({ variant: 'borde-claro', size: 'lg', className: 'border-transparent' })}>
          Todos los reportes
          <ArrowUpRightIcon aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-t border-bloque-foreground/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-bloque-muted">
          Comparar períodos, la descomposición de cada movimiento y los reportes personalizados están en el sitio interno, para Analistas y
          Administradores.
        </p>
        <a href={interno} className={buttonVariants({ variant: 'claro', size: 'pildora', className: 'w-fit' })}>
          <LockKeyholeIcon aria-hidden="true" data-icon="inline-start" />
          Acceso interno
          <ArrowUpRightIcon aria-hidden="true" data-icon="inline-end" />
        </a>
      </div>
    </BloqueOscuro>
  )
}
