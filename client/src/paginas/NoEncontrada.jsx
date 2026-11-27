import { Link } from 'react-router'
import { rutaEnElSitio } from '@/components/layout/navegacion.js'
import { CompassIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Pagina } from './Pagina.jsx'

export default function NoEncontrada() {
  return (
    <Pagina titulo="Página no encontrada" descripcion="La dirección no corresponde a ninguna sección.">
      <Vacio icono={CompassIcon} titulo="Error 404" descripcion="Revisa la dirección o vuelve al panel.">
        <Button asChild variant="outline" size="sm">
          <Link to={rutaEnElSitio('/')}>Ir al panel</Link>
        </Button>
      </Vacio>
    </Pagina>
  )
}
