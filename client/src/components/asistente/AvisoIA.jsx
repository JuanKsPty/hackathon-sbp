import { BotOffIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Aviso cuando el servidor no tiene IA (GET /api/ia/estado con ia_disponible: false) o no se pudo
// consultar su estado. La app sigue funcionando: todo lo demás sale del motor determinista.
export function AvisoIA({ estado }) {
  if (estado.cargando || estado.iaDisponible) return null

  if (estado.error) {
    return (
      <Alert role="status">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>No se pudo consultar el estado de la IA</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{estado.error.mensaje ?? estado.error.message}</p>
          <div>
            <Button variant="outline" size="sm" onClick={estado.reintentar}>
              <RotateCwIcon aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert role="status" className="border-aviso/30 bg-aviso-fondo text-aviso">
      <BotOffIcon aria-hidden="true" />
      <AlertTitle>El asistente IA no está disponible en este servidor</AlertTitle>
      <AlertDescription className="text-aviso">
        <p>
          El resto de la app funciona igual: los rankings, la comparación de períodos, los reportes y la calidad de datos
          salen del motor determinista. Las explicaciones de movimientos se muestran por reglas.
        </p>
        <p>
          El chat sigue funcionando por reglas: pide un informe, un ranking, una comparación o cómo va un banco y te
          muestra sus gráficos. También puedes ir a <Link to="/rankings">Rankings</Link> o{' '}
          <Link to="/calidad">Calidad de datos</Link>.
        </p>
      </AlertDescription>
    </Alert>
  )
}
