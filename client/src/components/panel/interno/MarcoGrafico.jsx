import { Cargando } from '@/components/estados/Cargando.jsx'
import { PlaceholderGrafico } from '@/components/estados/PlaceholderGrafico.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Tarjeta de un gráfico del panel interno: título, una línea de contexto y el gráfico.
// `consulta` (opcional) cubre la carga y el error; `vacio` muestra un aviso si no hay datos.
// `alto` (px): alto del gráfico, para que la carga ocupe lo mismo y la tarjeta no cambie de tamaño.
export function MarcoGrafico({ titulo, descripcion, accion, consulta, vacio, mensajeVacio, alto, children, className, ...props }) {
  let cuerpo = children
  if (consulta?.error) cuerpo = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (consulta && !consulta.datos) cuerpo = alto ? <PlaceholderGrafico alto={alto} /> : <Cargando filas={4} />
  else if (vacio) cuerpo = <Vacio titulo="Sin datos para graficar" descripcion={mensajeVacio} />

  return (
    <Card className={cn('min-w-0', className)} {...props}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {descripcion && <CardDescription>{descripcion}</CardDescription>}
        {accion && <CardAction>{accion}</CardAction>}
      </CardHeader>
      <CardContent>{cuerpo}</CardContent>
    </Card>
  )
}

// Globo de los gráficos: título y una fila por serie, con su color.
export function GloboGrafico({ active, payload, label, titulo, formatear }) {
  if (!active || !payload?.length) return null
  return (
    <div className="grid min-w-44 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium">{titulo ? titulo(label, payload) : label}</span>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <span key={p.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? p.payload?.fill }} aria-hidden="true" />
              {p.name}
            </span>
            <span className="cifra font-medium">{formatear ? formatear(p.value, p) : p.value}</span>
          </span>
        ))}
    </div>
  )
}
