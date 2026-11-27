// Hook para que un componente registre su control de pantalla (#122) mientras está montado.
// Ejemplo (en la tabla de rankings):
//   useControlGuia('rankings.tabla', {
//     ordenar: (columna, orden) => setOrden({ clave: columna, ascendente: orden === 'asc' }),
//     resaltar: (fila) => setResaltada(fila),
//     estado: () => ({ orden, resaltada }),
//     restaurar: (e) => { setOrden(e.orden); setResaltada(e.resaltada) },
//   })
// El registro guarda un intermediario estable que siempre llama a los handlers más recientes,
// así no se vuelve a registrar en cada render.
import { useEffect, useRef } from 'react'
import { useAgente } from './AgenteContext.jsx'

const METODOS = ['elegir', 'ordenar', 'resaltar', 'estado', 'restaurar', 'actual']

export function useControlGuia(id, handlers) {
  const { registro } = useAgente()
  const actuales = useRef(handlers)
  useEffect(() => {
    actuales.current = handlers
  })

  useEffect(() => {
    if (!id) return undefined
    const intermediario = Object.fromEntries(
      METODOS.filter((m) => typeof actuales.current?.[m] === 'function').map((m) => [m, (...args) => actuales.current?.[m]?.(...args)]),
    )
    return registro.registrar(id, intermediario)
  }, [id, registro])
}
