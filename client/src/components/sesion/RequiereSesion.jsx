import { Navigate, Outlet, useLocation } from 'react-router'
import { urlEntrar } from '@/api/sesion.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { usePerfil } from '@/contexto/PerfilContext.jsx'

// Guarda del sitio interno: sin sesión (GET /api/perfil dice Público) manda a /entrar y vuelve
// después a la ruta pedida. El backend también responde 401 SESION_REQUERIDA sin sesión.
export function RequiereSesion() {
  const { perfil, opcionesListas, errorOpciones, reintentarOpciones } = usePerfil()
  const ubicacion = useLocation()

  if (errorOpciones && !opcionesListas) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorApi error={errorOpciones} alReintentar={reintentarOpciones} />
      </div>
    )
  }
  if (!opcionesListas) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Cargando filas={3} etiqueta="Revisando la sesión…" />
      </div>
    )
  }
  if (perfil === 'publico') {
    return <Navigate to={urlEntrar(ubicacion.pathname + ubicacion.search)} replace />
  }
  return <Outlet />
}
