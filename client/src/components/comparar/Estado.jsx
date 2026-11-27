import { Cargando } from '@/components/estados/Cargando.jsx'
import { PlaceholderGrafico } from '@/components/estados/PlaceholderGrafico.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'

// Carga, error, sin datos o contenido de una consulta de useConsulta.
// `activa`: si la consulta aún no se pide (por ejemplo, falta elegir algo) no hay datos ni error,
// y se muestra la carga en vez de un vacío falso durante el primer cuadro.
// `alto` (px): si es un gráfico, la carga ocupa ese alto para que no cambie el tamaño.
export function Estado({ consulta, activa = true, alto, vacio = false, tituloVacio = 'Sin datos', descripcionVacio = 'No hay datos para los filtros elegidos.', children }) {
  // Al volver a pedir, lo anterior sigue a la vista: la página no se achica ni salta el scroll.
  if ((consulta.cargando || activa) && !consulta.datos && !consulta.error) return alto ? <PlaceholderGrafico alto={alto} /> : <Cargando filas={4} />
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (vacio) return <Vacio titulo={tituloVacio} descripcion={descripcionVacio} />
  return children
}
