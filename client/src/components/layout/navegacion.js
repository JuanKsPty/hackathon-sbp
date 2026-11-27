import {
  ArrowLeftRightIcon,
  FileDownIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react'

// Secciones de la app, en el orden del menú lateral. `guia`: identificador data-guia para el
// cursor guía (contracts/guia.md, #72).
export const SECCIONES = [
  { ruta: '/', nombre: 'Panel', icono: LayoutDashboardIcon, guia: 'global.menu-panel' },
  { ruta: '/rankings', nombre: 'Rankings', icono: ListOrderedIcon, guia: 'global.menu-rankings' },
  { ruta: '/comparar', nombre: 'Comparar períodos', icono: ArrowLeftRightIcon, guia: 'global.menu-comparar' },
  { ruta: '/reportes', nombre: 'Reportes', icono: FileDownIcon, guia: 'global.menu-reportes' },
  { ruta: '/calidad', nombre: 'Calidad de datos', icono: ShieldCheckIcon, guia: 'global.menu-calidad' },
  { ruta: '/admin', nombre: 'Administración', icono: SettingsIcon, guia: 'global.menu-admin' },
]

export const NOMBRE_APP = 'Rankings de Crédito'
