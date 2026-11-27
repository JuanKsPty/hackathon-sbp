import { Link } from 'react-router'
import { ArrowRightIcon, PresentationIcon, UsersIcon } from 'lucide-react'
import { BloqueOscuro, Etiqueta, TituloDosTonos } from '@/components/marca'
import { Button } from '@/components/ui/button'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearEntero, formatearMes, formatearMonto } from '@/lib/formato.js'

// Portada del Inicio público: para quién es, qué responde y dos cifras del período elegido, que
// salen de GET /api/periodos (R2). Mientras cargan se ve "—".
export function PortadaPublica() {
  const { periodo, detallePeriodo } = usePeriodo()
  const cifras = [
    { nombre: 'Cartera local válida', valor: formatearMonto(detallePeriodo?.Saldo_Total_Valido), detalle: 'Saldo en balboas' },
    { nombre: 'Operaciones válidas', valor: formatearEntero(detallePeriodo?.Universo_Local_Valido), detalle: 'Después de E1 a E4' },
  ]

  return (
    <BloqueOscuro className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
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

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {cifras.map(({ nombre, valor, detalle }) => (
          <div key={nombre} className="flex flex-col gap-1 rounded-tarjeta bg-bloque-foreground/8 p-4 ring-1 ring-bloque-foreground/15">
            <dt className="text-xs text-bloque-muted">
              {nombre}
              {periodo ? ` · ${formatearMes(periodo)}` : ''}
            </dt>
            <dd className="cifra text-2xl font-semibold tracking-tight break-all text-bloque-foreground">{valor}</dd>
            <dd className="text-xs text-bloque-muted">{detalle}</dd>
          </div>
        ))}
      </dl>
    </BloqueOscuro>
  )
}
