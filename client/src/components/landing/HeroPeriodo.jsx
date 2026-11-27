import { Link } from 'react-router'
import { ArrowRightIcon, ArrowUpRightIcon, RadarIcon } from 'lucide-react'
import { BloqueOscuro, Cifra, Etiqueta, TituloDosTonos } from '@/components/marca'
import { buttonVariants } from '@/components/ui/button'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { contarBancos, contarSignificativos } from './datosLanding.js'
import { montoCompacto, tono, variacionCorta, variacionEntre } from './formatoLanding.js'

// Variación frente al corte anterior para <Cifra>: { tendencia, texto } o null.
function variacionFrente(actual, anterior, fecha) {
  const valor = variacionEntre(actual, anterior)
  const texto = variacionCorta(valor)
  return texto ? { tendencia: tono(valor), texto: `${texto} vs. ${formatearPeriodo(fecha)}` } : null
}

// Bloque oscuro de la landing (#139): qué es Radar SBP, el período vigente y 4 cifras del corte.
// Saldo y operaciones salen de GET /api/periodos; bancos de GET /api/rankings; los movimientos
// significativos, de comparar los rankings con el corte anterior según la regla vigente.
export function HeroPeriodo({ datos }) {
  const { cargando, error } = usePeriodo()
  const { periodo, anterior, detallePeriodo: p, detalleAnterior: a, rankings, movimientos } = datos

  const rankingsPeriodo = rankings.datos?.rankings
  const comparacion = movimientos.datos?.comparacion

  const cifras = [
    {
      etiqueta: 'Cartera local válida',
      valor: montoCompacto(p?.Saldo_Total_Valido),
      detalle: p ? `Saldo total ${formatearMonto(p.Saldo_Total_Valido)}` : null,
      variacion: anterior ? variacionFrente(p?.Saldo_Total_Valido, a?.Saldo_Total_Valido, anterior) : null,
    },
    {
      etiqueta: 'Operaciones válidas',
      valor: formatearEntero(p?.Universo_Local_Valido),
      detalle: p ? `de ${formatearEntero(p.Filas_Leidas)} filas leídas` : null,
      variacion: anterior ? variacionFrente(p?.Universo_Local_Valido, a?.Universo_Local_Valido, anterior) : null,
    },
    {
      etiqueta: 'Bancos',
      valor: rankingsPeriodo ? formatearEntero(contarBancos(rankingsPeriodo)) : '—',
      detalle: rankingsPeriodo
        ? `en ${formatearEntero(rankingsPeriodo.length)} ${rankingsPeriodo.length === 1 ? 'ranking' : 'rankings'} de crédito`
        : null,
    },
    {
      etiqueta: 'Movimientos significativos',
      valor: anterior && comparacion ? formatearEntero(contarSignificativos(comparacion)) : '—',
      detalle: anterior ? `frente al corte del ${formatearPeriodo(anterior)}` : periodo ? 'Primer corte cargado: no hay con qué comparar' : null,
    },
  ]

  return (
    <BloqueOscuro className="animate-aparecer" aria-labelledby="titulo-landing" role="region">
      <div className="flex flex-col gap-6">
        <Etiqueta icono={RadarIcon}>
          {periodo ? `Corte vigente · ${formatearPeriodo(periodo)}` : cargando ? 'Cargando el período…' : 'Sin períodos cargados'}
        </Etiqueta>

        <TituloDosTonos
          como="h1"
          id="titulo-landing"
          className="max-w-3xl leading-[1.08]"
          fuerte="Radar SBP ordena el crédito local de cada banco."
          suave="Seis rankings por saldo, con la calidad de los datos a la vista."
        />

        <p className="max-w-2xl text-sm text-bloque-muted sm:text-base">
          Cada corte mensual del AT03 se valida, se depura y se compara con el anterior.
          {p?.Archivo ? ` Archivo del corte: ${p.Archivo}.` : ''}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link to="/rankings" className={buttonVariants({ variant: 'claro', size: 'pildora' })}>
            Ver rankings
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
          <Link to="/reportes" className={buttonVariants({ variant: 'borde-claro', size: 'pildora' })}>
            Reportes y descargas
            <ArrowUpRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-bloque-muted">
            No se pudieron leer los períodos del API. Vuelve a intentarlo en unos segundos.
          </p>
        ) : (
          <div data-guia="panel.indicadores" className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cifras.map((c, i) => (
              <Cifra
                key={c.etiqueta}
                etiqueta={c.etiqueta}
                valor={c.valor}
                detalle={c.detalle}
                variacion={c.variacion}
                style={{ animationDelay: `${120 + i * 60}ms` }}
                className="min-w-0 animate-aparecer"
              />
            ))}
          </div>
        )}
      </div>
    </BloqueOscuro>
  )
}
