// Encabezado común de cada página: título y una línea de descripción.
export function Pagina({ titulo, descripcion, children }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </section>
  )
}
