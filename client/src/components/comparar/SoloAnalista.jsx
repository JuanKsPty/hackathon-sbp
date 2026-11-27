import { LockIcon } from 'lucide-react'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { NOMBRES_PERFIL, UBICACION_SELECTOR_PERFIL } from '@/contexto/PerfilContext.jsx'

// Aviso para Público: comparar períodos y bancos es de Analista y Administrador. El backend
// también responde 403 PERFIL_NO_AUTORIZADO aunque se llame directo a la API.
export function SoloAnalista({ perfil, que }) {
  return (
    <Vacio
      icono={LockIcon}
      titulo="Solo para los perfiles Analista y Administrador"
      descripcion={`${que} es del Analista y del Administrador. Tu perfil actual es ${NOMBRES_PERFIL[perfil] ?? perfil}. Para usarlo, elige Analista o Administrador en ${UBICACION_SELECTOR_PERFIL}.`}
    />
  )
}
