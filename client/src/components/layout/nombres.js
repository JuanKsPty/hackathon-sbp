// Textos de la navegación superior (#138). La lista de secciones vive en navegacion.js.

// Texto del centro de la navegación. Es el nombre del producto, no la marca de la SBP.
export const MARCA = 'RADAR SBP'

// Nombre corto de cada sección para la navegación en línea (el completo va en `title` y en el
// menú). Si la sección trae `corto`, manda ese.
const CORTOS = {
  '/comparar': 'Comparar',
  '/calidad': 'Calidad',
  '/admin': 'Admin',
}

export function nombreCorto(seccion) {
  return seccion.corto ?? CORTOS[seccion.ruta] ?? seccion.nombre
}
