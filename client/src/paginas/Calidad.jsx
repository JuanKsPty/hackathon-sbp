import { Vacio } from '@/components/estados/Vacio.jsx'
import { Pagina } from './Pagina.jsx'

export default function Calidad() {
  return (
    <Pagina titulo="Calidad de datos" descripcion="Cascada de exclusiones, reconciliaciones y alertas del archivo AT03.">
      <Vacio titulo="Sección en construcción" descripcion="Aquí estarán la cascada oficial, las reconciliaciones y la exclusión auditable." />
    </Pagina>
  )
}
