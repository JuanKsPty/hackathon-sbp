import { useCallback, useState } from 'react'
import { Bitacora } from '@/components/admin/Bitacora.jsx'
import { CargaPeriodo } from '@/components/admin/CargaPeriodo.jsx'
import { EstadoCatalogos } from '@/components/admin/EstadoCatalogos.jsx'
import { ReglaSignificativo } from '@/components/admin/ReglaSignificativo.jsx'
import { SoloAdministrador } from '@/components/admin/SoloAdministrador.jsx'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { Pagina } from './Pagina.jsx'

// Página /admin (#66), solo para el perfil Administrador (sección 10, entregable 8):
// cargar o actualizar un período, la regla de movimiento significativo, los catálogos
// y el registro de operaciones. Fuente, período y aviso los muestra la BarraFuente del layout.
export default function Admin() {
  const { perfil } = usePerfil()
  // Cada carga o cambio de parámetros sube la versión para que la bitácora se vuelva a pedir.
  const [version, setVersion] = useState(0)
  const avisarCambio = useCallback(() => setVersion((n) => n + 1), [])

  if (perfil !== 'admin') {
    return (
      <Pagina titulo="Administración" descripcion="Carga de períodos, parámetros, catálogos y registro de operaciones.">
        <SoloAdministrador perfil={perfil} />
      </Pagina>
    )
  }

  return (
    <Pagina titulo="Administración" descripcion="Carga de períodos, parámetros, catálogos y registro de operaciones.">
      <CargaPeriodo alCambiar={avisarCambio} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ReglaSignificativo alCambiar={avisarCambio} />
        <EstadoCatalogos />
      </div>
      <Bitacora version={version} />
    </Pagina>
  )
}
