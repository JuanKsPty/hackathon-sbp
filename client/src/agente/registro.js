// Registro de controles de pantalla (#122), sin React ni DOM para probarlo con node --test.
// Cada control de una página (su id es el data-guia) registra sus handlers: elegir, ordenar,
// resaltar, y estado/restaurar para poder deshacer. El ejecutor de acciones los busca aquí.

export function crearRegistro() {
  const controles = new Map()
  const esperando = new Map() // id -> Set de funciones que esperan a que el control se registre

  function avisar(id) {
    for (const resolver of esperando.get(id) ?? []) resolver(controles.get(id))
    esperando.delete(id)
  }

  return {
    /** Registra los handlers de un control. Devuelve la función para quitarlo. */
    registrar(id, handlers) {
      controles.set(id, handlers)
      avisar(id)
      return () => {
        if (controles.get(id) === handlers) controles.delete(id)
      }
    },

    obtener(id) {
      return controles.get(id) ?? null
    },

    /**
     * Espera a que el control esté registrado (por ejemplo, después de navegar a su página).
     * Resuelve con sus handlers, o con null si no aparece antes del timeout o si se cancela.
     */
    esperar(id, { timeout = 4000, signal } = {}) {
      const ya = controles.get(id)
      if (ya) return Promise.resolve(ya)
      return new Promise((resolver) => {
        const lista = esperando.get(id) ?? new Set()
        let reloj
        const terminar = (valor) => {
          clearTimeout(reloj)
          lista.delete(terminar)
          signal?.removeEventListener('abort', alCancelar)
          resolver(valor)
        }
        const alCancelar = () => terminar(null)
        lista.add(terminar)
        esperando.set(id, lista)
        reloj = setTimeout(() => terminar(null), timeout)
        signal?.addEventListener('abort', alCancelar)
      })
    },
  }
}
