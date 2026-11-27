import { useMemo } from 'react'
import { rankings as pedirRankings } from '@/api/cliente.js'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearEntero, formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { IconoTendencia } from './CambioPosicion.jsx'
import { COLOR_BANCO_A, COLOR_BANCO_B } from './colores.js'
import { Estado } from './Estado.jsx'
import { Selector } from './Selector.jsx'
import { armarComparacionBancos } from './series.js'

// Datos que se comparan de cada banco, en cada ranking y período (GET /api/rankings).
const DATOS = [
  { clave: 'Posicion', titulo: 'Posición', formato: formatearEntero },
  { clave: 'Saldo_Actividad', titulo: 'Saldo', formato: formatearMonto },
  { clave: 'Ponderacion_Pct', titulo: 'Ponderación', formato: formatearPorcentaje },
]

// Dos bancos lado a lado: para cada uno de los 6 rankings, su posición, saldo y ponderación en
// `desde` y en `hasta`. Pide /api/rankings de cada período una sola vez (sin filtrar por ranking
// devuelve los 6); cambiar de banco no vuelve a pedir nada.
export function ComparacionBancos({ desde, hasta, activa, bancos, bancoA, bancoB, alCambiarA, alCambiarB }) {
  const consulta = useConsulta(
    (opciones) => Promise.all([pedirRankings({ periodo: desde }, opciones), pedirRankings({ periodo: hasta }, opciones)]),
    [desde, hasta],
    { activa },
  )

  const nombreDe = (codigo) => bancos.find((b) => b.Codigo_Banco === codigo)?.Banco ?? codigo
  const opciones = (otro) =>
    bancos.map((b) => ({ valor: b.Codigo_Banco, etiqueta: `${b.Codigo_Banco} · ${b.Banco}`, deshabilitada: b.Codigo_Banco === otro }))

  const filas = useMemo(() => {
    if (!consulta.datos || !bancoA || !bancoB) return []
    const [respuestaDesde, respuestaHasta] = consulta.datos
    return armarComparacionBancos(respuestaDesde, respuestaHasta, [bancoA, bancoB])
  }, [consulta.datos, bancoA, bancoB])

  if (bancos.length < 2) {
    return <Vacio titulo="Se necesitan dos bancos" descripcion="El catálogo no trae al menos dos bancos para comparar." />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Selector etiqueta="Banco A" valor={bancoA} alCambiar={alCambiarA} opciones={opciones(bancoB)} />
        <Selector etiqueta="Banco B" valor={bancoB} alCambiar={alCambiarB} opciones={opciones(bancoA)} />
      </div>
      <Estado
        consulta={consulta}
        activa={activa}
        vacio={filas.length === 0}
        descripcionVacio="El API no devolvió rankings para estos períodos."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2}>Ranking</TableHead>
              <TableHead rowSpan={2}>Dato</TableHead>
              <TableHead colSpan={2} className="border-l text-center">
                <NombreBanco color={COLOR_BANCO_A} nombre={nombreDe(bancoA)} />
              </TableHead>
              <TableHead colSpan={2} className="border-l text-center">
                <NombreBanco color={COLOR_BANCO_B} nombre={nombreDe(bancoB)} />
              </TableHead>
            </TableRow>
            <TableRow>
              {[0, 1].map((i) => (
                <PeriodosDelBanco key={i} desde={desde} hasta={hasta} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) =>
              DATOS.map((dato, i) => (
                <TableRow key={`${fila.Ranking}-${dato.clave}`} className={i === 0 ? 'border-t-2' : ''}>
                  {i === 0 && (
                    <TableCell rowSpan={DATOS.length} className="font-medium">
                      {fila.Ranking}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{dato.titulo}</TableCell>
                  {fila.bancos.map((b) => (
                    <CeldasDelBanco key={b.codigo} banco={b} dato={dato} />
                  ))}
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </Estado>
    </div>
  )
}

function NombreBanco({ color, nombre }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {nombre}
    </span>
  )
}

function PeriodosDelBanco({ desde, hasta }) {
  return (
    <>
      <TableHead className="h-8 border-l text-right text-xs font-normal text-muted-foreground">{formatearPeriodo(desde)}</TableHead>
      <TableHead className="h-8 text-right text-xs font-normal text-muted-foreground">{formatearPeriodo(hasta)}</TableHead>
    </>
  )
}

// Las dos celdas (período inicial y final) de un dato. En Posición, un icono dice si el banco
// sube, baja o se mantiene; sin dato, un guion.
function CeldasDelBanco({ banco, dato }) {
  const valor = (periodo) => formatearDato(banco[periodo], dato)
  return (
    <>
      <TableCell className="border-l text-right">{valor('desde')}</TableCell>
      <TableCell className="text-right">
        <span className="inline-flex items-center justify-end gap-1.5">
          {dato.clave === 'Posicion' && <IconoTendencia tendencia={banco.tendencia} />}
          <span className={dato.clave === 'Posicion' ? 'font-semibold' : ''}>{valor('hasta')}</span>
        </span>
      </TableCell>
    </>
  )
}

const formatearDato = (datosDelPeriodo, dato) => (datosDelPeriodo ? dato.formato(datosDelPeriodo[dato.clave]) : '—')
