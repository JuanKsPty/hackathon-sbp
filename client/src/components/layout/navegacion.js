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

// Secciones que el perfil puede usar. `puede(opcion)` viene de usePerfil(); mientras las opciones
// cargan (o si el API falla) `puede` es siempre falso y quedan solo las secciones públicas.
export function seccionesVisibles(puede) {
  return SECCIONES.filter(({ opcion }) => !opcion || puede(opcion))
}

export const NOMBRE_APP = 'Rankings de Crédito'
