import { Vacio } from '@/components/estados/Vacio.jsx'
import { Pagina } from './Pagina.jsx'

export default function Admin() {
  return (
    <Pagina titulo="Administración" descripcion="Carga de períodos, parámetros y bitácora (perfil Administrador).">
      <Vacio titulo="Sección en construcción" descripcion="Aquí estarán la carga de archivos AT03, los parámetros y la bitácora." />
    </Pagina>
  )
}
