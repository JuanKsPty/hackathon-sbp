import { ResumenPeriodo } from '@/components/panel/ResumenPeriodo.jsx'
import { Pagina } from './Pagina.jsx'

export default function Panel() {
  return (
    <Pagina titulo="Panel" descripcion="Vista general del período: cartera válida, líderes y movimientos destacados.">
      <ResumenPeriodo />
    </Pagina>
  )
}
