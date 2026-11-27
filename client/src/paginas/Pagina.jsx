// Encabezado común de cada página: título, una línea de descripción y, opcionalmente, `acciones`
// (por ejemplo el período de los datos): a la derecha del título si caben y, si no, debajo.
export function Pagina({ titulo, descripcion, acciones, children }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-end gap-3">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
