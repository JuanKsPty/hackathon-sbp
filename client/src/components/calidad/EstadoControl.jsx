import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Estado de un control de calidad: OK (verde) o descuadre (rojo). El valor `ok` viene del API.
export function EstadoControl({ ok, textoOk = 'OK', textoMal = 'Descuadre' }) {
  if (ok) {
    return (
      <Badge className="bg-sube-fondo text-sube">
        <CheckCircle2Icon aria-hidden="true" />
        {textoOk}
      </Badge>
    )
  }
  return (
    <Badge className="bg-baja-fondo text-baja">
      <TriangleAlertIcon aria-hidden="true" />
      {textoMal}
    </Badge>
  )
}
