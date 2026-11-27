import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBancoPanel } from '@/contexto/BancoPanelContext.jsx'
import { cn } from '@/lib/utils'
import { PeriodoDePagina } from './PeriodoDePagina.jsx'

// Radix Select no admite un valor vacío: "todos" significa sin filtro de banco.
const TODOS = 'todos'

// Filtros de los Paneles (#204): el período de los datos y, a su lado, el banco. Fuera de un Panel
// (sin BancoPanelProvider) muestra solo el período.
export function FiltrosDelPanel() {
  const { disponible } = useBancoPanel()
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <PeriodoDePagina />
      {disponible && (
        <div className="flex flex-col gap-1">
          <label htmlFor="banco-del-panel" className="text-xs font-medium text-muted-foreground">
            Banco
          </label>
          <SelectorBanco id="banco-del-panel" className="w-full sm:w-auto" />
        </div>
      )}
    </div>
  )
}

// "Todos los bancos" o uno de los 12 del catálogo. Lo elegido queda en la URL (?banco=).
export function SelectorBanco({ id, className }) {
  const { banco, bancos, cambiarBanco } = useBancoPanel()
  return (
    <Select value={banco ?? TODOS} onValueChange={(valor) => cambiarBanco(valor === TODOS ? null : valor)} disabled={bancos.length === 0}>
      <SelectTrigger id={id} aria-label="Banco" data-guia="panel.selector-banco" className={cn('min-w-48', className)}>
        <SelectValue placeholder="Todos los bancos" />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value={TODOS}>Todos los bancos</SelectItem>
        {bancos.map((b) => (
          <SelectItem key={b.Codigo_Banco} value={b.Codigo_Banco}>
            {b.Codigo_Banco} · {b.Banco}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
