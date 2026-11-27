import { useEffect, useRef, useState } from 'react'
import { BotIcon, LoaderCircleIcon, SendHorizontalIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MAX_PREGUNTA } from '@/api/ia.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { AvisoIA } from './AvisoIA.jsx'
import { borrarConversacion, enviarPregunta, reintentarUltima, useConversacion } from './conversacion.js'
import { MensajeAsistente, MensajeError } from './MensajeAsistente.jsx'
import { PieFuente } from './PieFuente.jsx'
import { useEstadoIA } from './useEstadoIA.js'

// Preguntas de ejemplo. Público no tiene la herramienta de movimientos (contracts/ia.md).
function sugerencias(perfil, periodo) {
  const cuando = periodo ? ` en ${formatearPeriodo(periodo)}` : ''
  const lista = [
    `¿Quién lidera HIPOTECARIO${cuando}?`,
    `¿Cuál es el top 5 de CONSUMO${cuando}?`,
    '¿Cuántas filas se excluyeron y por qué motivo?',
  ]
  if (perfil !== 'publico') lista.push('¿Qué bancos subieron más posiciones respecto al período anterior?')
  return lista
}

// Chat de exploración (POST /api/ia/preguntar). Se puede usar en la página /asistente o en un
// panel lateral: trae su propio estado de IA y la conversación es compartida (conversacion.js).
export function ChatAsistente({ className }) {
  const { perfil } = usePerfil()
  const { periodo } = usePeriodo()
  const estado = useEstadoIA()
  const { mensajes, pendiente } = useConversacion()
  const [texto, setTexto] = useState('')
  const listaRef = useRef(null)
  const campoRef = useRef(null)

  const bloqueado = estado.iaDisponible === false
  const largo = texto.length
  const puedeEnviar = !bloqueado && !pendiente && texto.trim() !== '' && largo <= MAX_PREGUNTA
  const ultimaRespuesta = mensajes.findLast((m) => m.rol === 'asistente')?.id

  // Baja al último mensaje dentro de la lista (sin mover la página).
  useEffect(() => {
    const lista = listaRef.current
    if (lista) lista.scrollTop = lista.scrollHeight
  }, [mensajes.length, pendiente])

  function enviar(pregunta) {
    if (bloqueado || pendiente) return
    const limpia = pregunta.trim()
    if (!limpia || limpia.length > MAX_PREGUNTA) return
    setTexto('')
    enviarPregunta(limpia, perfil)
    campoRef.current?.focus()
  }

  function alEnviar(evento) {
    evento.preventDefault()
    enviar(texto)
  }

  function alTeclear(evento) {
    // Enter envía; Shift+Enter hace un salto de línea.
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar(texto)
    }
  }

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="size-4" aria-hidden="true" />
          Pregúntale a los datos
        </CardTitle>
        <CardDescription>
          La IA consulta la API del motor y te explica el resultado. No calcula: cada cifra sale del motor y se
          verifica.
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          {estado.iaDisponible === true && (
            <Badge variant="secondary" title={estado.modelo ? `Modelo: ${estado.modelo}` : undefined}>
              IA activa
            </Badge>
          )}
          {estado.iaDisponible === false && <Badge variant="outline">IA no disponible</Badge>}
          {mensajes.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={borrarConversacion} aria-label="Borrar la conversación" title="Borrar la conversación">
              <Trash2Icon aria-hidden="true" />
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AvisoIA estado={estado} />

        <div
          ref={listaRef}
          role="log"
          aria-live="polite"
          aria-label="Conversación con el asistente"
          className="flex max-h-[60vh] min-h-48 flex-col gap-4 overflow-y-auto pr-1"
        >
          {mensajes.length === 0 && !pendiente && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Pregunta por un ranking, un banco o un período. Por ejemplo:
              </p>
              <div className="flex flex-wrap gap-2">
                {sugerencias(perfil, periodo).map((sugerencia) => (
                  <Button
                    key={sugerencia}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1.5 text-left whitespace-normal"
                    disabled={bloqueado}
                    onClick={() => enviar(sugerencia)}
                  >
                    {sugerencia}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((mensaje) => {
            if (mensaje.rol === 'usuario') {
              return (
                <div key={mensaje.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-sm whitespace-pre-line text-primary-foreground">
                    {mensaje.texto}
                  </p>
                </div>
              )
            }
            if (mensaje.rol === 'error') {
              return (
                <MensajeError
                  key={mensaje.id}
                  error={mensaje.error}
                  pendiente={pendiente}
                  alReintentar={() => reintentarUltima(perfil)}
                />
              )
            }
            return (
              <MensajeAsistente
                key={mensaje.id}
                datos={mensaje.datos}
                guiaFuentes={mensaje.id === ultimaRespuesta ? 'asistente.fuentes' : undefined}
              />
            )
          })}

          {pendiente && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Consultando el motor…
            </p>
          )}
        </div>

        <form onSubmit={alEnviar} className="flex flex-col gap-1.5">
          <label htmlFor="asistente-pregunta" className="sr-only">
            Pregunta para el asistente
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="asistente-pregunta"
              ref={campoRef}
              data-guia="asistente.pregunta"
              rows={2}
              maxLength={MAX_PREGUNTA}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={alTeclear}
              disabled={bloqueado}
              placeholder={bloqueado ? 'El chat se activa cuando el servidor tenga la IA configurada.' : '¿Quién lidera COMERCIO en el último período?'}
              className="min-h-16 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button type="submit" size="icon-lg" disabled={!puedeEnviar} aria-label="Enviar pregunta" title="Enviar pregunta">
              {pendiente ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              ) : (
                <SendHorizontalIcon aria-hidden="true" />
              )}
            </Button>
          </div>
          <p className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>Enter para enviar · Shift+Enter para otra línea</span>
            <span className={cn('cifra', largo > MAX_PREGUNTA * 0.9 && 'text-baja')}>
              {largo}/{MAX_PREGUNTA}
            </span>
          </p>
        </form>
      </CardContent>

      <CardFooter>
        <PieFuente />
      </CardFooter>
    </Card>
  )
}
