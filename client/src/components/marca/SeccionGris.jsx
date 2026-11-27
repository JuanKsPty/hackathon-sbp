import { cn } from '@/lib/utils'

/**
 * Sección gris muy claro (#F4F4F5) con radio 24 y sin sombra. Agrupa tarjetas blancas
 * (Card o Cifra). Equivale a <Card superficie="seccion"> cuando no hace falta encabezado.
 */
export function SeccionGris({ children, className, ...props }) {
  return (
    <div className={cn('rounded-seccion bg-seccion p-4 sm:p-6', className)} {...props}>
      {children}
    </div>
  )
}
