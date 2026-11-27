import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from 'lucide-react'
import { AyudaTermino } from '@/components/glosario/AyudaTermino.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearEntero, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'

// Columnas del entregable 2. Los valores llegan calculados por el API: aquí solo se ordenan y formatean.
// `ayuda`: término del glosario que explica la columna al perfil Público (#129).
const COLUMNAS = [
  { clave: 'Posicion', titulo: 'Posición', formato: formatearEntero, ayuda: 'posicion' },
  { clave: 'Banco', titulo: 'Banco' },
  { clave: 'Saldo_Actividad', titulo: 'Saldo de la actividad', formato: formatearMonto, ayuda: 'saldo_actividad' },
  { clave: 'Total_Cartera_Local_Valida', titulo: 'Total cartera válida', formato: formatearMonto, ayuda: 'total_cartera' },
  { clave: 'Ponderacion_Pct', titulo: 'Ponderación', formato: formatearPorcentaje, ayuda: 'ponderacion' },
  { clave: 'Operaciones_Validas', titulo: 'Operaciones', formato: formatearEntero, ayuda: 'operaciones' },
]

function comparar(a, b, clave) {
  const x = a[clave]
  const y = b[clave]
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), 'es')
}

// Tabla ordenable: un clic en el encabezado ordena por esa columna; otro clic invierte el orden.
export function TablaRanking({ bancos, bancoResaltado }) {
  const [orden, setOrden] = useState({ clave: 'Posicion', ascendente: true })

  const filas = useMemo(() => {
    const copia = [...bancos].sort((a, b) => comparar(a, b, orden.clave))
    return orden.ascendente ? copia : copia.reverse()
  }, [bancos, orden])

  const ordenarPor = (clave) =>
    setOrden((previo) => ({ clave, ascendente: previo.clave === clave ? !previo.ascendente : true }))

  return (
    <Table data-guia="rankings.tabla">
      <TableHeader>
        <TableRow>
          {COLUMNAS.map(({ clave, titulo, ayuda }) => {
            const activa = orden.clave === clave
            const Icono = !activa ? ArrowUpDownIcon : orden.ascendente ? ArrowUpIcon : ArrowDownIcon
            return (
              <TableHead
                key={clave}
                aria-sort={activa ? (orden.ascendente ? 'ascending' : 'descending') : 'none'}
                className={clave === 'Banco' ? '' : 'text-right'}
              >
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => ordenarPor(clave)}
                    className="inline-flex items-center gap-1 rounded-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {titulo}
                    <Icono className={`size-3.5 ${activa ? '' : 'text-muted-foreground'}`} aria-hidden="true" />
                  </button>
                  {ayuda && <AyudaTermino clave={ayuda} />}
                </span>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <TableRow key={fila.Codigo_Banco} data-state={fila.Codigo_Banco === bancoResaltado ? 'selected' : undefined}>
            {COLUMNAS.map(({ clave, formato }) =>
              clave === 'Banco' ? (
                <TableCell key={clave}>
                  <span className="font-medium">{fila.Banco}</span>{' '}
                  <span className="text-xs text-muted-foreground">{fila.Codigo_Banco}</span>
                </TableCell>
              ) : (
                <TableCell key={clave} className={`text-right ${clave === 'Posicion' ? 'font-semibold' : ''}`}>
                  {formato(fila[clave])}
                </TableCell>
              ),
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
