import { useMemo, useState } from 'react'
import { CalendarRangeIcon, CrownIcon, LockIcon, MessageSquareTextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { Vacio } from '@/components/estados/Vacio.jsx'
import { ETIQUETA_EXPLICACION, explicaciones } from '@/api/ia.js'
import { UBICACION_SELECTOR_PERFIL, usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'
import { formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { EtiquetaIA, FuenteExplicacion } from './EtiquetaIA.jsx'
import { PieFuente } from './PieFuente.jsx'

// Período anterior al elegido en el encabezado (los períodos llegan como AAAAMMDD).
function periodoAnterior(periodos, periodo) {
  const fechas = periodos.map((p) => p.Fecha).filter(Boolean).sort()
  const indice = fechas.indexOf(periodo)
  return indice > 0 ? fechas[indice - 1] : null
}

// Explicación de los movimientos significativos y cambios de líder (GET /api/explicaciones),
// entre el período elegido y el anterior. Cada frase indica si la redactó la IA o salió por reglas.
// Solo Analista y Administrador (Público recibe 403). Con `guia` se puede reusar en el Panel
// (data-guia="panel.explicaciones").
export function ExplicacionesMovimientos({ guia, className }) {
  const { perfil } = usePerfil()
  const { periodos, periodo } = usePeriodo()
  const [ranking, setRanking] = useState('')

  const desde = periodoAnterior(periodos, periodo)
  const permitido = perfil !== 'publico'
  const activa = permitido && Boolean(desde && periodo)

  const { datos: ultimosDatos, error, cargando, reintentar } = useConsulta(
    (opciones) => explicaciones({ desde, hasta: periodo }, { ...opciones, perfil }),
    // Sin `perfil`: Analista y Administrador reciben la misma explicación, y cada pedido cuenta en el
    // límite de la IA. Al pasar de Público a otro perfil, `activa` cambia y se pide igual.
    [desde, periodo],
    { activa },
  )

  // useConsulta conserva la última respuesta aunque la consulta quede inactiva (Público, primer período).
  const datos = activa ? ultimosDatos : null
  const items = useMemo(() => (Array.isArray(datos?.items) ? datos.items : []), [datos])
  const rankings = useMemo(() => [...new Set(items.map((item) => item.Ranking).filter(Boolean))], [items])
  const visibles = ranking && rankings.includes(ranking) ? items.filter((item) => item.Ranking === ranking) : items
  const conIA = items.some((item) => item.fuente === 'ia')

  const tramo = datos ? `${formatearPeriodo(datos.periodo_anterior)} → ${formatearPeriodo(datos.periodo_actual)}` : null

  let contenido
  if (!permitido) {
    contenido = (
      <Vacio
        icono={LockIcon}
        titulo="Disponible para Analista y Administrador"
        descripcion={`Elige Analista o Administrador en ${UBICACION_SELECTOR_PERFIL} para ver por qué se movió cada banco. El chat sigue disponible para todos los perfiles.`}
      />
    )
  } else if (!periodo) {
    contenido = <Vacio icono={CalendarRangeIcon} titulo="No hay un período elegido" descripcion="Elige un período en el encabezado." />
  } else if (!desde) {
    contenido = (
      <Vacio
        icono={CalendarRangeIcon}
        titulo="Se necesitan dos períodos"
        descripcion={`${formatearPeriodo(periodo)} no tiene un período anterior cargado para comparar. Elige otro período en el encabezado.`}
      />
    )
  } else if (cargando) {
    contenido = <Cargando filas={4} etiqueta="Preparando las explicaciones…" />
  } else if (error) {
    contenido = <ErrorApi error={error} alReintentar={reintentar} titulo="No se pudieron cargar las explicaciones" />
  } else if (items.length === 0) {
    contenido = (
      <Vacio
        icono={MessageSquareTextIcon}
        titulo="Sin movimientos para explicar"
        descripcion={`Entre ${tramo} no hubo movimientos significativos ni cambios de líder.`}
      />
    )
  } else {
    contenido = (
      <div className="flex flex-col gap-3">
        <EtiquetaIA texto={datos.etiqueta || ETIQUETA_EXPLICACION} porReglas={!conIA} />
        {datos.motivo && <p className="text-xs text-aviso">{datos.motivo}</p>}

        {rankings.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por ranking">
            {['', ...rankings].map((opcion) => (
              <Button
                key={opcion || 'todos'}
                variant={ranking === opcion ? 'secondary' : 'ghost'}
                size="xs"
                aria-pressed={ranking === opcion}
                onClick={() => setRanking(opcion)}
              >
                {opcion || 'Todos'}
              </Button>
            ))}
          </div>
        )}

        <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
          {visibles.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{item.Ranking}</Badge>
                {item.tipo === 'cambio_lider' ? (
                  <Badge>
                    <CrownIcon aria-hidden="true" />
                    Cambio de líder
                  </Badge>
                ) : (
                  <Badge variant="ghost" className="text-muted-foreground">
                    Movimiento significativo
                  </Badge>
                )}
                <span className="ml-auto">
                  <FuenteExplicacion fuente={item.fuente} />
                </span>
              </div>
              <p className="text-sm leading-relaxed">{item.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <Card data-guia={guia} className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle>Por qué se movieron los bancos</CardTitle>
        <CardDescription>{tramo ?? 'Movimientos significativos y cambios de líder frente al período anterior'}</CardDescription>
        {datos && permitido && (
          <CardAction>
            <Badge variant="secondary" className="cifra">
              {items.length} {items.length === 1 ? 'explicación' : 'explicaciones'}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{contenido}</CardContent>
      <CardFooter>
        <PieFuente periodoTexto={tramo ?? undefined} />
      </CardFooter>
    </Card>
  )
}
