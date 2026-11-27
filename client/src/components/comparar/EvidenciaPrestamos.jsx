import { useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatearEntero, formatearMonto } from '@/lib/formato.js'
import { DetallePrestamo } from './DetallePrestamo.jsx'

// Cuántos préstamos se muestran de entrada en cada lista.
const PRIMEROS = 10

// Evidencia préstamo por préstamo (`evidencia` de GET /api/movimientos/descomposicion?evidencia=true):
// los préstamos nuevos, los que salen y los que continúan, de mayor a menor monto (así llegan del API).
// Cada número abre la ficha del préstamo (DetallePrestamo), con la descarga de su informe; también
// se puede buscar cualquier préstamo por su número.
export function EvidenciaPrestamos({ evidencia }) {
  const [elegido, setElegido] = useState(null)
  if (!evidencia) return null
  const { Nuevos = [], Salen = [], Continuan = [] } = evidencia
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-medium">Préstamos de respaldo</p>
        <BuscarPrestamo alBuscar={setElegido} />
      </div>
      <p className="text-xs text-muted-foreground">Haz clic en un número de préstamo para ver su ficha y descargar su informe.</p>
      <Tabs defaultValue="nuevos">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Préstamos de respaldo">
            <TabsTrigger value="nuevos">Nuevos ({formatearEntero(Nuevos.length)})</TabsTrigger>
            <TabsTrigger value="salen">Salen ({formatearEntero(Salen.length)})</TabsTrigger>
            <TabsTrigger value="continuan">Continúan ({formatearEntero(Continuan.length)})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="nuevos">
          <ListaPrestamos alElegir={setElegido} filas={Nuevos} columnas={[{ clave: 'Saldo', titulo: 'Saldo que entra' }]} />
        </TabsContent>
        <TabsContent value="salen">
          <ListaPrestamos alElegir={setElegido} filas={Salen} columnas={[{ clave: 'Saldo', titulo: 'Saldo que sale' }]} />
        </TabsContent>
        <TabsContent value="continuan">
          <ListaPrestamos
            alElegir={setElegido}
            filas={Continuan}
            columnas={[
              { clave: 'Saldo_anterior', titulo: 'Saldo anterior' },
              { clave: 'Saldo_actual', titulo: 'Saldo actual' },
              { clave: 'Diferencia', titulo: 'Diferencia' },
            ]}
          />
        </TabsContent>
      </Tabs>
      <DetallePrestamo numero={elegido} alCerrar={() => setElegido(null)} />
    </div>
  )
}

// Buscador por Numero_Prestamo: lo usan esta lista y la tarjeta "Buscar préstamo" de Reportes.
export function BuscarPrestamo({ alBuscar }) {
  const [texto, setTexto] = useState('')
  const enviar = (evento) => {
    evento.preventDefault()
    if (texto.trim()) alBuscar(texto.trim())
  }
  return (
    <form onSubmit={enviar} className="flex items-center gap-2" role="search">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Número de préstamo"
        aria-label="Buscar préstamo por número"
        className="h-8 w-48 font-mono text-xs"
      />
      <Button type="submit" variant="outline" size="sm" disabled={!texto.trim()}>
        <SearchIcon aria-hidden="true" />
        Ver ficha
      </Button>
    </form>
  )
}

function ListaPrestamos({ filas, columnas, alElegir }) {
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
                <TableCell className="font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => alElegir(fila.Numero_Prestamo)}
                    className="text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                    title={`Ver la ficha del préstamo ${fila.Numero_Prestamo}`}
                  >
                    {fila.Numero_Prestamo}
                  </button>
                </TableCell>
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
