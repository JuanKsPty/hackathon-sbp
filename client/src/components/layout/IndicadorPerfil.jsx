import { UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NOMBRES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'

// Marcador provisional: muestra el perfil activo. El selector de perfil es del issue #4.
export function IndicadorPerfil() {
  const { perfil } = usePerfil()
  return (
    <Badge variant="outline" className="hidden sm:inline-flex" title="El selector de perfil llega con el issue #4">
      <UserIcon aria-hidden="true" />
      {NOMBRES_PERFIL[perfil] ?? perfil}
    </Badge>
  )
}
