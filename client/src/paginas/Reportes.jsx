import { Vacio } from '@/components/estados/Vacio.jsx'
import { Pagina } from './Pagina.jsx'

export default function Reportes() {
  return (
    <Pagina titulo="Reportes" descripcion="Descargas CSV de los entregables: rankings, subactividades, calidad, excluidas y movimientos.">
      <Vacio titulo="Sección en construcción" descripcion="Aquí estarán los botones de descarga de cada reporte." />
    </Pagina>
  )
}
