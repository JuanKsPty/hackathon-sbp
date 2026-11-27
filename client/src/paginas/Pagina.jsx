// Encabezado común de cada página: título, una línea de descripción y, opcionalmente, `acciones`
// (por ejemplo el período de los datos o los filtros): a la derecha del título en escritorio y debajo
// en el celular. Si las acciones no caben junto al título, pasan a la línea de abajo, alineadas a la derecha.
export function Pagina({ titulo, descripcion, acciones, children }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-6 sm:gap-y-3">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-1 sm:basis-64">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-end gap-3 sm:ml-auto sm:justify-end">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
