import { Link } from 'react-router'
import { DownloadIcon, RadarIcon } from 'lucide-react'
import { urlDescarga } from '@/api/cliente.js'
import { PeriodoDePagina } from '@/components/layout/PeriodoDePagina.jsx'
import { Cifra, Etiqueta, TituloDosTonos } from '@/components/marca'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { contarBancos } from './datosLanding.js'
import { montoCompacto } from './formatoLanding.js'

// Entregables abiertos al público (contracts/exportaciones.md): 2 rankings, 3 subactividades, 4 calidad.
const DESCARGAS = [
  { tipo: 'rankings', nombre: 'Rankings' },
  { tipo: 'subactividades', nombre: 'Subactividades' },
  { tipo: 'calidad', nombre: 'Calidad' },
]

const enlace = 'inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline'

// Encabezado del dashboard público (#139): título con el selector de período, 3 cifras del corte y,
// abajo, enlaces chicos a las descargas con el corte vigente a la derecha. Cifras de GET /api/periodos y GET /api/rankings (R2). Va debajo de
// la portada del Inicio, por eso es una sección clara con h2 y no otro bloque oscuro.
export function EncabezadoCorte({ datos }) {
  const { cargando, error } = usePeriodo()
  const { periodo, detallePeriodo: p, rankings } = datos
  const lista = rankings.datos?.rankings

  const cifras = [
    { etiqueta: 'Cartera local válida', valor: montoCompacto(p?.Saldo_Total_Valido), detalle: p ? `Saldo ${formatearMonto(p.Saldo_Total_Valido)}` : null },
    { etiqueta: 'Operaciones válidas', valor: formatearEntero(p?.Universo_Local_Valido), detalle: p ? `de ${formatearEntero(p.Filas_Leidas)} filas leídas` : null },
    {
      etiqueta: 'Bancos',
      valor: lista ? formatearEntero(contarBancos(lista)) : '—',
      detalle: lista ? `en ${formatearEntero(lista.length)} ${lista.length === 1 ? 'ranking' : 'rankings'} de crédito` : null,
    },
  ]

  return (
    <div role="region" aria-labelledby="titulo-landing" className="rounded-seccion border bg-card p-5 text-card-foreground sm:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <TituloDosTonos
            como="h2"
            id="titulo-landing"
            fuerte="El crédito local en cifras"
            suave="por banco y macroactividad"
          />
          <PeriodoDePagina />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-muted-foreground">
            No se pudieron leer los períodos del API. Vuelve a intentarlo en unos segundos.
          </p>
        ) : (
          <div data-guia="panel.indicadores" className="grid gap-3 sm:grid-cols-3">
            {cifras.map((c) => (
              <Cifra key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} detalle={c.detalle} className="min-w-0 p-4" />
            ))}
          </div>
        )}

        {/* Abajo: enlaces a los CSV a la izquierda y el corte vigente a la derecha. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <DownloadIcon className="size-3.5" aria-hidden="true" />
              CSV del corte:
            </span>
            {DESCARGAS.map(({ tipo, nombre }) => (
              <a key={tipo} href={urlDescarga(tipo, { periodo })} download className={enlace}>
                {nombre}
              </a>
            ))}
            <Link to="/reportes" className={enlace}>
              Todos los reportes
            </Link>
          </div>
          <Etiqueta icono={RadarIcon}>
            {periodo ? `Corte vigente · ${formatearPeriodo(periodo)}` : cargando ? 'Cargando el período…' : 'Sin períodos cargados'}
          </Etiqueta>
        </div>
      </div>
    </div>
  )
}
