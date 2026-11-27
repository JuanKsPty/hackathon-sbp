import { CrownIcon } from 'lucide-react'
import { EstadoBloque } from '@/components/panel/EstadoBloque.jsx'
import { Badge } from '@/components/ui/badge'
import { formatearMonto, formatearPeriodo, formatearPorcentaje } from '@/lib/formato.js'
import { lideresDelCorte } from './datosLanding.js'
import { TarjetaGrafico } from './TarjetaGrafico.jsx'

// Líder (posición 1) de cada ranking del corte vigente: banco, saldo y ponderación, de GET /api/rankings (R2).
export function LideresDelCorte({ datos }) {
  const { periodo, rankings } = datos
  const lista = rankings.datos ? lideresDelCorte(rankings.datos.rankings, null) : []

  return (
    <TarjetaGrafico id="titulo-lideres" fuerte="Líder de cada ranking" suave={periodo ? `al ${formatearPeriodo(periodo)}` : undefined}>
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
              </li>
            ))}
          </ul>
        </EstadoBloque>
      </div>
    </TarjetaGrafico>
  )
}
