import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearMonto } from '@/lib/formato.js'

// Desglose por subactividad (entregable 3): una fila por banco, en el orden del ranking, y una
// columna por subactividad. La columna Total es el Saldo_Actividad de /api/rankings, que por la
// reconciliación 1 es igual a la suma de sus subactividades (el front no recalcula nada).
export function DesgloseSubactividades({ filas, subactividades, bancos, bancoResaltado }) {
  const saldo = new Map(filas.map((f) => [`${f.Codigo_Banco}|${f.Subactividad}`, f.Saldo]))
  const ordenados = [...bancos].sort((a, b) => a.Posicion - b.Posicion)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Banco</TableHead>
          {subactividades.map((s) => (
            <TableHead key={s} className="text-right">
              {s}
            </TableHead>
          ))}
          <TableHead className="text-right">Total de la actividad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenados.map((b) => (
          <TableRow key={b.Codigo_Banco} data-state={b.Codigo_Banco === bancoResaltado ? 'selected' : undefined}>
            <TableCell>
              <span className="text-muted-foreground">{b.Posicion}.</span> <span className="font-medium">{b.Banco}</span>
            </TableCell>
            {subactividades.map((s) => (
              <TableCell key={s} className="text-right">
                {formatearMonto(saldo.get(`${b.Codigo_Banco}|${s}`))}
              </TableCell>
            ))}
            <TableCell className="text-right font-semibold">{formatearMonto(b.Saldo_Actividad)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
