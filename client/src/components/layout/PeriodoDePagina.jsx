import { SelectorPeriodo } from './SelectorPeriodo.jsx'

// "Período de los datos" con su selector, a la derecha del título de las páginas que trabajan con un
// solo período (Panel, Rankings y Calidad). Lo que se elige aquí vale para toda la app.
export function PeriodoDePagina() {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="periodo-de-los-datos" className="text-xs font-medium text-muted-foreground">
        Período de los datos
      </label>
      <SelectorPeriodo id="periodo-de-los-datos" className="w-full sm:w-auto" />
    </div>
  )
}
