import { LockIcon } from 'lucide-react'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { NOMBRES_PERFIL, UBICACION_SELECTOR_PERFIL } from '@/contexto/PerfilContext.jsx'

// Mensaje para los perfiles que no son Administrador. El backend también responde 403
// a esos perfiles aunque llamen directo a la API (contracts/perfiles.md).
export function SoloAdministrador({ perfil }) {
  return (
    <Vacio
      icono={LockIcon}
      titulo="Esta sección es solo para el perfil Administrador"
      descripcion={`Tu perfil actual es ${NOMBRES_PERFIL[perfil] ?? perfil}. La carga de períodos, los parámetros, los catálogos y el registro de operaciones son del Administrador. Para entrar, elige Administrador en ${UBICACION_SELECTOR_PERFIL}.`}
    />
  )
}
