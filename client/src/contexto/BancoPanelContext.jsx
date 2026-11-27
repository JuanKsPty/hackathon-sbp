// Banco elegido en los Paneles (#204). Vive en la URL (?banco=108) para que el enlace se pueda
// compartir, y se valida contra el catálogo (GET /api/catalogos): un código que no existe se ignora
// y el Panel queda como sin filtro. Fuera de un Panel (sin BancoPanelProvider) no hay filtro.
import { createContext, useCallback, useContext, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { catalogos as pedirCatalogos } from '@/api/cliente.js'
import { useConsulta } from '@/hooks/useConsulta.js'

const BancoPanelContext = createContext(null)

const SIN_FILTRO = { banco: null, nombreBanco: null, bancos: [], cambiarBanco: () => {}, disponible: false }

export function BancoPanelProvider({ children }) {
  const [parametros, setParametros] = useSearchParams()
  const catalogo = useConsulta(pedirCatalogos)
  const bancos = catalogo.datos?.bancos ?? []
  const pedido = parametros.get('banco')?.trim() || null
  const elegido = bancos.find((b) => b.Codigo_Banco === pedido) ?? null

  // null = todos los bancos. Cambia solo ?banco= y conserva el resto de la dirección.
  const cambiarBanco = useCallback(
    (codigo) =>
      setParametros(
        (previos) => {
          const siguientes = new URLSearchParams(previos)
          if (codigo) siguientes.set('banco', codigo)
          else siguientes.delete('banco')
          return siguientes
        },
        { replace: true },
      ),
    [setParametros],
  )

  const valor = useMemo(
    () => ({ banco: elegido?.Codigo_Banco ?? null, nombreBanco: elegido?.Banco ?? null, bancos, cambiarBanco, disponible: true }),
    [elegido, bancos, cambiarBanco],
  )
  return <BancoPanelContext.Provider value={valor}>{children}</BancoPanelContext.Provider>
}

// { banco, nombreBanco, bancos, cambiarBanco, disponible }. `banco` es null sin filtro.
export function useBancoPanel() {
  return useContext(BancoPanelContext) ?? SIN_FILTRO
}
