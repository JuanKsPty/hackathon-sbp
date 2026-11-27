// Puente del cursor guía (#72) con el DOM: encontrar el elemento [data-guia], llevarlo a la vista y medirlo.

/**
 * Espera a que aparezca un elemento visible (por ejemplo, después de navegar y cargar datos).
 * Resuelve con el elemento, o con null si no aparece antes del timeout o si se cancela.
 */
export function esperarElemento(selector, { timeout = 4000, signal, raiz = document } = {}) {
  return new Promise((resolver) => {
    // El primero visible: un mismo data-guia puede repetirse (por ejemplo, el menú de escritorio y el de móvil).
    const buscar = () => [...raiz.querySelectorAll(selector)].find(esVisible) ?? null
    const inmediato = buscar()
    if (inmediato) return resolver(inmediato)

    let terminado = false
    const terminar = (valor) => {
      if (terminado) return
      terminado = true
      observador.disconnect()
      clearTimeout(reloj)
      clearInterval(sondeo)
      signal?.removeEventListener('abort', alCancelar)
      resolver(valor)
    }
    const revisar = () => {
      const el = buscar()
      if (el) terminar(el)
    }
    const alCancelar = () => terminar(null)
    const observador = new MutationObserver(revisar)
    observador.observe(raiz.body ?? raiz, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-guia', 'class', 'style', 'hidden'] })
    // Por si el elemento pasa a ser visible sin cambios en el DOM (por ejemplo, una animación de CSS).
    const sondeo = setInterval(revisar, 250)
    const reloj = setTimeout(() => terminar(null), timeout)
    signal?.addEventListener('abort', alCancelar)
  })
}

export function esVisible(el) {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export function rectDe(el) {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Centra el elemento en la pantalla (suave, salvo que el usuario prefiera menos movimiento). */
export function llevarALaVista(el) {
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' })
}
