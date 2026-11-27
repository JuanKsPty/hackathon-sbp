import { ArrowUpRightIcon, CheckCircle2Icon, CircleAlertIcon, DatabaseIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { formatearPeriodo } from '@/lib/formato.js'

// Herramientas del agente (server/src/ai/herramientas.js): nombre legible y vista de la app
// donde el usuario puede ver los mismos datos.
const HERRAMIENTAS = {
  listar_periodos: { nombre: 'Períodos cargados', vista: '/' },
  consultar_catalogos: { nombre: 'Catálogos', vista: null },
  consultar_rankings: { nombre: 'Rankings', vista: '/rankings' },
  consultar_subactividades: { nombre: 'Subactividades', vista: '/rankings' },
  consultar_calidad: { nombre: 'Calidad de datos', vista: '/calidad' },
  consultar_excluidas: { nombre: 'Filas excluidas', vista: '/calidad' },
  consultar_movimientos: { nombre: 'Movimientos entre períodos', vista: '/comparar' },
}

// Si llega una herramienta nueva, la vista se deduce de la ruta del API.
const VISTA_POR_RUTA = {
  '/periodos': '/',
  '/rankings': '/rankings',
  '/subactividades': '/rankings',
  '/calidad': '/calidad',
  '/excluidas': '/calidad',
  '/movimientos': '/comparar',
}

const PARAMETROS_FECHA = new Set(['periodo', 'desde', 'hasta'])

function describir(consulta) {
  const conocida = HERRAMIENTAS[consulta.herramienta]
  const base = String(consulta.ruta ?? '').split('?')[0]
  return {
    nombre: conocida?.nombre ?? consulta.herramienta ?? 'Consulta',
    vista: conocida ? conocida.vista : (VISTA_POR_RUTA[base] ?? null),
  }
}

function parametros(entrada) {
  if (!entrada || typeof entrada !== 'object') return []
  return Object.entries(entrada)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([clave, valor]) => [clave, PARAMETROS_FECHA.has(clave) ? formatearPeriodo(String(valor)) : String(valor)])
}

// Qué endpoints del motor usó la IA para responder (`consultas` de POST /api/ia/preguntar).
export function FuentesConsultadas({ consultas, guia }) {
  if (!Array.isArray(consultas) || consultas.length === 0) return null

  return (
    <div data-guia={guia} className="flex flex-col gap-1.5 rounded-lg border bg-background/70 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <DatabaseIcon className="size-3.5" aria-hidden="true" />
        Fuentes consultadas en el motor ({consultas.length})
      </p>
      <ul className="flex flex-col gap-2">
        {consultas.map((consulta, i) => {
          const { nombre, vista } = describir(consulta)
          return (
            <li key={`${consulta.herramienta}-${i}`} className="flex flex-wrap items-center gap-1.5 text-xs">
              {consulta.ok ? (
                <CheckCircle2Icon className="size-3.5 text-sube" aria-label="Consulta correcta" />
              ) : (
                <CircleAlertIcon className="size-3.5 text-baja" aria-label="La consulta falló" />
              )}
              <span className="font-medium">{nombre}</span>
              {parametros(consulta.entrada).map(([clave, valor]) => (
                <Badge key={clave} variant="outline" className="font-normal">
                  {clave}: {valor}
                </Badge>
              ))}
              {!consulta.ok && <span className="text-baja">sin respuesta</span>}
              {vista && consulta.ok && (
                <Link
                  to={vista}
                  className="ml-auto inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
                >
                  Ver en la app
                  <ArrowUpRightIcon className="size-3" aria-hidden="true" />
                </Link>
              )}
              {consulta.ruta && (
                <code className="basis-full truncate font-mono text-[11px] text-muted-foreground" title={`GET /api${consulta.ruta}`}>
                  GET /api{consulta.ruta}
                </code>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
