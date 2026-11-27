// Períodos cargados (GET /api/periodos) y el período elegido («Período de los datos», junto al título
// de Panel, Rankings y Calidad; vale para toda la app).
// Por defecto se elige `ultimo`, el más reciente que reporta el API. También se puede elegir
// "Todos los períodos" (TODOS_LOS_PERIODOS): el acumulado de los cortes, que calcula el API.
import { createContext, useContext, useMemo, useState } from 'react'
import { periodos as pedirPeriodos } from '@/api/cliente.js'
import { useConsulta } from '@/hooks/useConsulta.js'
import { TODOS_LOS_PERIODOS } from '@/lib/periodos.js'

const PeriodoContext = createContext(null)

export function PeriodoProvider({ children }) {
  const { datos, error, cargando, reintentar } = useConsulta(pedirPeriodos)
  const [elegido, setElegido] = useState(null)

  const valor = useMemo(() => {
    const lista = Array.isArray(datos?.periodos) ? datos.periodos : []
    const existe = (fecha) => (fecha === TODOS_LOS_PERIODOS ? lista.length > 0 : lista.some((p) => p.Fecha === fecha))
    const periodo = elegido && existe(elegido) ? elegido : (datos?.ultimo ?? lista.at(-1)?.Fecha ?? null)
    return {
      periodos: lista,
      periodo,
      detallePeriodo: periodo === TODOS_LOS_PERIODOS ? (datos?.acumulado ?? null) : (lista.find((p) => p.Fecha === periodo) ?? null),
      cambiarPeriodo: setElegido,
      cargando,
      error,
      reintentar,
    }
  }, [datos, elegido, cargando, error, reintentar])

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>
}

export function usePeriodo() {
  const valor = useContext(PeriodoContext)
  if (!valor) throw new Error('usePeriodo debe usarse dentro de <PeriodoProvider>')
  return valor
}
