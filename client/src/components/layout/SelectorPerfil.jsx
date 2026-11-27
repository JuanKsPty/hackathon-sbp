import { CheckIcon, ChevronDownIcon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DESCRIPCIONES_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { cn } from '@/lib/utils'

// Selector de perfil (Público, Analista, Administrador), con una línea que dice qué puede hacer cada uno.
// Basta un selector, sin contraseñas (sección 10, entregable 8). El menú y las páginas cambian con
// las opciones de GET /api/perfil; el backend responde 403 a lo que el perfil no puede usar.
//
// Cada variante lleva data-guia="global.selector-perfil". El layout monta una sola a la vez en
// pantalla (la desplegable desde 640 px, la lista en el menú móvil): el contrato exige un
// identificador visible por elemento (contracts/guia.md).
//   variante="menu":  botón con menú desplegable, para el encabezado.
//   variante="lista": las tres opciones a la vista, para el menú móvil (Sheet).
export function SelectorPerfil({ variante = 'menu', className }) {
  return variante === 'lista' ? <ListaPerfiles className={className} /> : <MenuPerfiles className={className} />
}

function MenuPerfiles({ className }) {
  const { perfil, nombre, perfiles, cambiarPerfil } = usePerfil()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Perfil: ${nombre}. Cambiar de perfil`}
          data-guia="global.selector-perfil"
          className={className}
        >
          <UserIcon aria-hidden="true" />
          <span>{nombre}</span>
          <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Perfil</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={perfil} onValueChange={cambiarPerfil}>
          {perfiles.map((p) => (
            <DropdownMenuRadioItem key={p.perfil} value={p.perfil} className="items-start py-1.5">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">{DESCRIPCIONES_PERFIL[p.perfil]}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Casillas nativas (radio) escondidas: dan el teclado y el lector de pantalla sin código extra.
function ListaPerfiles({ className }) {
  const { perfil, perfiles, cambiarPerfil } = usePerfil()

  return (
    <div data-guia="global.selector-perfil" role="radiogroup" aria-labelledby="selector-perfil-titulo" className={cn('flex flex-col gap-1.5', className)}>
      <p id="selector-perfil-titulo" className="px-2 text-xs font-medium">
        Perfil
      </p>
      {perfiles.map((p) => (
        <label
          key={p.perfil}
          className={cn(
            'flex cursor-pointer items-start gap-2 rounded-md border border-sidebar-border px-2 py-2 text-sm transition-colors',
            'hover:bg-sidebar-accent has-focus-visible:ring-2 has-focus-visible:ring-sidebar-ring',
            p.perfil === perfil && 'border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground',
          )}
        >
          <input
            type="radio"
            name="perfil-menu"
            value={p.perfil}
            checked={p.perfil === perfil}
            onChange={() => cambiarPerfil(p.perfil)}
            className="sr-only"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">{p.nombre}</span>
            <span className="text-xs">{DESCRIPCIONES_PERFIL[p.perfil]}</span>
          </span>
          {p.perfil === perfil && <CheckIcon className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden="true" />}
        </label>
      ))}
    </div>
  )
}
