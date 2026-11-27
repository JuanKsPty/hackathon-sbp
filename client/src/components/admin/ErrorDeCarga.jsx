import { FileWarningIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Títulos claros para los errores de POST /api/periodos (contracts/carga.md).
const TITULOS = {
  ARCHIVO_INVALIDO: 'El archivo no es válido',
  ARCHIVO_MUY_GRANDE: 'El archivo es demasiado grande',
  FORMATO_NO_SOPORTADO: 'El formato no es CSV',
  PERFIL_NO_AUTORIZADO: 'Tu perfil no puede cargar períodos',
  PARAMETRO_INVALIDO: 'Faltan datos en la petición',
  API_NO_DISPONIBLE: 'No hay conexión con el API',
}

const MAXIMO_DETALLES = 20

// Error de la carga: título, mensaje, detalles (columna o fila con problemas) y código.
export function ErrorDeCarga({ error }) {
  const codigo = error?.codigo ?? 'ERROR_DESCONOCIDO'
  const detalles = Array.isArray(error?.detalles) ? error.detalles : []
  const visibles = detalles.slice(0, MAXIMO_DETALLES)

  return (
    <Alert variant="destructive" role="alert">
      <FileWarningIcon aria-hidden="true" />
      <AlertTitle>{TITULOS[codigo] ?? 'No se pudo cargar el archivo'}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{error?.mensaje ?? error?.message}</p>
        {visibles.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 font-mono text-xs">
            {visibles.map((detalle, i) => (
              <li key={i}>{String(detalle)}</li>
            ))}
            {detalles.length > visibles.length && <li>… y {detalles.length - visibles.length} más.</li>}
          </ul>
        )}
        {codigo === 'ARCHIVO_INVALIDO' && <p>No se guardó nada: los períodos cargados no cambiaron.</p>}
        <p className="font-mono text-xs">Código: {codigo}</p>
      </AlertDescription>
    </Alert>
  )
}
