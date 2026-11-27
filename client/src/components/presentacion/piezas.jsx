// Piezas comunes de las láminas. Las láminas se dibujan en un lienzo fijo de 1600 × 900 px que se
// escala a la pantalla (paginas/Presentacion.jsx), por eso aquí los tamaños son fijos y no usan los
// cortes responsivos (sm:, lg:). Solo clases de tokens: la paleta vive en styles/tema.css.
import { Etiqueta, TituloDosTonos } from '@/components/marca'
import { cn } from '@/lib/utils'

export const ANCHO_LIENZO = 1600
export const ALTO_LIENZO = 900

// Área útil de una lámina de contenido.
export function Lamina({ children, className }) {
  return <div className={cn('flex h-full flex-col gap-10 px-[72px] pt-[60px] pb-6', className)}>{children}</div>
}

// Etiqueta con ícono sobre un titular en dos tonos (como los encabezados de la app, más grande).
export function EncabezadoLamina({ icono, etiqueta, fuerte, suave }) {
  return (
    <header className="flex flex-col gap-5">
      <Etiqueta icono={icono} className="h-8 px-4 text-sm">
        {etiqueta}
      </Etiqueta>
      <TituloDosTonos
        fuerte={fuerte}
        suave={suave}
        className="max-w-[1300px] text-[50px] leading-[1.08] text-pretty sm:text-[50px]"
      />
    </header>
  )
}

// Tarjeta blanca de la guía (radio 16 y sombra suave).
export function Tarjeta({ children, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-tarjeta bg-card p-7 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border',
        className,
      )}
    >
      {children}
    </div>
  )
}

// Ícono dentro de un círculo verde claro.
export function IconoCirculo({ icono: Icono, className }) {
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center rounded-full bg-accent text-marca', className)}>
      <Icono aria-hidden="true" className="size-6" />
    </span>
  )
}


// Texto de reemplazo mientras llegan los datos o si el API no responde.
export function SinDatos({ cargando }) {
  return (
    <p className="text-lg text-muted-foreground">
      {cargando ? 'Cargando cifras del API…' : 'Sin conexión con el API: las cifras en vivo no están disponibles.'}
    </p>
  )
}
