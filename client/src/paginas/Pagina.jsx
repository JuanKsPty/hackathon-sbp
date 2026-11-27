// Encabezado común de cada página: título, una línea de descripción y, opcionalmente, `acciones`
// (por ejemplo el período de los datos): a la derecha del título en escritorio y debajo en el celular.
export function Pagina({ titulo, descripcion, acciones, children }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-end gap-3">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
