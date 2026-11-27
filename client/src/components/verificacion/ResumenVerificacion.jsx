import { CheckCircle2Icon, TriangleAlertIcon, XCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatearPeriodo } from '@/lib/formato.js'
import { PUNTOS, cumple } from './puntos.js'

// Resumen del modo verificación: cuántos puntos cumplen sus chequeos y un acceso directo a cada
// punto (un clic baja a su tarjeta). Todo sale de `todo_ok` y los `chequeos` del API.
export function ResumenVerificacion({ datos }) {
  const puntos = PUNTOS.map((p) => ({ ...p, resultado: datos.puntos?.[p.clave] })).filter((p) => p.resultado)
  const cumplen = puntos.filter((p) => cumple(p.resultado)).length
  const todoOk = datos.todo_ok === true

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm',
        todoOk ? 'border-sube/30 bg-sube-fondo text-sube' : 'border-baja/30 bg-baja-fondo text-baja',
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          {todoOk ? <CheckCircle2Icon className="size-4" aria-hidden="true" /> : <TriangleAlertIcon className="size-4" aria-hidden="true" />}
          {todoOk ? 'Todos los chequeos cumplen' : 'Hay chequeos que no cumplen'} · {cumplen} de {puntos.length} puntos
        </span>
        <span className="text-xs">
          Período: {formatearPeriodo(datos.periodo)} · Archivo: {datos.archivo}
          {datos.banco ? ` · Banco: ${datos.banco.Banco} (${datos.banco.Codigo_Banco})` : ''}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Ir a un punto">
        {puntos.map((p) => {
          const ok = cumple(p.resultado)
          const Icono = ok ? CheckCircle2Icon : XCircleIcon
          return (
            <li key={p.numero}>
              <a
                href={`#punto-${p.numero}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icono className={cn('size-3.5', ok ? 'text-sube' : 'text-baja')} aria-hidden="true" />
                Punto {p.numero}
                <span className="sr-only">{ok ? ': cumple' : ': no cumple'}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
