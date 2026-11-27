import { RadarIcon } from 'lucide-react'
import { useLocation } from 'react-router'
import { SECCIONES } from '@/components/layout/navegacion.js'
import { Etiqueta, TituloDosTonos } from '@/components/marca'
import { cn } from '@/lib/utils'

// Sección del menú que corresponde a la ruta actual, para la etiqueta del encabezado.
function seccionDe(ruta) {
  return SECCIONES.find((s) => (s.ruta === '/' ? ruta === '/' : ruta === s.ruta || ruta.startsWith(`${s.ruta}/`)))
}

// Encabezado común de cada página (#138): Etiqueta con la sección y titular en dos tonos.
// `titulo` va en el tono fuerte y `descripcion` en el suave, en el mismo h1.
// `etiqueta` e `icono` cambian la píldora (por defecto, la sección de la ruta actual).
// `acciones`: controles a la derecha del título (filtros, descargas).
export function Pagina({ titulo, descripcion, etiqueta, icono, acciones, className, children }) {
  const { pathname } = useLocation()
  const seccion = seccionDe(pathname)
  const textoEtiqueta = etiqueta ?? seccion?.nombre ?? 'Radar SBP'
  const iconoEtiqueta = icono ?? seccion?.icono ?? RadarIcon

  return (
    <section className={cn('flex animate-aparecer flex-col gap-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-4">
          <Etiqueta icono={iconoEtiqueta}>{textoEtiqueta}</Etiqueta>
          <TituloDosTonos
            como="h1"
            fuerte={descripcion ? `${titulo}.` : titulo}
            suave={descripcion}
            className="text-2xl sm:text-3xl lg:text-4xl"
          />
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
