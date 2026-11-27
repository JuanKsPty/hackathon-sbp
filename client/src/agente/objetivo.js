// Adónde apunta el cursor en la demostración (#123), sin DOM para probarlo con node --test.
// Devuelve un selector CSS del elemento que el cursor "toca" en cada acción.

// Enlace del menú de cada página (contracts/guia.md: global.menu-*).
const MENU_POR_RUTA = {
  '/': 'global.menu-panel',
  '/rankings': 'global.menu-rankings',
  '/comparar': 'global.menu-comparar',
  '/reportes': 'global.menu-reportes',
  '/calidad': 'global.menu-calidad',
  '/admin': 'global.menu-admin',
}

/** Botón que abre el menú cuando las secciones no caben en el encabezado. */
export const BOTON_MENU = 'button[aria-label="Abrir menú"]'

const guia = (id) => `[data-guia="${id}"]`

/**
 * Selectores del elemento que toca el cursor, del más preciso al más general (el primero que exista
 * en pantalla), o [] si la acción no tiene un lugar. Al elegir, apunta a la opción (la pestaña
 * COMERCIO), no al centro del control.
 */
export function objetivosDe(accion) {
  const uno = objetivoDe(accion)
  if (accion?.tipo === 'elegir') return [`${guia(accion.control)} [data-guia-opcion="${accion.valor}"]`, uno]
  // En pantallas angostas el menú está dentro del botón de menú (arriba a la izquierda).
  if (accion?.tipo === 'ir' && uno) return [uno, BOTON_MENU]
  return uno ? [uno] : []
}

/**
 * Si el cursor hace clic de verdad en el objetivo: el enlace del menú o la pestaña. No en el control
 * general (el selector de período abriría su lista), ni en la fila resaltada, ni en la columna: un
 * clic en una columna nueva ordena de menor a mayor y la tabla parpadearía antes del orden pedido.
 */
export function seTocaDeVerdad(accion, indice) {
  if (accion?.tipo === 'ir') return true
  return accion?.tipo === 'elegir' && indice === 0
}

/** Selector principal del elemento (sin la opción). */
export function objetivoDe(accion) {
  switch (accion?.tipo) {
    case 'ir':
      return MENU_POR_RUTA[accion.ruta] ? guia(MENU_POR_RUTA[accion.ruta]) : null
    case 'ordenar':
      return `${guia(accion.control)} [data-guia-columna="${accion.columna}"]`
    case 'resaltar':
      return `${guia(accion.control)} [data-fila-banco="${accion.fila}"]`
    case 'elegir':
    case 'señalar':
      return guia(accion.control)
    default:
      return null
  }
}
