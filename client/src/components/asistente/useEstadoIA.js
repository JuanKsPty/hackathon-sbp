// Estado de la IA en el servidor (GET /api/ia/estado).
// iaDisponible es null mientras no se sabe (cargando o error): en ese caso el chat queda
// habilitado y, si no hay IA, el propio servidor responde con su `motivo`.
import { estadoIA } from '@/api/ia.js'
import { useConsulta } from '@/hooks/useConsulta.js'

export function useEstadoIA() {
  const { datos, error, cargando, reintentar } = useConsulta((opciones) => estadoIA(opciones))
  return {
    iaDisponible: datos ? Boolean(datos.ia_disponible) : null,
    modelo: datos?.modelo ?? null,
    error,
    cargando,
    reintentar,
  }
}
