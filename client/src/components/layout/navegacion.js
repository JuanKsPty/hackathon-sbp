import {
  ArrowLeftRightIcon,
  ClipboardCheckIcon,
  FileDownIcon,
  HouseIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react'

// Secciones de la app, en el orden del menú lateral. `guia`: identificador data-guia para el
// cursor guía (contracts/guia.md, #72). `opcion`: opción de GET /api/perfil que el perfil necesita
// para ver la sección en el menú (contracts/perfiles.md); sin `opcion` es pública.
export const SECCIONES = [
  { ruta: '/', nombre: 'Panel', icono: LayoutDashboardIcon, guia: 'global.menu-panel' },
  { ruta: '/rankings', nombre: 'Rankings', icono: ListOrderedIcon, guia: 'global.menu-rankings' },
  { ruta: '/comparar', nombre: 'Comparar períodos', icono: ArrowLeftRightIcon, guia: 'global.menu-comparar', opcion: 'comparar_periodos' },
  { ruta: '/reportes', nombre: 'Reportes', icono: FileDownIcon, guia: 'global.menu-reportes' },
  { ruta: '/calidad', nombre: 'Calidad de datos', icono: ShieldCheckIcon, guia: 'global.menu-calidad' },
  { ruta: '/verificacion', nombre: 'Verificación del jurado', icono: ClipboardCheckIcon, guia: 'global.menu-verificacion' },
  { ruta: '/admin', nombre: 'Administración', icono: SettingsIcon, guia: 'global.menu-admin', opcion: 'cargar_periodo' },
]

// Páginas que existen solo en el sitio interno: el sitio público (sbp.juank.tech) no muestra Calidad de
// datos ni Verificación del jurado (decisión de Jesús). Sus descargas CSV siguen en Reportes.
export const RUTAS_SOLO_INTERNAS = ['/calidad', '/verificacion']

// Menú del sitio público (#139): la ruta / es la landing (Inicio) y no hay secciones de Analista ni
// de Administrador, ni las páginas solo internas. Mantiene los mismos data-guia que SECCIONES.
export const SECCIONES_PUBLICO = [
  { ruta: '/', nombre: 'Inicio', icono: HouseIcon, guia: 'global.menu-panel' },
  ...SECCIONES.filter((s) => s.ruta !== '/' && !s.opcion && !RUTAS_SOLO_INTERNAS.includes(s.ruta)),
]

// __INTERNO__ lo define Vite (vite.config.js); en las pruebas de node no existe.
const ES_INTERNO = typeof __INTERNO__ !== 'undefined' && __INTERNO__

// ¿La página existe en este sitio? Sirve para no mostrar enlaces a páginas que el sitio público no
// tiene (por ejemplo, desde el asistente, que es el mismo en los dos sitios).
export function rutaDisponible(ruta, { interno = ES_INTERNO } = {}) {
  if (interno || !ruta) return true
  const base = String(ruta).split('?')[0]
  return !RUTAS_SOLO_INTERNAS.includes(base)
}

// Secciones que el perfil puede usar. `puede(opcion)` viene de usePerfil(); mientras las opciones
// cargan (o si el API falla) `puede` es siempre falso y quedan solo las secciones públicas.
// `interno` elige el menú del sitio (por defecto, el del bundle que se construye).
export function seccionesVisibles(puede, { interno = ES_INTERNO } = {}) {
  if (!interno) return SECCIONES_PUBLICO
  return SECCIONES.filter(({ opcion }) => !opcion || puede(opcion))
}

export const NOMBRE_APP = 'Rankings de Crédito'
