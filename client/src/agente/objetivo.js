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

const guia = (id) => `[data-guia="${id}"]`

/**
 * Selectores del elemento que toca el cursor, del más preciso al más general (el primero que exista
 * en pantalla), o [] si la acción no tiene un lugar. Al elegir, apunta a la opción (la pestaña
 * COMERCIO), no al centro del control.
 */
export function objetivosDe(accion) {
  const uno = objetivoDe(accion)
  if (accion?.tipo === 'elegir') return [`${guia(accion.control)} [data-guia-opcion="${accion.valor}"]`, uno]
  return uno ? [uno] : []
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
