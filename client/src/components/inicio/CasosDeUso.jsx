import { Link } from 'react-router'
import {
  ArrowRightIcon,
  BotIcon,
  ClipboardCheckIcon,
  CompassIcon,
  FileDownIcon,
  FilterIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from 'lucide-react'
import { useAgente } from '@/agente/AgenteContext.jsx'
import { Etiqueta, TituloDosTonos } from '@/components/marca'
import { cn } from '@/lib/utils'

// Lo que viene a hacer el público, como preguntas, cada una con la sección que la responde.
// Solo opciones de la consulta pública (contracts/perfiles.md): nada del Analista ni del Administrador.
const CASOS = [
  {
    icono: TrophyIcon,
    pregunta: '¿Quién lidera cada sector?',
    texto: 'La posición de cada banco en cada ranking, con su saldo y su ponderación.',
    accion: 'Ver rankings',
    ruta: '/rankings',
  },
  {
    icono: FilterIcon,
    pregunta: '¿Cómo le va a un banco?',
    texto: 'Filtra por banco y por subactividad, y míralo en la tabla y en el gráfico.',
    accion: 'Filtrar por banco',
    ruta: '/rankings',
  },
  {
    icono: FileDownIcon,
    pregunta: 'Necesito los datos',
    texto: 'Descarga en CSV los rankings, las subactividades y la calidad de cada período.',
    accion: 'Ir a Reportes',
    ruta: '/reportes',
  },
  {
    icono: ShieldCheckIcon,
    pregunta: '¿De dónde salen las cifras?',
    texto: 'Qué filas del AT03 se excluyeron y por qué (E1 a E4), y cómo cuadran los totales.',
    accion: 'Ver la calidad',
    ruta: '/calidad',
  },
  {
    icono: ClipboardCheckIcon,
    pregunta: 'Quiero comprobarlo',
    texto: 'La verificación punto por punto, con filtros por período y por banco.',
    accion: 'Ir a Verificación',
    ruta: '/verificacion',
  },
  {
    icono: BotIcon,
    pregunta: 'Prefiero preguntar',
    texto: 'Escribe tu pregunta: el asistente responde con los datos y te muestra dónde verlo.',
    accion: 'Abrir el asistente',
  },
]

const claseTarjeta = cn(
  'group flex h-full flex-col gap-3 rounded-tarjeta border bg-card p-5 text-left text-card-foreground shadow-xs outline-none transition-colors',
  'hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50',
)

function Contenido({ icono: Icono, pregunta, texto, accion }) {
  return (
    <>
      <span className="grid size-10 place-items-center rounded-md bg-accent text-marca">
        <Icono aria-hidden="true" className="size-5" />
      </span>
      <span className="text-base font-semibold">{pregunta}</span>
      <span className="text-sm text-muted-foreground">{texto}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
        {accion}
        <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  )
}

export function CasosDeUso() {
  const { abrir } = useAgente()
  return (
    <section aria-labelledby="casos-de-uso" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Etiqueta icono={CompassIcon}>Empieza por tu pregunta</Etiqueta>
        <TituloDosTonos id="casos-de-uso" fuerte="¿Qué quieres saber?" suave="Cada pregunta te lleva a la sección que la responde." />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CASOS.map((caso) => (
          <li key={caso.pregunta}>
            {caso.ruta ? (
              <Link to={caso.ruta} className={claseTarjeta}>
                <Contenido {...caso} />
              </Link>
            ) : (
              <button type="button" onClick={abrir} className={cn(claseTarjeta, 'w-full')}>
                <Contenido {...caso} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
