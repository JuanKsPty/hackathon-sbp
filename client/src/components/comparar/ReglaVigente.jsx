import { ScaleIcon } from 'lucide-react'
import { partesDeRegla } from './movimientos.js'

// La regla que usó el API para marcar los movimientos significativos (la configura el Administrador).
export function ReglaVigente({ regla }) {
  const partes = partesDeRegla(regla)
  if (partes.length === 0) return null
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <ScaleIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Regla vigente (la configura el Administrador): un movimiento es significativo si el banco {partes.join(', o ')}.
      </span>
    </p>
  )
}
