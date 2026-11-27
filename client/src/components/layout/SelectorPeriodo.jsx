import { useControlGuia } from '@/agente/useControlGuia.js'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearCorte, formatearMes } from '@/lib/formato.js'
import { TODOS_LOS_PERIODOS } from '@/lib/periodos.js'
import { cn } from '@/lib/utils'

// Período de trabajo de toda la app, como mes ("Septiembre 2026"). Las opciones salen de
// GET /api/periodos. La lista va del más reciente al más antiguo, y el último cargado lleva la marca
// "Más reciente". El contexto sigue en orden ascendente (otros componentes usan .at(-1) y el
// anterior): solo se invierte aquí.
// `guia`: identificador data-guia del cursor guía. Va en el selector del encabezado de la página
// (PeriodoDePagina); `guia={null}` si alguna vez se repite en otro lugar.
export function SelectorPeriodo({ className, guia = 'global.selector-periodo', id }) {
  const { periodos, periodo, cambiarPeriodo, cargando, error } = usePeriodo()
  const sinOpciones = periodos.length === 0
  const masReciente = periodos.at(-1)?.Fecha ?? null
  const lista = [...periodos].reverse()

  let marcador = 'Período'
  if (cargando) marcador = 'Cargando…'
  else if (error) marcador = 'Sin períodos'

  return (
    <Select value={periodo ?? undefined} onValueChange={cambiarPeriodo} disabled={cargando || sinOpciones}>
      <SelectTrigger id={id} className={cn('min-w-44', className)} data-guia={guia ?? undefined}>
        {/* Cerrado muestra solo el mes; la fecha de corte y la marca van en la lista. */}
        <SelectValue placeholder={marcador}>{periodo ? formatearMes(periodo) : undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {/* Acumulado de todos los cortes: lo calcula el API con ?periodo=todos. */}
        {!sinOpciones && (
          <SelectItem value={TODOS_LOS_PERIODOS} textValue="Todos los períodos" className="py-1.5">
            <span className="flex flex-col items-start gap-0.5">
              <span>Todos los períodos</span>
              <span className="text-xs text-muted-foreground">
                acumulado de {periodos.length} {periodos.length === 1 ? 'corte' : 'cortes'}
              </span>
            </span>
          </SelectItem>
        )}
        {lista.map((p) => (
          <SelectItem key={p.Fecha} value={p.Fecha} textValue={formatearMes(p.Fecha)} className="py-1.5">
            <span className="flex flex-col items-start gap-0.5">
              <span className="flex items-center gap-2">
                {formatearMes(p.Fecha)}
                {p.Fecha === masReciente && <Badge variant="marca">Más reciente</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">{formatearCorte(p.Fecha)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Acciones de pantalla del agente (#125): elegir el período y deshacerlo. Se registra una sola vez,
// desde AppShell, porque el selector solo está en Panel, Rankings y Calidad y el agente puede
// elegir el período desde cualquier página.
export function useControlPeriodo() {
  const { periodo, cambiarPeriodo } = usePeriodo()
  useControlGuia('global.selector-periodo', {
    elegir: (valor) => cambiarPeriodo(valor),
    actual: () => periodo,
    estado: () => periodo,
    restaurar: (anterior) => anterior && cambiarPeriodo(anterior),
  })
}
