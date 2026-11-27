import { useControlGuia } from '@/agente/useControlGuia.js'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  // Fila que resalta el agente (#125): aparte del filtro de banco (bancoResaltado).
  const [delAgente, setDelAgente] = useState(null)
  const cuerpo = useRef(null)

  const filas = useMemo(() => {
    const copia = [...bancos].sort((a, b) => comparar(a, b, orden.clave))
    return orden.ascendente ? copia : copia.reverse()
  }, [bancos, orden])

  const ordenarPor = (clave) =>
    setOrden((previo) => ({ clave, ascendente: previo.clave === clave ? !previo.ascendente : true }))

  // Acciones de pantalla del agente (#125): ordenar por una columna y deshacerlo.
  useControlGuia('rankings.tabla', {
    ordenar: (columna, sentido) => setOrden({ clave: columna, ascendente: sentido === 'asc' }),
    resaltar: (codigo) => setDelAgente(codigo),
    estado: () => ({ orden, delAgente }),
    restaurar: (anterior) => {
      if (anterior?.orden) setOrden(anterior.orden)
      setDelAgente(anterior?.delAgente ?? null)
    },
  })

  // La fila resaltada por el agente se lleva a la vista.
  useEffect(() => {
    if (!delAgente) return
    cuerpo.current?.querySelector(`[data-fila-banco="${delAgente}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [delAgente])

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
                    data-guia-columna={clave}
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
      <TableBody ref={cuerpo}>
        {filas.map((fila) => (
          <TableRow
            key={fila.Codigo_Banco}
            data-fila-banco={fila.Codigo_Banco}
            data-state={fila.Codigo_Banco === bancoResaltado ? 'selected' : undefined}
            data-resaltada-agente={fila.Codigo_Banco === delAgente ? '' : undefined}
            className={fila.Codigo_Banco === delAgente ? 'bg-sky-400/15 [&_td:nth-child(2)_span:first-child]:underline [&_td:nth-child(2)_span:first-child]:decoration-sky-400 [&_td:nth-child(2)_span:first-child]:decoration-2 [&_td:nth-child(2)_span:first-child]:underline-offset-4' : undefined}
          >
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
