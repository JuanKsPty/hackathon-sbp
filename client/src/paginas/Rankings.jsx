import { Vacio } from '@/components/estados/Vacio.jsx'
import { Pagina } from './Pagina.jsx'

export default function Rankings() {
  return (
    <Pagina titulo="Rankings" descripcion="Posición de los 12 bancos en cada una de las 6 actividades de crédito.">
      <Vacio titulo="Sección en construcción" descripcion="Aquí estarán las tablas de ranking por actividad y el detalle por subactividad." />
    </Pagina>
  )
}
