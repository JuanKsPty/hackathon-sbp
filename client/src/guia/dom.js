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

/**
 * Punto donde se apoya la punta del cursor: en el centro si el elemento es chico; cerca del borde de
 * arriba si es alto (una tabla, un gráfico), para que no apunte a una mitad que queda fuera de la pantalla.
 */
export function puntoDeCursor(rect) {
  return { top: rect.top + Math.min(rect.height / 2, 24), left: rect.left + Math.min(rect.width / 2, 40) }
}

/**
 * Desplaza la página para que el punto del cursor quede en el centro vertical de la pantalla y espera
 * a que el scroll termine: si se mide antes, el cursor va a una posición vieja y la página sigue moviéndose.
 */
export async function centrarCursorEn(el, signal) {
  // Dos cuadros: la acción anterior (por ejemplo, ordenar la tabla) ya se dibujó y el elemento está
  // en su lugar nuevo antes de medirlo.
  await new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo)))
  if (signal?.aborted) return
  const { top } = puntoDeCursor(el.getBoundingClientRect())
  const destino = Math.max(0, window.scrollY + top - window.innerHeight / 2)
  if (Math.abs(destino - window.scrollY) > 2) {
    window.scrollTo({ top: destino, behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' })
  }
  await scrollQuieto(signal)
}

// Espera a que el scroll de la página se quede quieto unos cuadros seguidos (máximo `maximo` ms).
function scrollQuieto(signal, maximo = 1200) {
  return new Promise((resolver) => {
    const inicio = performance.now()
    let anterior = window.scrollY
    let quietos = 0
    const mirar = () => {
      if (signal?.aborted) return resolver()
      quietos = window.scrollY === anterior ? quietos + 1 : 0
      anterior = window.scrollY
      if (quietos >= 4 || performance.now() - inicio > maximo) return resolver()
      requestAnimationFrame(mirar)
    }
    requestAnimationFrame(mirar)
  })
}

/** Centra el elemento en la pantalla (suave, salvo que el usuario prefiera menos movimiento). */
export function llevarALaVista(el) {
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' })
}
