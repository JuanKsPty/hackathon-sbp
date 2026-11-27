import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'

// Resumen del período elegido. Todas las cifras salen de GET /api/periodos (R2).
export function ResumenPeriodo() {
  const { detallePeriodo, cargando, error, reintentar } = usePeriodo()

  let contenido
  if (cargando) contenido = <Cargando filas={3} />
  else if (error) contenido = <ErrorApi error={error} alReintentar={reintentar} />
  else if (!detallePeriodo)
    contenido = <Vacio titulo="No hay períodos cargados" descripcion="Cuando el API cargue un archivo AT03 aparecerá aquí su resumen." />
  else {
    const p = detallePeriodo
    const cifras = [
      { nombre: 'Filas leídas', valor: formatearEntero(p.Filas_Leidas) },
      { nombre: 'Universo local válido', valor: formatearEntero(p.Universo_Local_Valido) },
      { nombre: 'Saldo total válido', valor: formatearMonto(p.Saldo_Total_Valido) },
    ]
    contenido = (
      <dl className="grid gap-4 sm:grid-cols-3">
        {cifras.map(({ nombre, valor }) => (
          <div key={nombre} className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">{nombre}</dt>
            <dd className="cifra text-xl font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
    )
  }

  const reconciliado = detallePeriodo?.Reconciliaciones_OK

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del período</CardTitle>
        <CardDescription>
          {detallePeriodo
            ? `${formatearPeriodo(detallePeriodo.Fecha)} · ${detallePeriodo.Archivo}`
            : 'Período seleccionado en el encabezado'}
        </CardDescription>
        {detallePeriodo && typeof reconciliado === 'boolean' && (
          <CardAction>
            {reconciliado ? (
              <Badge className="bg-sube-fondo text-sube">
                <CheckCircle2Icon aria-hidden="true" />
                Reconciliaciones OK
              </Badge>
            ) : (
              <Badge className="bg-baja-fondo text-baja">
                <TriangleAlertIcon aria-hidden="true" />
                Hay descuadres
              </Badge>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}
