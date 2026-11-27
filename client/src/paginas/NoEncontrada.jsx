import { Link } from 'react-router'
import { ArrowLeftIcon, CompassIcon } from 'lucide-react'
import { BloqueOscuro, Etiqueta, TituloDosTonos } from '@/components/marca'
import { Button } from '@/components/ui/button'

// 404 dentro del AppShell: la navegación y la barra de fuente siguen visibles.
export default function NoEncontrada() {
  return (
    <section className="animate-aparecer">
      <BloqueOscuro className="flex min-h-80 flex-col items-start justify-center gap-5">
        <Etiqueta icono={CompassIcon}>Error 404</Etiqueta>
        <TituloDosTonos
          como="h1"
          fuerte="Página no encontrada."
          suave="La dirección no corresponde a ninguna sección."
          className="max-w-2xl"
        />
        <Button asChild variant="claro" size="pildora">
          <Link to="/">
            <ArrowLeftIcon aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </BloqueOscuro>
    </section>
  )
}
