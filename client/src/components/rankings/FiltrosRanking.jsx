import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Radix Select no admite un valor vacío: "todos" significa sin filtro.
export const TODOS = 'todos'

// Filtros de la página: banco (los 12 del catálogo) y subactividad (las del ranking elegido).
export function FiltrosRanking({ bancos, subactividades, banco, subactividad, alCambiarBanco, alCambiarSubactividad }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Filtro etiqueta="Banco" valor={banco} alCambiar={alCambiarBanco}>
        <SelectItem value={TODOS}>Todos los bancos</SelectItem>
        {bancos.map((b) => (
          <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
            {b.Codigo_Banco} · {b.Banco}
          </SelectItem>
        ))}
      </Filtro>
      <Filtro etiqueta="Subactividad" valor={subactividad} alCambiar={alCambiarSubactividad}>
        <SelectItem value={TODOS}>Todas las subactividades</SelectItem>
        {subactividades.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </Filtro>
    </div>
  )
}

function Filtro({ etiqueta, valor, alCambiar, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} className="min-w-56 text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">{children}</SelectContent>
      </Select>
    </label>
  )
}
