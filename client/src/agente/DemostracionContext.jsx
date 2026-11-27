// Demostración con el cursor (#123): el chat se minimiza, el cursor sale de su botón, recorre cada
// acción (espera al elemento, lo lleva a la vista, se mueve, muestra el texto y "toca"), el ejecutor
// aplica la acción, y al final el cursor vuelve al chat, desaparece y el chat se reabre.
// La parte visual está en CapaDemostracion.jsx; aquí solo el recorrido y su estado.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAgente } from './AgenteContext.jsx'
import { objetivoDe } from './objetivo.js'
import { esperarElemento, llevarALaVista, prefiereMenosMovimiento, rectDe } from '../guia/dom.js'

const DemostracionContext = createContext(null)

// Tiempos de cada momento (ms). Con prefers-reduced-motion, casi sin espera.
const TIEMPOS = { entrar: 450, scroll: 380, mover: 750, tocar: 380, leer: 700, salir: 550 }
const tiempo = (clave) => (prefiereMenosMovimiento() ? Math.min(TIEMPOS[clave], 120) : TIEMPOS[clave])

function esperar(ms, signal) {
  return new Promise((resolver) => {
    const reloj = setTimeout(resolver, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(reloj)
      resolver()
    })
  })
}

// Punto donde se apoya la punta del cursor: el centro, o un poco adentro si el elemento es ancho.
const puntoDe = (rect) => ({ top: rect.top + rect.height / 2, left: rect.left + Math.min(rect.width / 2, 40) })

const INICIAL = { visible: false, fase: 'oculto', pos: null, texto: '' }

export function DemostracionProvider({ children }) {
  const { abrir, cerrar, posicionBoton, ejecutarPantalla } = useAgente()
  const [estado, setEstado] = useState(INICIAL)
  const control = useRef(null)

  const demostrar = useCallback(
    async (pantalla) => {
      control.current?.abort()
      const propio = new AbortController()
      control.current = propio
      const { signal } = propio
      const actualizar = (cambios) => !signal.aborted && setEstado((e) => ({ ...e, ...cambios }))

      // 1. El chat se minimiza y el cursor aparece sobre su botón.
      cerrar()
      actualizar({ visible: true, fase: 'entrando', pos: posicionBoton(), texto: '' })
      await esperar(tiempo('entrar'), signal)

      // 2. Cada acción: buscar, llevar a la vista, moverse, explicar y tocar.
      const antesDe = async (accion) => {
        const selector = objetivoDe(accion)
        const el = selector ? await esperarElemento(selector, { signal, timeout: 4000 }) : null
        if (!el || signal.aborted) return
        llevarALaVista(el)
        await esperar(tiempo('scroll'), signal)
        actualizar({ fase: 'moviendo', pos: puntoDe(rectDe(el)), texto: accion.texto ?? '' })
        await esperar(tiempo('mover'), signal)
        actualizar({ fase: 'tocando' })
        await esperar(tiempo('tocar'), signal)
        actualizar({ fase: 'apuntando' })
      }
      await ejecutarPantalla(pantalla, { antesDe, signal })
      await esperar(tiempo('leer'), signal)

      // 3. Vuelve al chat, desaparece y el chat se reabre.
      if (!signal.aborted) {
        actualizar({ fase: 'saliendo', pos: posicionBoton(), texto: '' })
        await esperar(tiempo('salir'), signal)
      }
      setEstado(INICIAL)
      if (control.current === propio) control.current = null
      abrir()
    },
    [abrir, cerrar, posicionBoton, ejecutarPantalla],
  )

  const cancelar = useCallback(() => control.current?.abort(), [])

  // Esc cancela la demostración.
  useEffect(() => {
    if (!estado.visible) return undefined
    const alTeclear = (e) => e.key === 'Escape' && cancelar()
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [estado.visible, cancelar])

  const valor = useMemo(() => ({ estado, demostrar, cancelar, demostrando: estado.visible }), [estado, demostrar, cancelar])
  return <DemostracionContext.Provider value={valor}>{children}</DemostracionContext.Provider>
}

export function useDemostracion() {
  const valor = useContext(DemostracionContext)
  if (!valor) throw new Error('useDemostracion debe usarse dentro de <DemostracionProvider>')
  return valor
}
