// Estado de una descarga con fetch (descargarArchivo): en curso y último error.
import { useState } from 'react'

export function useDescarga() {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState(null)
  const ejecutar = async (accion) => {
    setDescargando(true)
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(e)
    } finally {
      setDescargando(false)
    }
  }
  return { descargando, error, ejecutar }
}
