import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Tarjeta del panel interno: el Card de la app con relleno propio, para contenido libre sin
// CardHeader ni CardContent.
export function Tarjeta({ className, ...props }) {
  return <Card className={cn('min-w-0 gap-4 px-4 sm:px-5', className)} {...props} />
}
