import { Link } from 'react-router'
import { ArrowRightIcon, PresentationIcon, UsersIcon } from 'lucide-react'
import { BloqueOscuro, Etiqueta, TituloDosTonos } from '@/components/marca'
import { Button } from '@/components/ui/button'

// Portada del Inicio público: para quién es, qué responde y las dos llamadas principales. Las cifras
// del período van en el encabezado del dashboard (landing/EncabezadoCorte.jsx).
export function PortadaPublica() {
  return (
    <BloqueOscuro>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <img src="/marca/logo.svg" alt="" className="size-9 rounded" />
          <Etiqueta icono={UsersIcon}>Consulta pública</Etiqueta>
        </div>
        <TituloDosTonos
          como="h1"
          fuerte="¿Qué banco le presta más a cada sector?"
          className="max-w-2xl font-semibold"
        />
        <p className="max-w-2xl text-base leading-relaxed text-bloque-muted sm:text-lg">
          Los rankings de crédito de la banca en Panamá, abiertos para consultar y descargar. Para ciudadanos,
          periodistas, estudiantes, investigadores y los propios bancos: cada cifra sale del archivo AT03 del período y
          se puede revisar paso a paso.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="claro" size="pildora">
            <Link to="/rankings">
              Consultar rankings
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="borde-claro" size="pildora">
            <Link to="/presentacion">
              <PresentationIcon aria-hidden="true" />
              Ver la presentación
            </Link>
          </Button>
        </div>
      </div>

    </BloqueOscuro>
  )
}
