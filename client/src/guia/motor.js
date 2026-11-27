// Motor del cursor guía (#72), sin DOM ni React para poder probarlo con node --test.
// Recibe los pasos de POST /api/ia/preguntar (`guia.pasos`: { ruta, guia, texto }) y decide en qué
// paso está, si hay que navegar, qué elemento buscar y dónde poner el globo de texto.

// Estados de un paso: 'navegando' → 'buscando' → 'mostrando' (o 'no-encontrado' si el elemento no
// aparece en pantalla, por ejemplo porque esa sección todavía no tiene su data-guia).
export const ESTADO_INICIAL = { activa: false, pasos: [], indice: 0, fase: 'inactiva', rect: null }

/** Deja solo los pasos con identificador y texto (la ruta puede ser null: elemento del layout). */
export function normalizarPasos(guia) {
  const pasos = Array.isArray(guia?.pasos) ? guia.pasos : []
  return pasos
    .filter((p) => typeof p?.guia === 'string' && p.guia && typeof p?.texto === 'string' && p.texto.trim())
    .map((p) => ({ ruta: typeof p.ruta === 'string' ? p.ruta : null, guia: p.guia, texto: p.texto.trim() }))
}

export function reductorGuia(estado, accion) {
  switch (accion.tipo) {
    case 'iniciar': {
      const pasos = normalizarPasos({ pasos: accion.pasos })
      return pasos.length ? { activa: true, pasos, indice: 0, fase: 'navegando', rect: null } : ESTADO_INICIAL
    }
    case 'navegado':
      return estado.activa ? { ...estado, fase: 'buscando' } : estado
    case 'encontrado':
      return estado.activa ? { ...estado, fase: 'mostrando', rect: accion.rect } : estado
    case 'no-encontrado':
      return estado.activa ? { ...estado, fase: 'no-encontrado', rect: null } : estado
    case 'mover': // el elemento se movió (scroll, resize): solo actualiza la posición
      return estado.activa && estado.fase === 'mostrando' ? { ...estado, rect: accion.rect } : estado
    case 'siguiente':
      if (!estado.activa) return estado
      if (estado.indice >= estado.pasos.length - 1) return ESTADO_INICIAL
      return { ...estado, indice: estado.indice + 1, fase: 'navegando', rect: null }
    case 'anterior':
      if (!estado.activa || estado.indice === 0) return estado
      return { ...estado, indice: estado.indice - 1, fase: 'navegando', rect: null }
    case 'terminar':
      return ESTADO_INICIAL
    default:
      return estado
  }
}

export const pasoActual = (estado) => (estado.activa ? estado.pasos[estado.indice] : null)

/** ¿Hay que cambiar de página para este paso? (ruta null = elemento del layout, está en todas). */
export function necesitaNavegar(paso, rutaActual) {
  if (!paso?.ruta) return false
  const limpiar = (r) => (r.length > 1 ? r.replace(/\/+$/, '') : r)
  return limpiar(paso.ruta) !== limpiar(rutaActual ?? '/')
}

/** Selector CSS del elemento; el identificador se escapa (solo admite letras, números, punto y guion). */
export function selectorDe(guia) {
  if (!/^[a-z0-9.-]+$/i.test(guia)) throw new Error(`Identificador data-guia inválido: "${guia}"`)
  return `[data-guia="${guia}"]`
}

/**
 * Dónde poner el globo junto al elemento resaltado, sin salirse de la pantalla.
 * Prueba abajo, arriba, a la derecha y a la izquierda; si ninguno entra, lo pone abajo y lo ajusta.
 * @param {{top, left, width, height}} rect posición del elemento (getBoundingClientRect)
 * @param {{ancho, alto}} pantalla tamaño de la ventana
 * @param {{ancho, alto}} globo tamaño del globo
 * @returns {{ top, left, lado }}
 */
export function posicionGlobo(rect, pantalla, globo, separacion = 12, margen = 8) {
  const centroX = rect.left + rect.width / 2 - globo.ancho / 2
  const centroY = rect.top + rect.height / 2 - globo.alto / 2
  const candidatos = [
    { lado: 'abajo', top: rect.top + rect.height + separacion, left: centroX },
    { lado: 'arriba', top: rect.top - separacion - globo.alto, left: centroX },
    { lado: 'derecha', top: centroY, left: rect.left + rect.width + separacion },
    { lado: 'izquierda', top: centroY, left: rect.left - separacion - globo.ancho },
  ]
  const entra = (c) =>
    c.top >= margen && c.top + globo.alto <= pantalla.alto - margen && c.left >= margen && c.left + globo.ancho <= pantalla.ancho - margen
  const ajustar = (valor, max) => Math.min(Math.max(valor, margen), Math.max(margen, max - margen))
  // Abajo y arriba admiten correr el globo de costado para que entre.
  const elegido =
    candidatos.find(entra) ??
    candidatos.slice(0, 2).map((c) => ({ ...c, left: ajustar(c.left, pantalla.ancho - globo.ancho) })).find(entra) ??
    candidatos[0]
  return {
    lado: elegido.lado,
    top: ajustar(elegido.top, pantalla.alto - globo.alto),
    left: ajustar(elegido.left, pantalla.ancho - globo.ancho),
  }
}
