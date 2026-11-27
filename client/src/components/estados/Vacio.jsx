import { InboxIcon } from 'lucide-react'

// Estado vacío: la consulta respondió bien pero no hay nada que mostrar.
export function Vacio({ titulo = 'Sin datos', descripcion, icono: Icono = InboxIcon, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <Icono className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{titulo}</p>
      {descripcion && <p className="max-w-prose text-sm text-muted-foreground">{descripcion}</p>}
      {children}
    </div>
  )
}
