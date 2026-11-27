// Períodos cargados (GET /api/periodos) y el período elegido en el encabezado.
// Por defecto se elige `ultimo`, el más reciente que reporta el API.
import { createContext, useContext, useMemo, useState } from 'react'
import { periodos as pedirPeriodos } from '@/api/cliente.js'
import { useConsulta } from '@/hooks/useConsulta.js'

const PeriodoContext = createContext(null)

export function PeriodoProvider({ children }) {
  const { datos, error, cargando, reintentar } = useConsulta(pedirPeriodos)
  const [elegido, setElegido] = useState(null)

  const valor = useMemo(() => {
    const lista = Array.isArray(datos?.periodos) ? datos.periodos : []
    const existe = (fecha) => lista.some((p) => p.Fecha === fecha)
    const periodo = elegido && existe(elegido) ? elegido : (datos?.ultimo ?? lista.at(-1)?.Fecha ?? null)
    return {
      periodos: lista,
      periodo,
      detallePeriodo: lista.find((p) => p.Fecha === periodo) ?? null,
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
