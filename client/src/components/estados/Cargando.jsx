import { Skeleton } from '@/components/ui/skeleton'

// Estado de carga: bloques grises mientras llega la respuesta del API.
export function Cargando({ filas = 3, etiqueta = 'Cargando datos…' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{etiqueta}</span>
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
