import * as React from "react"
import { cn } from "cn"

// Superficie de la tarjeta según la guía (client/DISENO.md):
// - tarjeta: blanca, radio 16 y sombra suave; va dentro de una sección gris o sobre el fondo.
// - seccion: gris muy claro, radio 24 y sin sombra; agrupa tarjetas.
const superficies = {
  tarjeta:
    "rounded-tarjeta bg-card shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border *:[img:first-child]:rounded-t-tarjeta *:[img:last-child]:rounded-b-tarjeta",
  seccion:
    "rounded-seccion bg-seccion ring-0 [--card-spacing:--spacing(6)] data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-seccion *:[img:last-child]:rounded-b-seccion",
}

function Card({
  className,
  size = "default",
  superficie = "tarjeta",
  ...props
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-superficie={superficie}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        superficies[superficie] ?? superficies.tarjeta,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium tracking-tight group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
