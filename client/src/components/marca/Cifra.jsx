import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { tendenciaDe } from './tendencia'

const ICONOS = { sube: ArrowUpRightIcon, baja: ArrowDownRightIcon, igual: MinusIcon }
const TONOS = {
  sube: 'bg-sube-fondo text-sube',
  baja: 'bg-baja-fondo text-baja',
  igual: 'bg-igual-fondo text-igual',
}

/**
 * Tarjeta de cifra clave: etiqueta, valor grande con tabular-nums, detalle y variación.
 * `valor` y la variación salen de los datos (R2): nunca se escriben a mano.
 * `variacion` es opcional y acepta:
 *   - { tendencia: 'sube' | 'baja' | 'igual', texto }   p. ej. { tendencia: 'sube', texto: '+2 puestos' }
 *   - un número: el signo da la tendencia y se muestra con signo (+1,5 / −0,8 / 0)
 */
export function Cifra({ etiqueta, valor, detalle, variacion, className, ...props }) {
  const v = tendenciaDe(variacion)
  const Icono = v ? ICONOS[v.tendencia] : null
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-tarjeta bg-card p-5 text-card-foreground shadow-tarjeta ring-1 ring-foreground/5 dark:shadow-none dark:ring-border',
        className,
      )}
      {...props}
    >
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
      <p className="text-3xl font-medium tracking-tight tabular-nums">{valor}</p>
      {(v || detalle) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {v && (
            <span
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums',
                TONOS[v.tendencia],
              )}
            >
              <Icono aria-hidden="true" className="size-3.5" />
              {v.texto}
            </span>
          )}
          {detalle && <span className="text-muted-foreground">{detalle}</span>}
        </div>
      )}
    </div>
  )
}
