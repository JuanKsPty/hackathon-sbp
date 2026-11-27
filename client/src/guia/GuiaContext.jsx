// Cursor guía (#72): estado global de la guía y su recorrido por la app.
// Cualquier componente la inicia con useGuia().iniciar(pasos), por ejemplo el chat del asistente con
// los `guia.pasos` de POST /api/ia/preguntar. La capa visual (CapaGuia) lee el estado de aquí.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ESTADO_INICIAL, necesitaNavegar, pasoActual, reductorGuia, selectorDe } from './motor.js'
import { esperarElemento, llevarALaVista, prefiereMenosMovimiento, rectDe } from './dom.js'

const GuiaContext = createContext(null)
// Tiempo para que termine el scroll suave antes de medir la posición final.
const ESPERA_SCROLL_MS = 350

export function GuiaProvider({ children }) {
  const [estado, despachar] = useReducer(reductorGuia, ESTADO_INICIAL)
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const elemento = useRef(null)
  const paso = pasoActual(estado)

  // 1. Navegar a la página del paso, si hace falta.
  useEffect(() => {
    if (estado.fase !== 'navegando' || !paso) return
    if (necesitaNavegar(paso, pathname)) navegar(paso.ruta)
    despachar({ tipo: 'navegado' })
    // pathname queda afuera a propósito: solo se decide al entrar en la fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.fase, estado.indice])

  // 2. Buscar el elemento (espera a que la página lo dibuje), llevarlo a la vista y medirlo.
  useEffect(() => {
    if (estado.fase !== 'buscando' || !paso) return
    const control = new AbortController()
    let reloj
    esperarElemento(selectorDe(paso.guia), { signal: control.signal }).then((el) => {
      if (control.signal.aborted) return
      if (!el) return despachar({ tipo: 'no-encontrado' })
      elemento.current = el
      llevarALaVista(el)
      reloj = setTimeout(() => despachar({ tipo: 'encontrado', rect: rectDe(el) }), prefiereMenosMovimiento() ? 0 : ESPERA_SCROLL_MS)
    })
    return () => {
      control.abort()
      clearTimeout(reloj)
    }
  }, [estado.fase, paso])

  // 3. Mientras se muestra, seguir al elemento si la página hace scroll o cambia de tamaño.
  useEffect(() => {
    if (estado.fase !== 'mostrando' || !elemento.current) return
    const el = elemento.current
    let cuadro = 0
    const medir = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => despachar({ tipo: 'mover', rect: rectDe(el) }))
    }
    window.addEventListener('scroll', medir, true)
    window.addEventListener('resize', medir)
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => {
      cancelAnimationFrame(cuadro)
      window.removeEventListener('scroll', medir, true)
      window.removeEventListener('resize', medir)
      observador.disconnect()
    }
  }, [estado.fase, estado.indice])

  // Teclado: Esc cierra, flechas avanzan o retroceden.
  useEffect(() => {
    if (!estado.activa) return
    const alTeclear = (e) => {
      if (e.key === 'Escape') despachar({ tipo: 'terminar' })
      else if (e.key === 'ArrowRight') despachar({ tipo: 'siguiente' })
      else if (e.key === 'ArrowLeft') despachar({ tipo: 'anterior' })
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [estado.activa])

  const iniciar = useCallback((pasos) => despachar({ tipo: 'iniciar', pasos }), [])
  const siguiente = useCallback(() => despachar({ tipo: 'siguiente' }), [])
  const anterior = useCallback(() => despachar({ tipo: 'anterior' }), [])
  const terminar = useCallback(() => despachar({ tipo: 'terminar' }), [])

  const valor = useMemo(
    () => ({ estado, paso, total: estado.pasos.length, iniciar, siguiente, anterior, terminar }),
    [estado, paso, iniciar, siguiente, anterior, terminar],
  )
  return <GuiaContext.Provider value={valor}>{children}</GuiaContext.Provider>
}

export function useGuia() {
  const valor = useContext(GuiaContext)
  if (!valor) throw new Error('useGuia debe usarse dentro de <GuiaProvider>')
  return valor
}
