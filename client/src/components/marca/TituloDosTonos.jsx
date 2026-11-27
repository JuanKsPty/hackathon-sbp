import { cn } from '@/lib/utils'

const TAMANOS = {
  h1: 'text-3xl sm:text-5xl',
  h2: 'text-2xl sm:text-4xl',
  h3: 'text-xl sm:text-2xl',
}

/**
 * Titular en dos tonos: las palabras clave (`fuerte`) en text-foreground y el resto
 * (`suave`) en text-muted-foreground. Inter, font-medium y tracking-tight.
 * Ej.: <TituloDosTonos como="h1" fuerte="Rankings de crédito" suave="por banco y período" />
 * Dentro de BloqueOscuro usa sola los tonos claros.
 */
export function TituloDosTonos({ como = 'h2', fuerte, suave, className, ...props }) {
  const Etiqueta = como
  return (
    <Etiqueta
      className={cn(
        'font-medium tracking-tight text-balance',
        TAMANOS[como] ?? TAMANOS.h2,
        className,
      )}
      {...props}
    >
      <span className="text-foreground in-data-[bloque-oscuro]:text-bloque-foreground">{fuerte}</span>
      {suave ? (
        <>
          {' '}
          <span className="text-muted-foreground in-data-[bloque-oscuro]:text-bloque-muted">{suave}</span>
        </>
      ) : null}
    </Etiqueta>
  )
}
