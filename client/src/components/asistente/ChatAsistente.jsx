import { useEffect, useRef, useState } from 'react'
import { BotIcon, LoaderCircleIcon, SendHorizontalIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MAX_PREGUNTA } from '@/api/ia.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { usePeriodo } from '@/contexto/PeriodoContext.jsx'
import { formatearPeriodo } from '@/lib/formato.js'
import { cn } from '@/lib/utils'
import { sugerenciasDeGraficos } from './accion.js'
import { AvisoIA } from './AvisoIA.jsx'
import { borrarConversacion, enviarPregunta, reintentarUltima, useConversacion } from './conversacion.js'
import { Burbuja, MensajeAsistente, MensajeError } from './MensajeAsistente.jsx'
import { useEstadoIA } from './useEstadoIA.js'

// Preguntas de ejemplo. Primero las que muestran gráficos (#108), con los períodos cargados; Público no
// compara períodos ni tiene la herramienta de movimientos (contracts/ia.md).
function sugerencias(perfil, periodo, periodos) {
  return todasLasSugerencias(perfil, periodo, periodos).slice(0, 3)
}

function todasLasSugerencias(perfil, periodo, periodos) {
  const graficos = sugerenciasDeGraficos(perfil, periodos)
  if (graficos.length) {
    return perfil === 'publico'
      ? [...graficos, '¿Cuántas filas se excluyeron y por qué motivo?']
      : [...graficos, '¿Qué bancos subieron más posiciones respecto al período anterior?']
  }
  const cuando = periodo ? ` en ${formatearPeriodo(periodo)}` : ''
  return [`¿Quién lidera HIPOTECARIO${cuando}?`, `¿Cuál es el top 5 de CONSUMO${cuando}?`, '¿Cuántas filas se excluyeron y por qué motivo?']
}

// Chat de exploración (POST /api/ia/preguntar). Se puede usar en la página /asistente o en un
// panel lateral: trae su propio estado de IA y la conversación es compartida (conversacion.js).
// `enPanel`: sin tarjeta y llenando el alto del contenedor (el padre debe ser una columna flex con
// alto definido, como el panel lateral): la lista de mensajes crece y el formulario queda abajo.
// `pie`: contenido al final de la lista de mensajes (los gráficos en el chat flotante), dentro del mismo scroll.
export function ChatAsistente({ className, enPanel = false, pie = null }) {
  const { perfil } = usePerfil()
  const { periodo, periodos } = usePeriodo()
  const estado = useEstadoIA()
  const { mensajes, pendiente } = useConversacion()
  const [texto, setTexto] = useState('')
  const listaRef = useRef(null)
  const campoRef = useRef(null)

  const largo = texto.length
  const puedeEnviar = !pendiente && texto.trim() !== '' && largo <= MAX_PREGUNTA

  // Baja al último mensaje dentro de la lista (sin mover la página). Sin conversación se queda
  // arriba, en el saludo.
  useEffect(() => {
    const lista = listaRef.current
    if (lista && (mensajes.length > 0 || pendiente)) lista.scrollTop = lista.scrollHeight
  }, [mensajes.length, pendiente])

  function enviar(pregunta) {
    if (pendiente) return
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

  const acciones = (
    <>
      {mensajes.length > 0 && (
        <Button variant="ghost" size="icon-sm" onClick={borrarConversacion} aria-label="Borrar la conversación" title="Borrar la conversación">
          <Trash2Icon aria-hidden="true" />
        </Button>
      )}
    </>
  )

  const conversacion = (
    <div
      ref={listaRef}
      role="log"
      aria-live="polite"
      aria-label="Conversación con el asistente"
      data-desplazable={enPanel ? '' : undefined}
      className={cn('flex flex-col gap-4 overflow-y-auto overscroll-contain pr-1', enPanel ? 'min-h-0 flex-1' : 'max-h-[60vh] min-h-48')}
    >
      {/* Saludo del agente: siempre es el primer mensaje de la conversación. */}
      <Burbuja>
        <p>¡Hola! ¿En qué puedo ayudarte? Pregúntame por los rankings, un banco o la calidad de los datos.</p>
      </Burbuja>

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
          <MensajeAsistente key={mensaje.id} id={mensaje.id} datos={mensaje.datos} />
        )
      })}

      {pendiente && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          Consultando el motor…
        </p>
      )}
      {pie}
    </div>
  )

  // Preguntas de ejemplo justo encima del campo, mientras la conversación está vacía.
  const ejemplos = mensajes.length === 0 && !pendiente && (
    <div className="flex flex-wrap gap-2">
      {sugerencias(perfil, periodo, periodos).map((sugerencia) => (
        <Button
          key={sugerencia}
          variant="outline"
          size="sm"
          className="h-auto max-w-full shrink py-1.5 text-left whitespace-normal"
          onClick={() => enviar(sugerencia)}
        >
          {sugerencia}
        </Button>
      ))}
    </div>
  )

  const formulario = (
    <form onSubmit={alEnviar} className="flex flex-col gap-2">
      {ejemplos}
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
      {/* El contador solo aparece cerca del límite. */}
      {largo > MAX_PREGUNTA * 0.8 && (
        <p className={cn('cifra text-right text-xs text-muted-foreground', largo > MAX_PREGUNTA * 0.9 && 'text-baja')}>
          {largo}/{MAX_PREGUNTA}
        </p>
      )}
    </form>
  )

  if (enPanel) {
    return (
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-3', className)}>
        <div className="flex min-h-7 items-center justify-end gap-1">{acciones}</div>
        <AvisoIA estado={estado} />
        {conversacion}
        {formulario}
      </div>
    )
  }

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="size-4" aria-hidden="true" />
          Asistente IA
        </CardTitle>
        <CardAction className="flex items-center gap-1">{acciones}</CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AvisoIA estado={estado} />
        {conversacion}
        {formulario}
      </CardContent>
    </Card>
  )
}
