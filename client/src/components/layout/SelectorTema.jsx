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

const OPCIONES = [
  { valor: 'claro', nombre: 'Claro', icono: SunIcon },
  { valor: 'oscuro', nombre: 'Oscuro', icono: MoonIcon },
  { valor: 'sistema', nombre: 'Sistema', icono: MonitorIcon },
]

export function SelectorTema() {
  const { tema, cambiarTema } = useTema()
  const Actual = OPCIONES.find((o) => o.valor === tema)?.icono ?? MonitorIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Actual aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
