import { ArrowUpRightIcon, GlobeIcon, LockKeyholeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { urlOtroSitio } from './otroSitio.js'

// Botón píldora hacia el otro dominio: del público al interno y al revés.
// `conTexto`: muestra siempre el texto (en el menú móvil); si no, el texto aparece desde 1280 px.
export function BotonOtroSitio({ conTexto = false, className }) {
  const href =
    typeof window === 'undefined'
      ? '/'
      : urlOtroSitio({ interno: __INTERNO__, ubicacion: window.location, env: import.meta.env })
  const texto = __INTERNO__ ? 'Sitio público' : 'Sitio interno'
  const Icono = __INTERNO__ ? GlobeIcon : LockKeyholeIcon

  return (
    <Button asChild variant="outline" size="sm" className={cn('shrink-0', className)}>
      <a href={href} aria-label={__INTERNO__ ? 'Ir al sitio público' : 'Ir al sitio interno, para Analistas y Administradores'}>
        <Icono aria-hidden="true" />
        <span className={conTexto ? undefined : 'hidden xl:inline'}>{texto}</span>
        <ArrowUpRightIcon aria-hidden="true" className="text-muted-foreground" />
      </a>
    </Button>
  )
}
