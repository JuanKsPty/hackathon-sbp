import { cn } from '@/lib/utils'

// Tarjeta blanca de una gráfica del dashboard: título en dos tonos (tamaño h3), acción opcional y
// el contenido. Va dentro de una SeccionGris.
export function TarjetaGrafico({ id, fuerte, suave, accion, pie, children, className, ...props }) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-tarjeta bg-card p-4 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 animate-aparecer sm:p-5 dark:shadow-none dark:ring-border',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={id} className="text-lg font-medium tracking-tight text-balance">
          {fuerte} {suave && <span className="text-muted-foreground">{suave}</span>}
        </h3>
        {accion}
      </div>
      {children}
      {pie && <p className="text-xs text-muted-foreground">{pie}</p>}
    </section>
  )
}
