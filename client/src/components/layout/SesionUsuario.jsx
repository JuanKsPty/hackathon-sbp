import { useState } from 'react'
import { ArrowUpRightIcon, GlobeIcon, LockKeyholeIcon, LogOutIcon, UserIcon, UsersIcon } from 'lucide-react'
import { salir } from '@/api/sesion.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AVISO_ACCESO, DESCRIPCIONES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { cn } from '@/lib/utils'
import { urlOtroSitio } from './otroSitio.js'

// Quién está usando la app y con qué perfil, al pie del menú lateral (sección 10, entregable 8).
// - Sitio interno: el usuario de la sesión, su perfil y Salir.
// - Sitio público: "Consulta pública", sin inicio de sesión, y dónde están las opciones de Analista
//   y Administrador.
// En los dos sitios, el menú lleva al otro sitio (público <-> interno, otroSitio.js).
// Lleva data-guia="global.selector-perfil" para el cursor guía (contracts/guia.md).
export function SesionUsuario({ className }) {
  const { usuario, perfil, nombre } = usePerfil()
  const [saliendo, setSaliendo] = useState(false)

  async function cerrarSesion() {
    setSaliendo(true)
    try {
      await salir()
    } catch {
      // Aunque falle, se vuelve a /entrar: la cookie vence sola.
    }
    // Recarga completa: borra de memoria los datos de la sesión anterior.
    window.location.assign('/entrar')
  }

  const quien = __INTERNO__ ? usuario?.nombre || usuario?.usuario || 'Sin sesión' : 'Consulta pública'
  const detalle = __INTERNO__ ? `Perfil ${nombre}` : 'Sin inicio de sesión'
  const Icono = __INTERNO__ ? UserIcon : UsersIcon
  const otroSitio =
    typeof window === 'undefined' ? '/' : urlOtroSitio({ interno: __INTERNO__, ubicacion: window.location, env: import.meta.env })
  const IconoOtroSitio = __INTERNO__ ? GlobeIcon : LockKeyholeIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-guia="global.selector-perfil"
        aria-label={`${quien}, ${detalle}. Abrir menú del perfil`}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left outline-none transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
          className,
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
          <Icono className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{quien}</span>
          <span className="truncate text-xs opacity-80">{detalle}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span>{quien}</span>
          <span className="text-xs font-normal text-muted-foreground">
            Perfil {nombre}. {DESCRIPCIONES_PERFIL[perfil]}
          </span>
          {!__INTERNO__ && (
            <span className="text-xs font-normal text-muted-foreground">
              Comparar períodos y Administración: {AVISO_ACCESO.charAt(0).toLowerCase() + AVISO_ACCESO.slice(1)}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={otroSitio}>
            <IconoOtroSitio aria-hidden="true" />
            {__INTERNO__ ? 'Ir al sitio público' : 'Ir al sitio interno'}
            <ArrowUpRightIcon aria-hidden="true" className="ml-auto text-muted-foreground" />
          </a>
        </DropdownMenuItem>
        {__INTERNO__ && (
          <DropdownMenuItem onSelect={cerrarSesion} disabled={saliendo}>
            <LogOutIcon aria-hidden="true" />
            Salir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
