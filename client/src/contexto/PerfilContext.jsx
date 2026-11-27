// Perfil de la sesión (publico | analista | admin) y lo que ese perfil puede hacer.
// - El perfil ya no se elige en la UI: lo dice GET /api/perfil a partir de la cookie de sesión del
//   sitio interno. En el sitio público siempre es Público (contracts/perfiles.md).
// - Las opciones del perfil salen de esa misma respuesta: son la fuente de verdad del menú.
// - Mientras cargan, o si el API falla, `opciones` queda vacía y `puede()` responde falso: la UI
//   muestra solo lo público. El backend responde 401/403 de todos modos.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fijarPerfilDePeticiones, perfil as pedirPerfil } from '@/api/cliente.js'
import { useConsulta } from '@/hooks/useConsulta.js'

export const PERFILES = ['publico', 'analista', 'admin']

export const NOMBRES_PERFIL = {
  publico: 'Público',
  analista: 'Analista',
  admin: 'Administrador',
}

// Una línea por perfil (entregable 8). Es texto de ayuda: lo que de verdad puede hacer cada perfil
// lo dicen las opciones de GET /api/perfil.
export const DESCRIPCIONES_PERFIL = {
  publico: 'Consulta rankings, filtra, ve gráficos y descarga los reportes abiertos.',
  analista: 'Además compara períodos y entidades y genera reportes personalizados.',
  admin: 'Además carga períodos y administra parámetros, catálogos, usuarios, permisos y el registro de operaciones.',
}

// Cómo llegar a una opción que el perfil actual no tiene, para los avisos de "sección bloqueada".
// En el público: el sitio interno. En el interno: entrar con otra cuenta.
export const AVISO_ACCESO = __INTERNO__
  ? 'Para usarlo, entra con una cuenta de Analista o Administrador.'
  : 'Está disponible en el sitio interno, para Analistas y Administradores.'

const SIN_OPCIONES = []
const PERFILES_RESPALDO = PERFILES.map((perfil) => ({ perfil, nombre: NOMBRES_PERFIL[perfil] }))

const PerfilContext = createContext(null)

export function PerfilProvider({ children }) {
  // Sube al iniciar o cerrar sesión: vuelve a pedir GET /api/perfil.
  const [version, setVersion] = useState(0)
  const consulta = useConsulta(pedirPerfil, [version])

  const respuesta = consulta.datos ?? null
  const perfil = PERFILES.includes(respuesta?.perfil) ? respuesta.perfil : 'publico'
  const opciones = respuesta?.opciones ?? SIN_OPCIONES
  const perfiles = respuesta?.perfiles ?? PERFILES_RESPALDO
  const usuario = respuesta?.usuario ?? null

  useEffect(() => {
    fijarPerfilDePeticiones(perfil)
  }, [perfil])

  const puede = useCallback((opcion) => opciones.some((o) => o.opcion === opcion), [opciones])
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  const valor = useMemo(
    () => ({
      perfil,
      nombre: NOMBRES_PERFIL[perfil] ?? perfil,
      usuario,
      sitio: respuesta?.sitio ?? (__INTERNO__ ? 'interno' : 'publico'),
      perfiles,
      opciones,
      puede,
      recargar,
      opcionesListas: respuesta !== null && !consulta.cargando,
      errorOpciones: consulta.error,
      reintentarOpciones: consulta.reintentar,
    }),
    [perfil, usuario, respuesta, perfiles, opciones, puede, recargar, consulta.cargando, consulta.error, consulta.reintentar],
  )

  return <PerfilContext.Provider value={valor}>{children}</PerfilContext.Provider>
}

export function usePerfil() {
  const valor = useContext(PerfilContext)
  if (!valor) throw new Error('usePerfil debe usarse dentro de <PerfilProvider>')
  return valor
}
