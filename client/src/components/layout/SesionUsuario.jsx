import { useState } from 'react'
import { ArrowUpRightIcon, GlobeIcon, LogOutIcon, UserIcon, UsersIcon } from 'lucide-react'
import { salir } from '@/api/sesion.js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DESCRIPCIONES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { cn } from '@/lib/utils'
import { urlOtroSitio } from './otroSitio.js'

// Quién está usando la app y con qué perfil, al pie del menú lateral (sección 10, entregable 8).
// - Sitio interno: el usuario de la sesión, su perfil, el enlace al sitio público y Salir. Lleva
//   data-guia="global.selector-perfil" para el cursor guía (contracts/guia.md).
// - Sitio público: "Consulta pública", abierta y sin cuenta. No menciona el sitio interno.
export function SesionUsuario({ className }) {
  if (!__INTERNO__) return <ConsultaPublica className={className} />
  return <SesionInterna className={className} />
}

function ConsultaPublica({ className }) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5', className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
        <UsersIcon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">Consulta pública</span>
        <span className="truncate text-xs opacity-80">Abierta, sin cuenta</span>
      </span>
    </div>
  )
}

function SesionInterna({ className }) {
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

  const quien = usuario?.nombre || usuario?.usuario || 'Sin sesión'
  const detalle = `Perfil ${nombre}`
  const otroSitio =
    typeof window === 'undefined' ? '/' : urlOtroSitio({ interno: true, ubicacion: window.location, env: import.meta.env })

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
          <UserIcon className="size-3.5" aria-hidden="true" />
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={otroSitio}>
            <GlobeIcon aria-hidden="true" />
            Ir al sitio público
            <ArrowUpRightIcon aria-hidden="true" className="ml-auto text-muted-foreground" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={cerrarSesion} disabled={saliendo}>
          <LogOutIcon aria-hidden="true" />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
