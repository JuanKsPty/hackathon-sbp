import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Tarjeta blanca del panel interno: el Card de la base visual (superficie "tarjeta", radio 16 y sombra)
// con relleno propio, para contenido libre sin CardHeader ni CardContent. Va dentro de una SeccionGris.
export function Tarjeta({ className, ...props }) {
  return <Card className={cn('min-w-0 gap-4 px-4 sm:px-5', className)} {...props} />
}
