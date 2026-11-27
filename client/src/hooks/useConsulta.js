// Carga datos del API y expone { datos, error, cargando, reintentar }.
// `consultar` recibe { signal } y devuelve una promesa (una función de api/cliente.js).
// Se vuelve a pedir cuando cambian `dependencias` o al llamar reintentar().
import { useCallback, useEffect, useRef, useState } from 'react'

export function useConsulta(consultar, dependencias = [], { activa = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: activa })
  const [intento, setIntento] = useState(0)
  const consultarRef = useRef(consultar)
  consultarRef.current = consultar

  useEffect(() => {
    if (!activa) return undefined
    const control = new AbortController()
    setEstado((previo) => ({ ...previo, error: null, cargando: true }))
    consultarRef
      .current({ signal: control.signal })
      .then((datos) => {
        if (!control.signal.aborted) setEstado({ datos, error: null, cargando: false })
      })
      .catch((error) => {
        if (control.signal.aborted || error?.name === 'AbortError') return
        setEstado({ datos: null, error, cargando: false })
      })
    return () => control.abort()
  }, [activa, intento, ...dependencias])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return { ...estado, reintentar }
}
