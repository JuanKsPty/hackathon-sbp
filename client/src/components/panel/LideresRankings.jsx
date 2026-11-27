import { Link } from 'react-router'
import { ArrowRightIcon, CrownIcon } from 'lucide-react'
import { rankings as pedirRankings } from '@/api/cliente.js'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { alPeriodo, formatearMonto, formatearPorcentaje } from '@/lib/formato.js'
import { EstadoBloque } from './EstadoBloque.jsx'

// Líder (posición 1) de cada uno de los 6 rankings del período elegido. Sin `ranking`, GET /api/rankings
// devuelve los 6. Saldos y ponderaciones los calcula el API (R2).
export function LideresRankings() {
  const { periodo } = usePeriodo()
  const consulta = useConsulta((opciones) => pedirRankings({ periodo }, opciones), [periodo], { activa: Boolean(periodo) })

  const lideres = (consulta.datos?.rankings ?? []).map((r) => ({
    ranking: r.Ranking,
    lider: r.bancos?.find((b) => b.Posicion === 1) ?? r.bancos?.[0] ?? null,
  }))

  return (
    <Card data-guia="panel.lideres">
      <CardHeader>
        <CardTitle>Líder de cada ranking</CardTitle>
        <CardDescription>{periodo ? `Primer lugar por saldo ${alPeriodo(periodo)}` : 'Período elegido junto al título'}</CardDescription>
        <CardAction>
          <Link to="/rankings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Ver rankings
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <EstadoBloque
          consulta={consulta}
          filas={4}
          vacio={lideres.length === 0}
          tituloVacio="Sin rankings en este período"
          mensajeVacio="El API no devolvió posiciones para el período elegido."
        >
          <ul className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {lideres.map(({ ranking, lider }) => (
              <li key={ranking} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3">
                <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                  <CrownIcon className="size-3.5 text-destacado" aria-hidden="true" />
                  {ranking}
                </span>
                {lider && lider.Operaciones_Validas !== 0 ? (
                  <>
                    <span className="font-semibold break-words">{lider.Banco}</span>
                    <span className="cifra text-lg font-semibold">{formatearMonto(lider.Saldo_Actividad)}</span>
                    <span className="cifra text-xs text-muted-foreground">
                      Ponderación {formatearPorcentaje(lider.Ponderacion_Pct)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin operaciones válidas en este ranking.</span>
                )}
              </li>
            ))}
          </ul>
        </EstadoBloque>
      </CardContent>
    </Card>
  )
}
