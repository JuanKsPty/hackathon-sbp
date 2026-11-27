import { Link } from 'react-router'
import { ArrowUpRightIcon, DownloadIcon, LockKeyholeIcon, RadarIcon } from 'lucide-react'
import { urlDescarga } from '@/api/cliente.js'
import { BloqueOscuro, Cifra, Etiqueta, TituloDosTonos } from '@/components/marca'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMonto, formatearPeriodo } from '@/lib/formato.js'
import { contarBancos, urlSitioInterno } from './datosLanding.js'
import { montoCompacto } from './formatoLanding.js'

// Entregables abiertos al público (contracts/exportaciones.md): 2 rankings, 3 subactividades, 4 calidad.
const DESCARGAS = [
  { tipo: 'rankings', nombre: 'Rankings' },
  { tipo: 'subactividades', nombre: 'Subactividades' },
  { tipo: 'calidad', nombre: 'Calidad' },
]

const enlace = 'inline-flex items-center gap-1 text-bloque-muted underline-offset-4 hover:text-bloque-foreground hover:underline'

// Encabezado compacto del dashboard público (#139): período vigente, 3 cifras del corte y enlaces
// chicos a descargas y al sitio interno. Cifras de GET /api/periodos y GET /api/rankings (R2).
export function EncabezadoCorte({ datos }) {
  const { cargando, error } = usePeriodo()
  const { periodo, detallePeriodo: p, rankings } = datos
  const lista = rankings.datos?.rankings
  const interno = urlSitioInterno(typeof window === 'undefined' ? {} : window.location, import.meta.env.VITE_URL_INTERNO)

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
    <BloqueOscuro role="region" aria-labelledby="titulo-landing" className="animate-aparecer p-5 sm:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Etiqueta icono={RadarIcon}>
            {periodo ? `Corte vigente · ${formatearPeriodo(periodo)}` : cargando ? 'Cargando el período…' : 'Sin períodos cargados'}
          </Etiqueta>
          <TituloDosTonos
            como="h1"
            id="titulo-landing"
            className="text-2xl sm:text-4xl"
            fuerte="Dashboard del crédito local"
            suave={p?.Archivo ? `· ${p.Archivo}` : 'por banco y macroactividad'}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-bloque-muted">
            No se pudieron leer los períodos del API. Vuelve a intentarlo en unos segundos.
          </p>
        ) : (
          <div data-guia="panel.indicadores" className="grid gap-3 sm:grid-cols-3">
            {cifras.map((c) => (
              <Cifra key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} detalle={c.detalle} className="min-w-0 p-4" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1 text-bloque-muted">
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
          <a href={interno} className={`${enlace} sm:ml-auto`}>
            <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
            Acceso interno
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </BloqueOscuro>
  )
}
