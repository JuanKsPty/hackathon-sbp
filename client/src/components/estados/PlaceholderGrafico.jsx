import { Skeleton } from '@/components/ui/skeleton'

// Anchos de las barras de relleno: se repiten en ciclo para que parezca un gráfico de barras.
const ANCHOS = ['92%', '78%', '64%', '55%', '47%', '38%', '30%', '24%']

// Carga de un gráfico: un bloque del mismo alto que el gráfico, con barras grises, para que la
// tarjeta no cambie de tamaño cuando llegan los datos. `alto` en píxeles.
export function PlaceholderGrafico({ alto = 240, etiqueta = 'Cargando el gráfico…' }) {
  const barras = Math.max(3, Math.min(12, Math.floor(alto / 36)))
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col justify-around gap-2 py-2" style={{ height: alto }}>
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: barras }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20 shrink-0" />
          <Skeleton className="h-4 rounded-r-lg rounded-l-sm" style={{ width: ANCHOS[i % ANCHOS.length] }} />
        </div>
      ))}
    </div>
  )
}
