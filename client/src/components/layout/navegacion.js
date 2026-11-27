import {
  ArrowLeftRightIcon,
  FileDownIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react'

// Secciones de la app, en el orden del menú lateral.
export const SECCIONES = [
  { ruta: '/', nombre: 'Panel', icono: LayoutDashboardIcon },
  { ruta: '/rankings', nombre: 'Rankings', icono: ListOrderedIcon },
  { ruta: '/comparar', nombre: 'Comparar períodos', icono: ArrowLeftRightIcon },
  { ruta: '/reportes', nombre: 'Reportes', icono: FileDownIcon },
  { ruta: '/calidad', nombre: 'Calidad de datos', icono: ShieldCheckIcon },
  { ruta: '/admin', nombre: 'Administración', icono: SettingsIcon },
]

export const NOMBRE_APP = 'Rankings de Crédito'
