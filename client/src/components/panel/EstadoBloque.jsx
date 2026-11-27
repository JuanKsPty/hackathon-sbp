import { Cargando } from '@/components/estados/Cargando.jsx'
import { PlaceholderGrafico } from '@/components/estados/PlaceholderGrafico.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'

// Estado común de un bloque del Panel que depende del período elegido y de una consulta al API:
// espera de los períodos, error al cargarlos, ningún período cargado, carga y error de la consulta.
// `vacio` (con `mensajeVacio`) cubre la respuesta correcta pero sin nada que mostrar.
// `alto` (px): si es un gráfico, la carga muestra un placeholder de ese alto para que no cambie el tamaño.
export function EstadoBloque({ consulta, filas = 3, alto, vacio = false, tituloVacio = 'Sin datos', mensajeVacio, children }) {
  const { periodo, cargando, error, reintentar } = usePeriodo()
  const carga = alto ? <PlaceholderGrafico alto={alto} /> : <Cargando filas={filas} />

  if (cargando) return carga
  if (error) return <ErrorApi error={error} alReintentar={reintentar} />
  if (!periodo) {
    return (
      <Vacio
        imagen="/marca/vacio-periodo.webp"
        titulo="No hay períodos cargados"
        descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí esta información."
      />
    )
  }
  // Entre elegir el período y que arranque la consulta hay un instante sin datos ni error: sigue siendo carga.
  if (consulta.cargando || (!consulta.datos && !consulta.error)) return carga
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (vacio) return <Vacio titulo={tituloVacio} descripcion={mensajeVacio} />
  return children
}
