import { InfoIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearEntero } from '@/lib/formato.js'
import { MOTIVOS } from './motivos.js'

// Conteos independientes: cuántas filas incumplen cada regla por sí sola.
// Van rotulados aparte porque NO son el reporte oficial (ese es la cascada).
export function ConteosIndependientes({ conteos }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conteos independientes</CardTitle>
        <CardDescription>Filas que incumplen cada regla por sí sola.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>No es el reporte oficial</AlertTitle>
          <AlertDescription>
            Una fila puede contar en varias reglas, así que estos números no suman las filas leídas. El conteo oficial es la
            cascada E1 → E4 de arriba.
          </AlertDescription>
        </Alert>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MOTIVOS.map((m) => (
            <div key={m.codigo} className="flex flex-col gap-1 rounded-lg border border-dashed px-3 py-2">
              <dt className="text-xs text-muted-foreground">
                {m.codigo} · {m.nombre}
              </dt>
              <dd className="cifra text-lg font-semibold">{formatearEntero(conteos?.[m.codigo])}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
