import { useState } from 'react'
import { catalogos as pedirCatalogos, verificacion as pedirVerificacion } from '@/api/cliente.js'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { TODOS } from '@/components/rankings/FiltrosRanking.jsx'
import {
  DatosCalidad,
  DatosPeriodos,
  DatosPonderacion,
  DatosRankings,
  DatosSubactividades,
} from '@/components/verificacion/DatosPuntos.jsx'
import { FiltrosVerificacion } from '@/components/verificacion/FiltrosVerificacion.jsx'
import { PuntoVerificacion } from '@/components/verificacion/PuntoVerificacion.jsx'
import { ResumenVerificacion } from '@/components/verificacion/ResumenVerificacion.jsx'
import { PUNTOS } from '@/components/verificacion/puntos.js'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { Pagina } from './Pagina.jsx'
import { TODOS_LOS_PERIODOS } from '@/lib/periodos.js'

// Modo verificación (#63): un dato de cada uno de los 6 puntos de la sección 11.1, con sus chequeos
// de la sección 12, para mostrarlo en vivo al jurado. Todo viene de GET /api/verificacion (R2).
export default function Verificacion() {
  const { periodo: periodoGlobal, periodos, cambiarPeriodo, cargando: cargandoPeriodos, error: errorPeriodos, reintentar: reintentarPeriodos } = usePeriodo()
  // La verificación es de un corte: con "Todos los períodos" se muestra el más reciente.
  const periodo = periodoGlobal === TODOS_LOS_PERIODOS ? (periodos.at(-1)?.Fecha ?? null) : periodoGlobal
  const catalogo = useConsulta(pedirCatalogos)
  const [banco, setBanco] = useState(TODOS)
  const bancoFiltrado = banco === TODOS ? null : banco

  const consulta = useConsulta((o) => pedirVerificacion({ periodo, banco: bancoFiltrado }, o), [periodo, bancoFiltrado], {
    activa: Boolean(periodo),
  })

  if (catalogo.cargando || cargandoPeriodos) {
    return <Contenedor><Cargando filas={6} /></Contenedor>
  }
  if (catalogo.error || errorPeriodos) {
    return (
      <Contenedor>
        <ErrorApi error={catalogo.error ?? errorPeriodos} alReintentar={catalogo.error ? catalogo.reintentar : reintentarPeriodos} />
      </Contenedor>
    )
  }
  if (!periodo) {
    return (
      <Contenedor>
        <Vacio imagen="/marca/vacio-periodo.webp" titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su verificación." />
      </Contenedor>
    )
  }

  return (
    <Contenedor>
      <FiltrosVerificacion
        periodos={periodos}
        periodo={periodo}
        alCambiarPeriodo={cambiarPeriodo}
        bancos={catalogo.datos?.bancos ?? []}
        banco={banco}
        alCambiarBanco={setBanco}
      />
      {consulta.cargando && !consulta.datos && <Cargando filas={6} />}
      {!consulta.cargando && consulta.error && <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />}
      {consulta.datos && <Puntos datos={consulta.datos} />}
    </Contenedor>
  )
}

// El resumen y las 6 tarjetas. Cada punto sabe qué parte de `datos.puntos` le toca.
function Puntos({ datos }) {
  const { periodo, banco, puntos } = datos
  return (
    <>
      <ResumenVerificacion datos={datos} />
      {PUNTOS.map((punto) => {
        const resultado = puntos?.[punto.clave]
        if (!resultado) return null
        return (
          <PuntoVerificacion key={punto.numero} punto={punto} resultado={resultado} periodo={periodo} banco={banco}>
            <DatosDelPunto clave={punto.clave} datos={resultado.datos} periodo={periodo} banco={banco} />
          </PuntoVerificacion>
        )
      })}
    </>
  )
}

function DatosDelPunto({ clave, datos, periodo, banco }) {
  switch (clave) {
    case 'calidad':
      return <DatosCalidad datos={datos} periodo={periodo} />
    case 'rankings_obligatorios':
    case 'rankings_adicionales':
      return <DatosRankings datos={datos} banco={banco} />
    case 'ponderacion':
      return <DatosPonderacion datos={datos} />
    case 'subactividades':
      return <DatosSubactividades datos={datos} />
    case 'periodos':
      return <DatosPeriodos datos={datos} periodo={periodo} />
    default:
      return null
  }
}

function Contenedor({ children }) {
  return (
    <Pagina
      titulo="Verificación del jurado"
      descripcion="Un dato de cada punto de la sección 11.1, con sus chequeos de la lista de autoverificación, para mostrarlo en vivo."
    >
      {children}
    </Pagina>
  )
}
