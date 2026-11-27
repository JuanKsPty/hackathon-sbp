// Trae un nodo a la vista. Si está dentro de un contenedor con data-desplazable (el chat flotante),
// solo se desplaza ese contenedor y la página de atrás se queda donde está; si no, la página.
export function traerALaVista(nodo, { soloSiOculto = false } = {}) {
  if (!nodo) return
  const { top, bottom } = nodo.getBoundingClientRect()
  const desplazable = nodo.closest('[data-desplazable]')
  if (desplazable) {
    const caja = desplazable.getBoundingClientRect()
    if (soloSiOculto && !(top > caja.bottom - 120 || bottom < caja.top)) return
    desplazable.scrollBy({ top: top - caja.top - 8, behavior: 'smooth' })
    return
  }
  if (soloSiOculto && !(top > window.innerHeight - 120 || bottom < 0)) return
  nodo.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
