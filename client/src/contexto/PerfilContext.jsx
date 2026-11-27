// Perfil activo (publico | analista | admin). Se guarda en localStorage y el cliente del API
// lo manda en el header X-Perfil. El selector de perfil es del issue #4: aquí solo el estado.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fijarPerfilDePeticiones } from '@/api/cliente.js'
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias.js'

export const PERFILES = ['publico', 'analista', 'admin']

export const NOMBRES_PERFIL = {
  publico: 'Público',
  analista: 'Analista',
  admin: 'Administrador',
}

const CLAVE = 'rankings.perfil'

const PerfilContext = createContext(null)

export function PerfilProvider({ children }) {
  const [perfil, setPerfil] = useState(() => {
    const inicial = leerPreferencia(CLAVE, PERFILES, 'publico')
    fijarPerfilDePeticiones(inicial)
    return inicial
  })

  useEffect(() => {
    fijarPerfilDePeticiones(perfil)
    guardarPreferencia(CLAVE, perfil)
  }, [perfil])

  const valor = useMemo(
    () => ({
      perfil,
      cambiarPerfil: (nuevo) => setPerfil(PERFILES.includes(nuevo) ? nuevo : 'publico'),
    }),
    [perfil],
  )

  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>
}

export function usePerfil() {
  const valor = useContext(PerfilContext)
  if (!valor) throw new Error('usePerfil debe usarse dentro de <PerfilProvider>')
  return valor
}
