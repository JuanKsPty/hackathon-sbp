// Bloque del panel interno con el estilo de la app (paleta E+, shadcn): título h2, una línea de
// contexto y, a la derecha, una acción opcional. `id` enlaza el título con aria-labelledby.
export function Seccion({ id, titulo, descripcion, accion, children, className = '', ...props }) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-4 ${className}`} {...props}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={id} className="text-lg font-semibold tracking-tight">
            {titulo}
          </h2>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}
