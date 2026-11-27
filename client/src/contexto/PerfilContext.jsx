// Perfil activo (publico | analista | admin) y lo que ese perfil puede hacer.
// - El perfil elegido se guarda en localStorage y el cliente del API lo manda en el header X-Perfil.
// - Las opciones del perfil salen de GET /api/perfil (contracts/perfiles.md): es la fuente de verdad
//   del menú. Se vuelven a pedir cada vez que cambia el perfil.
// - Mientras las opciones cargan, o si el API falla, `opciones` queda vacía y `puede()` responde
//   falso: la UI muestra solo lo público. El backend responde 403 de todos modos.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fijarPerfilDePeticiones, perfil as pedirPerfil } from '@/api/cliente.js'
import { useConsulta } from '@/hooks/useConsulta.js'
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias.js'

export const PERFILES = ['publico', 'analista', 'admin']

export const NOMBRES_PERFIL = {
  publico: 'Público',
  analista: 'Analista',
  admin: 'Administrador',
}

// Una línea por perfil para el selector (entregable 8). Es texto de ayuda: lo que de verdad
// puede hacer cada perfil lo dicen las opciones de GET /api/perfil.
export const DESCRIPCIONES_PERFIL = {
  publico: 'Consulta rankings, filtra, ve gráficos y descarga los reportes abiertos.',
  analista: 'Además compara períodos y entidades y genera reportes personalizados.',
  admin: 'Además carga períodos y administra parámetros, catálogos y el registro de operaciones.',
}

// Dónde está el selector de perfil, para los avisos de "sección bloqueada": "Elige X en {UBICACION}."
export const UBICACION_SELECTOR_PERFIL = 'el selector de perfil del encabezado (en el celular, dentro del menú)'

const CLAVE = 'rankings.perfil'

const SIN_OPCIONES = []
const PERFILES_RESPALDO = PERFILES.map((perfil) => ({ perfil, nombre: NOMBRES_PERFIL[perfil] }))

const PerfilContext = createContext(null)

export function PerfilProvider({ children }) {
  const [perfil, setPerfil] = useState(() => {
    const inicial = leerPreferencia(CLAVE, PERFILES, 'publico')
    fijarPerfilDePeticiones(inicial)
    return inicial
  })

  useEffect(() => {
    guardarPreferencia(CLAVE, perfil)
  }, [perfil])

  // El header va antes de renderizar con el perfil nuevo: los efectos de los hijos (que pueden
  // volver a pedir datos al cambiar el perfil) corren antes que los de este componente.
  const cambiarPerfil = useCallback((nuevo) => {
    const elegido = PERFILES.includes(nuevo) ? nuevo : 'publico'
    fijarPerfilDePeticiones(elegido)
    setPerfil(elegido)
  }, [])

  const consulta = useConsulta(pedirPerfil, [perfil])

  // Una respuesta vieja (de otro perfil) no cuenta mientras llega la nueva.
  const respuesta = consulta.datos?.perfil === perfil ? consulta.datos : null
  const opciones = respuesta?.opciones ?? SIN_OPCIONES
  const perfiles = consulta.datos?.perfiles ?? PERFILES_RESPALDO

  const puede = useCallback((opcion) => opciones.some((o) => o.opcion === opcion), [opciones])

  const valor = useMemo(
    () => ({
      perfil,
      nombre: NOMBRES_PERFIL[perfil] ?? perfil,
      cambiarPerfil,
      perfiles,
      opciones,
      puede,
      opcionesListas: respuesta !== null,
      errorOpciones: consulta.error,
      reintentarOpciones: consulta.reintentar,
    }),
    [perfil, cambiarPerfil, perfiles, opciones, puede, respuesta, consulta.error, consulta.reintentar],
  )

  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>
}

export function usePerfil() {
  const valor = useContext(PerfilContext)
  if (!valor) throw new Error('usePerfil debe usarse dentro de <PerfilProvider>')
  return valor
}
