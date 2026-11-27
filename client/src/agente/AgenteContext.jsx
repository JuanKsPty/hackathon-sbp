// Estado del agente flotante (#119): si el chat está abierto y dónde está su botón (de ahí sale el
// cursor en la demostración, #123). Lo usan el botón flotante, la guía y el ejecutor de acciones.
// También tiene el registro de controles y el ejecutor de acciones de pantalla (#122).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { crearRegistro } from './registro.js'
import { deshacerAcciones, ejecutarAcciones } from './ejecutor.js'

const AgenteContext = createContext(null)

export function AgenteProvider({ children }) {
  const [abierto, setAbierto] = useState(false)
  const boton = useRef(null)
  // Registro de controles de pantalla (#122): uno para toda la app.
  const [registro] = useState(crearRegistro)
  const navegar = useNavigate()
  const { pathname } = useLocation()
  // La ruta cambia mientras se ejecutan las acciones: el ejecutor la lee siempre actualizada.
  const ruta = useRef(pathname)
  useEffect(() => {
    ruta.current = pathname
  }, [pathname])
  // Lo necesario para deshacer la última ejecución ("Muéstrame cómo", #124).
  const ultima = useRef(null)
  const [hayParaDeshacer, setHayParaDeshacer] = useState(false)

  const abrir = useCallback(() => setAbierto(true), [])
  const cerrar = useCallback(() => setAbierto(false), [])
  const alternar = useCallback(() => setAbierto((a) => !a), [])
  // Centro del botón flotante en pantalla: origen y destino del cursor en la demostración.
  const posicionBoton = useCallback(() => {
    const r = boton.current?.getBoundingClientRect()
    return r ? { top: r.top + r.height / 2, left: r.left + r.width / 2 } : null
  }, [])

  /** Aplica las acciones de `pantalla` (#121). `antesDe` permite animar cada paso (demostración). */
  const ejecutarPantalla = useCallback(
    async (pantalla, { antesDe, signal } = {}) => {
      const resultado = await ejecutarAcciones(pantalla?.acciones ?? [], {
        registro,
        navegar: (destino) => navegar(destino),
        rutaActual: () => ruta.current,
        antesDe,
        signal,
      })
      ultima.current = resultado.deshacer
      setHayParaDeshacer(resultado.aplicadas.length > 0)
      return resultado
    },
    [registro, navegar],
  )

  /** Deshace la última ejecución: restaura los controles y vuelve a la página de antes. */
  const deshacerUltima = useCallback(() => {
    deshacerAcciones(ultima.current, { registro, navegar: (destino) => navegar(destino), rutaActual: () => ruta.current })
    ultima.current = null
    setHayParaDeshacer(false)
  }, [registro, navegar])

  const valor = useMemo(
    () => ({ abierto, abrir, cerrar, alternar, boton, posicionBoton, registro, ejecutarPantalla, deshacerUltima, hayParaDeshacer }),
    [abierto, abrir, cerrar, alternar, posicionBoton, registro, ejecutarPantalla, deshacerUltima, hayParaDeshacer],
  )
  return <AgenteContext.Provider value={valor}>{children}</AgenteContext.Provider>
}

export function useAgente() {
  const valor = useContext(AgenteContext)
  if (!valor) throw new Error('useAgente debe usarse dentro de <AgenteProvider>')
  return valor
}
