import { Link } from 'react-router'
import { ArrowUpRightIcon, DownloadIcon, LockKeyholeIcon } from 'lucide-react'
import { urlDescarga } from '@/api/cliente.js'
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
    <section
      aria-labelledby="titulo-cierre"
      className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[28px] bg-[#0B0B0C] px-5 py-8 text-white sm:px-10 sm:py-10"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-32 -z-10 size-96 rounded-full bg-[#3DDC97]/20 blur-3xl" />
      <div className="flex flex-col gap-2">
        <h2 id="titulo-cierre" className="text-2xl font-medium tracking-tight sm:text-4xl">
          Llévate los datos. <span className="text-white/45">En CSV, del corte que elijas.</span>
        </h2>
        <p className="text-sm text-white/60">{periodo ? `Descargas del ${formatearPeriodo(periodo)}.` : 'Elige un período en el encabezado.'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DESCARGAS.map(({ tipo, nombre }) => (
          <a
            key={tipo}
            href={urlDescarga(tipo, { periodo })}
            download
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#3DDC97] focus-visible:outline-none"
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {nombre}
          </a>
        ))}
        <Link
          to="/reportes"
          className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          Todos los reportes
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-white/60">
          Comparar períodos, la descomposición de cada movimiento y los reportes personalizados están en el sitio interno, para Analistas y
          Administradores.
        </p>
        <a
          href={interno}
          className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-[#0B0B0C] transition-colors hover:bg-white/85 focus-visible:ring-2 focus-visible:ring-[#3DDC97] focus-visible:outline-none"
        >
          <LockKeyholeIcon className="size-4" aria-hidden="true" />
          Acceso interno
          <ArrowUpRightIcon className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
