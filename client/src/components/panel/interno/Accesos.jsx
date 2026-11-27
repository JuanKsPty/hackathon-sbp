import { Link } from 'react-router'
import { ArrowUpRightIcon, FileDownIcon, GitCompareArrowsIcon } from 'lucide-react'
import { Tarjeta } from './Tarjeta.jsx'

const ACCESOS = [
  {
    ruta: '/comparar',
    titulo: 'Comparar',
    texto: 'Dos períodos o dos bancos, con la evidencia préstamo por préstamo.',
    icono: GitCompareArrowsIcon,
  },
  {
    ruta: '/reportes',
    titulo: 'Reportes',
    texto: 'Descargas en CSV y reportes personalizados por período, ranking y banco.',
    icono: FileDownIcon,
  },
]

// Accesos del panel interno a Comparar y Reportes.
export function Accesos() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {ACCESOS.map(({ ruta, titulo, texto, icono: Icono }) => (
        <Link
          key={ruta}
          to={ruta}
          className="group rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Tarjeta className="h-full flex-row items-start gap-3 transition-shadow group-hover:shadow-md">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-marca">
              <Icono className="size-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{titulo}</span>
              <span className="text-xs text-muted-foreground">{texto}</span>
            </span>
            <ArrowUpRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Tarjeta>
        </Link>
      ))}
    </div>
  )
}
