import { useControlGuia } from '@/agente/useControlGuia.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'

// Período de trabajo de toda la app. Las opciones salen de GET /api/periodos.
// `guia`: identificador data-guia del cursor guía. El selector del menú lateral lleva el global; si
// una página repite el selector junto a sus filtros, pasa `guia={null}` para no duplicarlo.
export function SelectorPeriodo({ className, guia = 'global.selector-periodo', id }) {
  const { periodos, periodo, cambiarPeriodo, cargando, error } = usePeriodo()
  const sinOpciones = periodos.length === 0

  let marcador = 'Período'
  if (cargando) marcador = 'Cargando…'
  else if (error) marcador = 'Sin períodos'

  return (
    <Select value={periodo ?? undefined} onValueChange={cambiarPeriodo} disabled={cargando || sinOpciones}>
      <SelectTrigger id={id} aria-label="Período de los datos" className={cn('min-w-36', className)} data-guia={guia ?? undefined}>
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

// Acciones de pantalla del agente (#125): elegir el período y deshacerlo. Se registra una sola vez,
// desde AppShell, porque el selector puede no estar montado (en el celular el menú lateral solo
// existe mientras está abierto) o estar repetido (filtros de Rankings).
export function useControlPeriodo() {
  const { periodo, cambiarPeriodo } = usePeriodo()
  useControlGuia('global.selector-periodo', {
    elegir: (valor) => cambiarPeriodo(valor),
    actual: () => periodo,
    estado: () => periodo,
    restaurar: (anterior) => anterior && cambiarPeriodo(anterior),
  })
}
