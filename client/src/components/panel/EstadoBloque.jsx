import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'

// Estado común de un bloque del Panel que depende del período elegido y de una consulta al API:
// espera de los períodos, error al cargarlos, ningún período cargado, carga y error de la consulta.
// `vacio` (con `mensajeVacio`) cubre la respuesta correcta pero sin nada que mostrar.
export function EstadoBloque({ consulta, filas = 3, vacio = false, tituloVacio = 'Sin datos', mensajeVacio, children }) {
  const { periodo, cargando, error, reintentar } = usePeriodo()

  if (cargando) return <Cargando filas={filas} />
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
  if (consulta.cargando || (!consulta.datos && !consulta.error)) return <Cargando filas={filas} />
  if (consulta.error) return <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  if (vacio) return <Vacio titulo={tituloVacio} descripcion={mensajeVacio} />
  return children
}
