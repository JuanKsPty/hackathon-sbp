import { cn } from '@/lib/utils'

/**
 * Píldora chica que va sobre los títulos: ícono lucide verde y texto corto.
 * Ej.: <Etiqueta icono={TrophyIcon}>Rankings</Etiqueta>
 * Dentro de BloqueOscuro pasa sola a blanco translúcido.
 */
export function Etiqueta({ icono: Icono, children, className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground',
        'in-data-[bloque-oscuro]:bg-bloque-foreground/10 in-data-[bloque-oscuro]:text-bloque-foreground',
        className,
      )}
      {...props}
    >
      {Icono && (
        <Icono aria-hidden="true" className="size-3.5 shrink-0 text-marca in-data-[bloque-oscuro]:text-brillo" />
      )}
      {children}
    </span>
  )
}
