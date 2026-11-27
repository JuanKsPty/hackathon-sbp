import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Selector con etiqueta. `opciones`: [{ valor, etiqueta, deshabilitada? }].
// `guia`: identificador data-guia para el agente guía (contracts/guia.md).
export function Selector({ etiqueta, guia, valor, alCambiar, opciones, className = '' }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-xs text-muted-foreground ${className}`}>
      {etiqueta}
      <Select value={valor ?? ''} onValueChange={alCambiar}>
        <SelectTrigger aria-label={etiqueta} data-guia={guia} className="w-full text-foreground">
          <SelectValue placeholder="Elige una opción" />
        </SelectTrigger>
        <SelectContent position="popper">
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor} disabled={o.deshabilitada}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
