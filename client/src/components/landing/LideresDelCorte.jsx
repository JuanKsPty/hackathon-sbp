import { CrownIcon } from 'lucide-react'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Badge } from '@/components/ui/badge'
import { alPeriodo, formatearEntero, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'
import { lideresDelCorte } from './datosLanding.js'
import { TarjetaGrafico } from './TarjetaGrafico.jsx'

// Líder (posición 1) de cada ranking del corte vigente: banco, saldo y ponderación, de GET /api/rankings (R2).
// Con un banco elegido (#204), cada ranking muestra además el puesto, saldo y participación de ese banco
// (bloque `banco` de GET /api/productos).
export function LideresDelCorte({ datos }) {
  const { periodo, rankings, nombreBanco } = datos
  const lista = rankings.datos ? lideresDelCorte(rankings.datos.rankings) : []
  const delBanco = nombreBanco ? (datos.productos?.datos?.banco?.rankings ?? []) : []

  return (
    <TarjetaGrafico id="titulo-lideres" fuerte="Líder de cada ranking" suave={periodo ? alPeriodo(periodo) : undefined}>
      <div data-guia="panel.lideres">
        <EstadoBloque
          consulta={rankings}
          filas={4}
          vacio={lista.length === 0}
          tituloVacio="Sin rankings en este período"
          mensajeVacio="El API no devolvió posiciones para el período elegido."
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map(({ ranking, lider }) => (
              <li key={ranking} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted p-3">
                <Badge variant="marca" className="w-fit">
                  <CrownIcon aria-hidden="true" />
                  {ranking}
                </Badge>
                {lider && lider.Operaciones_Validas !== 0 ? (
                  <>
                    <span className="font-medium break-words">{lider.Banco}</span>
                    <span className="cifra text-lg font-medium tracking-tight">{formatearMonto(lider.Saldo_Actividad)}</span>
                    <span className="cifra text-xs text-muted-foreground">Ponderación {formatearPorcentaje(lider.Ponderacion_Pct)}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin operaciones válidas en este ranking.</span>
                )}
                <PuestoDelBanco nombre={nombreBanco} fila={delBanco.find((r) => r.Ranking === ranking)} />
              </li>
            ))}
          </ul>
        </EstadoBloque>
      </div>
    </TarjetaGrafico>
  )
}

// Puesto del banco elegido en el ranking, debajo del líder. Si el banco es el líder, lo dice.
function PuestoDelBanco({ nombre, fila }) {
  if (!nombre || !fila) return null
  return (
    <span className="mt-1 border-t border-border/60 pt-1.5 text-xs">
      <span className="font-medium">{fila.Posicion === 1 ? `${nombre} es el líder` : `${nombre}: puesto ${formatearEntero(fila.Posicion)}`}</span>
      <span className="cifra text-muted-foreground">
        {' '}· {formatearMonto(fila.Saldo_Actividad)} · {formatearPorcentaje(fila.Participacion_Pct)} del ranking
      </span>
    </span>
  )
}
