import { AlertCircleIcon, RotateCwIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// Error del API con el formato común: muestra codigo y mensaje, y ofrece reintentar.
export function ErrorApi({ error, alReintentar, titulo = 'No se pudieron cargar los datos' }) {
  const codigo = error?.codigo ?? 'ERROR_DESCONOCIDO'
  const mensaje = error?.mensaje ?? error?.message ?? 'Ocurrió un error inesperado.'
  const alerta = (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{mensaje}</p>
        <p className="font-mono text-xs">Código: {codigo}</p>
        {alReintentar && (
          <div>
            <Button variant="outline" size="sm" onClick={alReintentar}>
              <RotateCwIcon aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
  // Si el API no responde, una ilustración acompaña el aviso.
  if (codigo !== 'API_NO_DISPONIBLE') return alerta
  return (
    <div className="flex flex-col items-center gap-4">
      <img src="/marca/error-api.webp" alt="" className="w-48 max-w-full" />
      <div className="w-full">{alerta}</div>
    </div>
  )
}
