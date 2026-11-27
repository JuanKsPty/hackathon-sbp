import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTema } from '@/contexto/TemaContext.jsx'
import { cn } from '@/lib/utils'

const OPCIONES = [
  { valor: 'claro', nombre: 'Claro', icono: SunIcon },
  { valor: 'oscuro', nombre: 'Oscuro', icono: MoonIcon },
  { valor: 'sistema', nombre: 'Sistema', icono: MonitorIcon },
]

// Tema claro, oscuro o del sistema. Vive en el bloque de perfil al pie del menú lateral, por eso su
// menú abre hacia arriba.
export function SelectorTema({ className }) {
  const { tema, cambiarTema } = useTema()
  const actual = OPCIONES.find((o) => o.valor === tema) ?? OPCIONES[2]
  const Actual = actual.icono

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Tema: ${actual.nombre}. Cambiar tema`} data-guia="global.selector-tema" className={cn(className)}>
          <Actual aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tema} onValueChange={cambiarTema}>
          {OPCIONES.map(({ valor, nombre, icono: Icono }) => (
            <DropdownMenuRadioItem key={valor} value={valor}>
              <Icono aria-hidden="true" />
              {nombre}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
