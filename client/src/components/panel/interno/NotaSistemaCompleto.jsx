import { InfoIcon } from 'lucide-react'
import { useBancoPanel } from '@/contexto/BancoPanelContext.jsx'
import { cn } from '@/lib/utils'

// Línea chica para los bloques que no se pueden filtrar por banco (#204). Solo aparece con un banco
// elegido: sin filtro no ocupa lugar y el Panel se ve igual que antes.
export function NotaSistemaCompleto({ texto = 'Este bloque es del sistema completo: no se filtra por banco.', className }) {
  const { banco } = useBancoPanel()
  if (!banco) return null
  return (
    <p className={cn('flex items-start gap-1.5 text-xs text-muted-foreground', className)}>
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{texto}</span>
    </p>
  )
}
