// Estado del agente flotante (#119): si el chat está abierto y dónde está su botón (de ahí sale el
// cursor en la demostración, #123). Lo usan el botón flotante, la guía y el ejecutor de acciones.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { crearRegistro } from './registro.js'

const AgenteContext = createContext(null)

export function AgenteProvider({ children }) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef(null)
  // Registro de controles de pantalla (#122): uno para toda la app.
  const [registro] = useState(crearRegistro)

  const abrir = useCallback(() => setAbierto(true), [])
  const cerrar = useCallback(() => setAbierto(false), [])
  const alternar = useCallback(() => setAbierto((a) => !a), [])
  // Centro del botón flotante en pantalla: origen y destino del cursor en la demostración.
  const posicionBoton = useCallback(() => {
    const r = boton.current?.getBoundingClientRect()
    return r ? { top: r.top + r.height / 2, left: r.left + r.width / 2 } : null
  }, [])

  const valor = useMemo(
    () => ({ abierto, abrir, cerrar, alternar, boton, posicionBoton, registro }),
    [abierto, abrir, cerrar, alternar, posicionBoton, registro],
  )
  return <AgenteContext.Provider value={valor}>{children}</AgenteContext.Provider>
}

export function useAgente() {
  const valor = useContext(AgenteContext)
  if (!valor) throw new Error('useAgente debe usarse dentro de <AgenteProvider>')
  return valor
}
