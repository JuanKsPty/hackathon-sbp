import { cn } from '@/lib/utils'

/**
 * Bloque negro con radio 28, cuadrícula sutil y brillo menta arriba a la izquierda.
 * Es negro en los dos modos (en oscuro, #141416 con borde). Dentro, Etiqueta y
 * TituloDosTonos cambian solos a sus tonos claros (usan el atributo data-bloque-oscuro).
 * Para botones usa <Button variant="claro"> o <Button variant="borde-claro">.
 */
export function BloqueOscuro({ children, className, ...props }) {
  return (
    <div
      data-bloque-oscuro=""
      className={cn(
        'relative isolate overflow-hidden rounded-bloque bg-bloque p-6 text-bloque-foreground sm:p-10 dark:ring-1 dark:ring-border',
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="cuadricula-bloque pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="brillo-menta pointer-events-none absolute inset-0 -z-10" />
      {children}
    </div>
  )
}
