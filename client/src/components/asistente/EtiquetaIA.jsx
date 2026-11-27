import { ListChecksIcon, SparklesIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Etiqueta obligatoria junto a todo texto de la IA (contracts/ia.md):
// "Respuesta generada con IA · los cálculos provienen del motor determinista".
export function EtiquetaIA({ texto, porReglas = false, className }) {
  const Icono = porReglas ? ListChecksIcon : SparklesIcon
  return (
    <p className={cn('flex items-start gap-1.5 text-xs text-muted-foreground', className)}>
      <Icono className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{texto}</span>
    </p>
  )
}

// De dónde salió cada explicación de movimiento: `ia` (redactada por la IA y verificada) o `reglas`.
export function FuenteExplicacion({ fuente }) {
  if (fuente === 'ia') {
    return (
      <Badge variant="secondary" title="Redactada por la IA y verificada contra los números del motor">
        <SparklesIcon aria-hidden="true" />
        IA
      </Badge>
    )
  }
  return (
    <Badge variant="outline" title="Plantilla por reglas, sin IA">
      <ListChecksIcon aria-hidden="true" />
      Reglas
    </Badge>
  )
}
