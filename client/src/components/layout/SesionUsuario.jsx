import { useState } from 'react'
import { ChevronDownIcon, LogOutIcon, UserIcon } from 'lucide-react'
import { salir } from '@/api/sesion.js'
import { Button } from '@/components/ui/button'
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

// Usuario de la sesión y botón Salir (solo sitio interno). Reemplaza al selector de perfil: el
// perfil ya no se elige, sale de la cuenta con la que se entró (sección 10, entregable 8).
// Lleva data-guia="global.selector-perfil" para el cursor guía (contracts/guia.md).
//   variante="menu":  botón con menú desplegable, para el encabezado.
//   variante="lista": nombre, perfil y Salir a la vista, para el menú móvil (Sheet).
export function SesionUsuario({ variante = 'menu', className }) {
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

  if (variante === 'lista') {
    return (
      <div data-guia="global.selector-perfil" className={cn('flex flex-col gap-2 rounded-tarjeta border border-sidebar-border p-3 text-sm', className)}>
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{quien}</span>
          <span className="text-xs">Perfil {nombre}</span>
        </span>
        <Button variant="outline" size="sm" onClick={cerrarSesion} disabled={saliendo}>
          <LogOutIcon aria-hidden="true" />
          Salir
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`${quien}, perfil ${nombre}. Abrir menú de la sesión`} data-guia="global.selector-perfil" className={className}>
          <UserIcon aria-hidden="true" />
          <span className="max-w-24 truncate xl:max-w-32">{quien}</span>
          <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{quien}</span>
          <span className="text-xs font-normal text-muted-foreground">Perfil {nombre}. {DESCRIPCIONES_PERFIL[perfil]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={cerrarSesion} disabled={saliendo}>
          <LogOutIcon aria-hidden="true" />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
