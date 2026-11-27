import {
  ArrowLeftRightIcon,
  ClipboardCheckIcon,
  FileDownIcon,
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

// Menú del sitio público: la ruta / es la landing (paginas/Inicio.jsx, a pantalla completa y fuera
// del menú) y el Panel con los datos está en /panel. No hay secciones de Analista ni de
// Administrador. Mantiene los mismos data-guia que SECCIONES.
export const RUTA_PANEL_PUBLICO = '/panel'
export const SECCIONES_PUBLICO = [
  { ruta: RUTA_PANEL_PUBLICO, nombre: 'Panel', icono: LayoutDashboardIcon, guia: 'global.menu-panel' },
  ...SECCIONES.filter((s) => s.ruta !== '/' && !s.opcion),
]

// __INTERNO__ lo define Vite (vite.config.js); en las pruebas de node no existe.
const ES_INTERNO = typeof __INTERNO__ !== 'undefined' && __INTERNO__

// Secciones que el perfil puede usar. `puede(opcion)` viene de usePerfil(); mientras las opciones
// cargan (o si el API falla) `puede` es siempre falso y quedan solo las secciones públicas.
// `interno` elige el menú del sitio (por defecto, el del bundle que se construye).
export function seccionesVisibles(puede, { interno = ES_INTERNO } = {}) {
  if (!interno) return SECCIONES_PUBLICO
  return SECCIONES.filter(({ opcion }) => !opcion || puede(opcion))
}

// Ruta real de una página en el sitio que se construye. El catálogo del agente guía (server) dice que
// el Panel está en /; en el sitio público el Panel está en /panel (/ es la landing). La guía y las
// acciones de pantalla navegan con esta función.
export function rutaEnElSitio(ruta, { interno = ES_INTERNO } = {}) {
  if (interno || typeof ruta !== 'string') return ruta
  return ruta === '/' ? RUTA_PANEL_PUBLICO : ruta
}

export const NOMBRE_APP = 'Rankings de Crédito'
