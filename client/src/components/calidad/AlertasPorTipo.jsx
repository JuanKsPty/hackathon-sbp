import { DownloadIcon } from 'lucide-react'
import { urlDescarga } from '@/api/cliente.js'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearEntero } from '@/lib/formato.js'

// Tipos de alerta del reporte de calidad. Una alerta NO excluye la fila (sección 7).
const TIPOS = [
  { campo: 'Banco_Fuera_Catalogo', nombre: 'Banco fuera de catálogo' },
  { campo: 'Facilidad_Fuera_Catalogo', nombre: 'Facilidad fuera de catálogo' },
  { campo: 'Incoherencia_Consumo', nombre: 'Incoherencia de CONSUMO (Tarjeta sin 07 o Automóvil sin 03)' },
  { campo: 'Tipo_Dato', nombre: 'Tipo de dato inválido' },
]

// Alertas del período: conteo por tipo y, si hay, las primeras filas con su detalle.
export function AlertasPorTipo({ calidad }) {
  const { Alertas, Alertas_Total, alertas, Fecha } = calidad

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de calidad</CardTitle>
        <CardDescription>Se reportan, pero no excluyen la fila del cálculo.</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <a href={urlDescarga('alertas', { periodo: Fecha })} download>
              <DownloadIcon aria-hidden="true" />
              CSV
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 sm:grid-cols-2" data-guia="calidad.alertas">
          {TIPOS.map((t) => (
            <div key={t.campo} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <dt className="text-sm">{t.nombre}</dt>
              <dd className="cifra font-semibold">{formatearEntero(Alertas[t.campo])}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Total de alertas: <span className="cifra font-medium text-foreground">{formatearEntero(Alertas_Total)}</span>
          {alertas.length < Alertas_Total && ` (se muestran las primeras ${formatearEntero(alertas.length)})`}
        </p>
        {alertas.length > 0 && <TablaDeAlertas alertas={alertas} />}
      </CardContent>
    </Card>
  )
}

function TablaDeAlertas({ alertas }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">Fila</TableHead>
            <TableHead>Préstamo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertas.map((a, i) => (
            <TableRow key={`${a.Fila_Archivo}-${a.Tipo}-${i}`}>
              <TableCell className="cifra text-right">{formatearEntero(a.Fila_Archivo)}</TableCell>
              <TableCell className="font-mono text-xs">{a.Numero_Prestamo ?? '—'}</TableCell>
              <TableCell className="text-xs">{a.Tipo}</TableCell>
              <TableCell className="text-xs whitespace-normal">{a.Detalle}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
