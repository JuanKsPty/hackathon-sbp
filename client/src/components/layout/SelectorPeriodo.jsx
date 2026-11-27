import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { useControlGuia } from '@/agente/useControlGuia.js'
import { cn } from '@/lib/utils'

// Período de trabajo de toda la app. Las opciones salen de GET /api/periodos.
export function SelectorPeriodo({ className }) {
  const { periodos, periodo, cambiarPeriodo, cargando, error } = usePeriodo()
  const sinOpciones = periodos.length === 0

  // Acciones de pantalla del agente (#125): elegir el período y deshacerlo.
  useControlGuia('global.selector-periodo', {
    elegir: (valor) => cambiarPeriodo(valor),
    actual: () => periodo,
    estado: () => periodo,
    restaurar: (anterior) => anterior && cambiarPeriodo(anterior),
  })

  let marcador = 'Período'
  if (cargando) marcador = 'Cargando…'
  else if (error) marcador = 'Sin períodos'

  return (
    <Select value={periodo ?? undefined} onValueChange={cambiarPeriodo} disabled={cargando || sinOpciones}>
      <SelectTrigger aria-label="Período" className={cn('min-w-36 rounded-full tabular-nums', className)} data-guia="global.selector-periodo">
        <SelectValue placeholder={marcador} />
      </SelectTrigger>
      <SelectContent position="popper">
        {periodos.map((p) => (
          <SelectItem key={p.Fecha} value={p.Fecha}>
            {formatearPeriodo(p.Fecha)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
