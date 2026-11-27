import { CrownIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const nombre = (lider) => (lider ? `${lider.Banco} (${lider.Codigo_Banco})` : 'sin dato')

// Aviso de cambio de líder de un ranking (Cambio_Lider, Lider_anterior y Lider_actual de /api/movimientos).
// Sin cambio, una línea tranquila dice quién sigue primero.
export function AvisoCambioLider({ ranking }) {
  if (!ranking) return null
  if (!ranking.Cambio_Lider) {
    if (!ranking.Lider_actual) return null
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CrownIcon className="size-4 shrink-0" aria-hidden="true" />
        <span>Sin cambio de líder: {nombre(ranking.Lider_actual)} sigue en el primer lugar de {ranking.Ranking}.</span>
      </p>
    )
  }
  return (
    <Alert role="status" className="border-destacado/40 bg-destacado-fondo text-destacado">
      <CrownIcon aria-hidden="true" />
      <AlertTitle>Cambio de líder en {ranking.Ranking}</AlertTitle>
      <AlertDescription className="text-destacado/90">
        {nombre(ranking.Lider_actual)} pasa al primer lugar y desplaza a {nombre(ranking.Lider_anterior)}.
      </AlertDescription>
    </Alert>
  )
}
