// Tema claro, oscuro o del sistema. El oscuro pone la clase "dark" en <html>
// (tema.css define los colores de .dark). La preferencia se guarda en localStorage.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias.js'

export const TEMAS = ['claro', 'oscuro', 'sistema']

const CLAVE = 'rankings.tema'

const TemaContext = createContext(null)

function sistemaEsOscuro() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function aplicarTema(tema) {
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && sistemaEsOscuro())
  document.documentElement.classList.toggle('dark', oscuro)
  // La barra del navegador del teléfono sigue al tema elegido: toma el --background de tema.css.
  try {
    const fondo = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
    if (fondo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo)
  } catch {
    // Sin estilos calculados (pruebas o navegador viejo): la meta queda como está.
  }
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => leerPreferencia(CLAVE, TEMAS, 'sistema'))

  useEffect(() => {
    aplicarTema(tema)
    guardarPreferencia(CLAVE, tema)
    if (tema !== 'sistema') return undefined

    // En "sistema" se sigue el cambio del sistema operativo sin recargar.
    let consulta
    try {
      consulta = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return undefined
    }
    const alCambiar = () => aplicarTema('sistema')
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [tema])

  const valor = useMemo(
    () => ({ tema, cambiarTema: (nuevo) => setTema(TEMAS.includes(nuevo) ? nuevo : 'sistema') }),
    [tema],
  )

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}

export function useTema() {
  const valor = useContext(TemaContext)
  if (!valor) throw new Error('useTema debe usarse dentro de <TemaProvider>')
  return valor
}
