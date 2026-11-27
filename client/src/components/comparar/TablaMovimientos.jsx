import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, StarIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearEntero, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'
import { CambioPosicion } from './CambioPosicion.jsx'
import { alternarOrden, COLUMNAS_MOVIMIENTOS, nombreDeMotivo, ordenarMovimientos, ORDEN_INICIAL, tendenciaDeCambio } from './movimientos.js'

const claseDeSigno = (valor) => (valor > 0 ? 'text-sube' : valor < 0 ? 'text-baja' : 'text-igual')
const conSigno = (valor, formato) => (typeof valor === 'number' && valor > 0 ? `+${formato(valor)}` : formato(valor))

// Columnas numéricas y de estado: alineadas a la derecha (las demás, a la izquierda).
const ALINEADAS_A_LA_DERECHA = new Set(['Posicion_anterior', 'Posicion_actual', 'Var_Saldo', 'Var_Saldo_Pct'])

// Tabla ordenable de movimientos entre dos períodos (GET /api/movimientos). Un clic en el
// encabezado ordena; un clic en una fila elige ese banco (vuelve a hacer clic para soltarlo).
// Los valores llegan calculados por el API: aquí solo se ordenan y se les da formato.
export function TablaMovimientos({ movimientos, bancoElegido, alElegirBanco }) {
  const [orden, setOrden] = useState(ORDEN_INICIAL)
  const filas = useMemo(() => ordenarMovimientos(movimientos, orden), [movimientos, orden])

  return (
    <Table data-guia="comparar.tabla-movimientos">
      <TableHeader>
        <TableRow>
          {COLUMNAS_MOVIMIENTOS.map(({ clave, titulo }) => {
            const activa = orden.clave === clave
            const Icono = !activa ? ArrowUpDownIcon : orden.ascendente ? ArrowUpIcon : ArrowDownIcon
            return (
              <TableHead
                key={clave}
                aria-sort={activa ? (orden.ascendente ? 'ascending' : 'descending') : 'none'}
                className={ALINEADAS_A_LA_DERECHA.has(clave) ? 'text-right' : ''}
              >
                <button
                  type="button"
                  onClick={() => setOrden((previo) => alternarOrden(previo, clave))}
                  className="inline-flex items-center gap-1 rounded-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {titulo}
                  <Icono className={`size-3.5 ${activa ? '' : 'text-muted-foreground'}`} aria-hidden="true" />
                </button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => {
          const elegido = fila.Codigo_Banco === bancoElegido
          return (
            <TableRow
              key={fila.Codigo_Banco}
              data-state={elegido ? 'selected' : undefined}
              onClick={() => alElegirBanco(elegido ? null : fila.Codigo_Banco)}
              className="cursor-pointer"
            >
              <TableCell>
                <button
                  type="button"
                  aria-pressed={elegido}
                  title="Ver por qué cambió su saldo"
                  className="rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="font-medium">{fila.Banco}</span>{' '}
                  <span className="text-xs text-muted-foreground">{fila.Codigo_Banco}</span>
                </button>
              </TableCell>
              <TableCell className="text-right">{formatearEntero(fila.Posicion_anterior)}</TableCell>
              <TableCell className="text-right font-semibold">{formatearEntero(fila.Posicion_actual)}</TableCell>
              <TableCell>
                <CambioPosicion tendencia={tendenciaDeCambio(fila.Cambio_Posicion)} cantidad={fila.Cambio_Posicion} />
              </TableCell>
              <TableCell className={`text-right ${claseDeSigno(fila.Var_Saldo)}`}>{conSigno(fila.Var_Saldo, formatearMonto)}</TableCell>
              <TableCell className={`text-right ${claseDeSigno(fila.Var_Saldo_Pct)}`}>
                {conSigno(fila.Var_Saldo_Pct, formatearPorcentaje)}
              </TableCell>
              <TableCell>
                {fila.Significativo ? (
                  <Badge className="bg-destacado-fondo text-destacado">
                    <StarIcon aria-hidden="true" />
                    Sí
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </TableCell>
              <TableCell>
                {fila.Motivos?.length > 0 ? (
                  <span className="flex gap-1">
                    {fila.Motivos.map((motivo) => (
                      <Badge key={motivo} variant="outline">
                        {nombreDeMotivo(motivo)}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
