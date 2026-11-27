import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatearEntero, formatearMonto } from '@/lib/formato.js'

// Cuántos préstamos se muestran de entrada en cada lista.
const PRIMEROS = 10

// Evidencia préstamo por préstamo (`evidencia` de GET /api/movimientos/descomposicion?evidencia=true):
// los préstamos nuevos, los que salen y los que continúan, de mayor a menor monto (así llegan del API).
export function EvidenciaPrestamos({ evidencia }) {
  if (!evidencia) return null
  const { Nuevos = [], Salen = [], Continuan = [] } = evidencia
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Préstamos de respaldo</p>
      <Tabs defaultValue="nuevos">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Préstamos de respaldo">
            <TabsTrigger value="nuevos">Nuevos ({formatearEntero(Nuevos.length)})</TabsTrigger>
            <TabsTrigger value="salen">Salen ({formatearEntero(Salen.length)})</TabsTrigger>
            <TabsTrigger value="continuan">Continúan ({formatearEntero(Continuan.length)})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="nuevos">
          <ListaPrestamos filas={Nuevos} columnas={[{ clave: 'Saldo', titulo: 'Saldo que entra' }]} />
        </TabsContent>
        <TabsContent value="salen">
          <ListaPrestamos filas={Salen} columnas={[{ clave: 'Saldo', titulo: 'Saldo que sale' }]} />
        </TabsContent>
        <TabsContent value="continuan">
          <ListaPrestamos
            filas={Continuan}
            columnas={[
              { clave: 'Saldo_anterior', titulo: 'Saldo anterior' },
              { clave: 'Saldo_actual', titulo: 'Saldo actual' },
              { clave: 'Diferencia', titulo: 'Diferencia' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ListaPrestamos({ filas, columnas }) {
  const [todos, setTodos] = useState(false)
  if (filas.length === 0) return <p className="py-4 text-sm text-muted-foreground">No hay préstamos en esta lista.</p>
  const visibles = todos ? filas : filas.slice(0, PRIMEROS)
  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de préstamo</TableHead>
              {columnas.map((c) => (
                <TableHead key={c.clave} className="text-right">
                  {c.titulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((fila) => (
              <TableRow key={fila.Numero_Prestamo}>
                <TableCell className="font-mono text-xs">{fila.Numero_Prestamo}</TableCell>
                {columnas.map((c) => (
                  <TableCell key={c.clave} className="cifra text-right">
                    {formatearMonto(fila[c.clave])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filas.length > PRIMEROS && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setTodos(!todos)}>
          {todos ? `Ver solo los ${PRIMEROS} mayores` : `Ver los ${formatearEntero(filas.length)} préstamos`}
        </Button>
      )}
    </div>
  )
}
