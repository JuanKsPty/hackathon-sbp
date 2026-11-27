import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Radix Select no admite un valor vacío: "todos" significa sin filtro.
export const TODOS = 'todos'

// Filtros de la página (lám. 5): banco (los 12 del catálogo) y subactividad (las del ranking elegido).
// El período va junto al título de la página (PeriodoDePagina), para que haya un solo selector.
export function FiltrosRanking({ bancos, subactividades, banco, subactividad, alCambiarBanco, alCambiarSubactividad }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Filtro etiqueta="Banco" guia="rankings.filtro-banco" valor={banco} alCambiar={alCambiarBanco}>
        <SelectItem value={TODOS}>Todos los bancos</SelectItem>
        {bancos.map((b) => (
          <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
            {b.Codigo_Banco} · {b.Banco}
          </SelectItem>
        ))}
      </Filtro>
      <Filtro etiqueta="Subactividad" guia="rankings.filtro-subactividad" valor={subactividad} alCambiar={alCambiarSubactividad}>
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

// `guia`: identificador data-guia para el agente guía (contracts/guia.md).
function Filtro({ etiqueta, guia, valor, alCambiar, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} data-guia={guia} className="min-w-56 text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">{children}</SelectContent>
      </Select>
    </label>
  )
}
