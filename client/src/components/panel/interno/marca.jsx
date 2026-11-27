// Primitivas visuales provisionales del panel interno (#140), con la misma API que tendrán las de
// `components/marca/` (#138). Cuando esas entren a main, este archivo se borra y los imports pasan a
// `@/components/marca/…`. Solo usan los tokens del tema actual y colores fijos de la guía para el
// bloque oscuro, que se ve igual en claro y en oscuro.
import { cn } from '@/lib/utils'

// Bloque negro con cuadrícula sutil y brillo menta arriba a la izquierda.
export function BloqueOscuro({ children, className }) {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] bg-[#0B0B0C] text-white ring-1 ring-white/10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 -z-10 size-[28rem] rounded-full bg-[radial-gradient(circle,rgb(110_231_183/0.35),rgb(31_157_99/0.12)_45%,transparent_70%)] blur-2xl"
      />
      {children}
    </section>
  )
}

// Etiqueta píldora con ícono opcional (acento verde).
export function Etiqueta({ icono: Icono, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full bg-sube-fondo px-3 py-1 text-xs font-medium text-sube',
        className,
      )}
    >
      {Icono && <Icono className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

// Titular en dos tonos: la parte fuerte y la suave, grande, medium y con tracking-tight.
export function TituloDosTonos({ como: Como = 'h2', fuerte, suave, className }) {
  return (
    <Como className={cn('text-2xl font-medium tracking-tight text-balance sm:text-3xl', className)}>
      <span>{fuerte}</span> {suave && <span className="text-muted-foreground">{suave}</span>}
    </Como>
  )
}

// Sección gris de radio 24 px que agrupa tarjetas blancas.
export function SeccionGris({ children, className, ...resto }) {
  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-3xl bg-muted/60 p-4 sm:p-6 dark:bg-muted/30',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
      {...resto}
    >
      {children}
    </section>
  )
}

// Tarjeta blanca de radio 16 px con sombra suave, para ir dentro de una SeccionGris.
export function Tarjeta({ children, className, ...resto }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-border/60 sm:p-5', className)} {...resto}>
      {children}
    </div>
  )
}

// Control segmentado: píldoras dentro de un carril gris. Se desplaza en horizontal si no cabe (360 px).
export function Segmentado({ opciones, valor, onCambio, ariaLabel, className, ...resto }) {
  return (
    <div className={cn('max-w-full overflow-x-auto', className)} {...resto}>
      <div role="radiogroup" aria-label={ariaLabel} className="inline-flex gap-1 rounded-full bg-muted p-1">
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onCambio?.(opcion.valor)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
                activo ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opcion.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const COLOR_VARIACION = {
  sube: 'text-emerald-300',
  baja: 'text-rose-300',
  igual: 'text-white/60',
}

// Cifra clave del bloque oscuro: etiqueta, valor grande con tabular-nums, detalle y variación.
// `variacion`: { tendencia: 'sube' | 'baja' | 'igual', texto }. El texto ya viene armado con cifras del API.
export function Cifra({ etiqueta, valor, detalle, variacion }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-white/60">{etiqueta}</dt>
      <dd className="cifra text-2xl font-medium tracking-tight break-words tabular-nums xl:text-[1.75rem]">{valor}</dd>
      {variacion && <dd title={variacion.titulo} className={cn('cifra text-xs font-medium tabular-nums', COLOR_VARIACION[variacion.tendencia])}>{variacion.texto}</dd>}
      {detalle && <dd className="text-xs text-white/50">{detalle}</dd>}
    </div>
  )
}
