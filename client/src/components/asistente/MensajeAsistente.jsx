import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowDownIcon,
  BadgeCheckIcon,
  BotIcon,
  BotOffIcon,
  ChartColumnIcon,
  CircleAlertIcon,
  MousePointer2Icon,
  RotateCwIcon,
  SearchXIcon,
} from 'lucide-react'
import { useGuia } from '@/guia/GuiaContext.jsx'
import { useAgente } from '@/agente/AgenteContext.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ETIQUETA_RESPUESTA } from '@/api/ia.js'
import { EtiquetaIA } from './EtiquetaIA.jsx'
import { FuentesConsultadas } from './FuentesConsultadas.jsx'
import { Avisos } from './GraficosAsistente.jsx'

// Negritas (**texto**) y viñetas simples: la IA a veces responde con algo de Markdown.
function conNegritas(linea) {
  return linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    /^\*\*[^*]+\*\*$/.test(parte) ? <strong key={i}>{parte.slice(2, -2)}</strong> : parte,
  )
}

function TextoRespuesta({ texto }) {
  const lineas = texto
    .split('\n')
    .map((linea) => linea.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, '• '))
    .filter((linea) => linea.trim())
  return (
    <div className="flex flex-col gap-1.5 leading-relaxed">
      {lineas.map((linea, i) => (
        <p key={i}>{conNegritas(linea)}</p>
      ))}
    </div>
  )
}

function Burbuja({ icono: Icono = BotIcon, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icono className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 max-w-[85%] flex-col gap-2 rounded-xl rounded-tl-sm bg-muted/60 px-3 py-2.5 text-sm">
        {children}
      </div>
    </div>
  )
}

// Respuesta de POST /api/ia/preguntar. `guia` va solo en la última respuesta (un data-guia por página).
export function MensajeAsistente({ datos, guiaFuentes }) {
  const etiqueta = datos?.etiqueta || ETIQUETA_RESPUESTA

  if (datos?.ia_disponible === false) {
    // Sin IA, la pregunta se interpreta por reglas (#108): si pidió datos, se muestran sus gráficos.
    if (datos.accion) return <RespuestaPorReglas accion={datos.accion} />
    return (
      <Burbuja icono={BotOffIcon}>
        <p className="font-medium">La IA no está disponible</p>
        <p className="text-muted-foreground">{datos.motivo ?? 'El servidor no tiene la IA configurada.'}</p>
        <p className="text-muted-foreground">
          Igual puedo mostrarte gráficos: pide un informe, un ranking, una comparación de períodos o cómo va un banco.
        </p>
      </Burbuja>
    )
  }

  if (!datos?.respuesta) {
    return (
      <Burbuja icono={SearchXIcon}>
        <p className="font-medium">No pude responder solo con cifras del motor</p>
        <p className="text-muted-foreground">
          {datos?.motivo ?? 'Prueba con una pregunta más concreta (un ranking, un banco o un período).'}
        </p>
        <ResumenAccion accion={datos?.accion} />
        <FuentesConsultadas consultas={datos?.consultas} guia={guiaFuentes} />
      </Burbuja>
    )
  }

  return (
    <Burbuja>
      <TextoRespuesta texto={datos.respuesta} />
      <div className="flex flex-wrap items-center gap-2">
        <EtiquetaIA texto={etiqueta} />
        {datos.verificada && (
          <Badge variant="outline" className="text-sube" title="Cada número de la respuesta está en las respuestas del motor">
            <BadgeCheckIcon aria-hidden="true" />
            Cifras verificadas
          </Badge>
        )}
      </div>
      <ResumenAccion accion={datos.accion} />
      <BotonGuia pasos={datos.guia?.pasos} />
      <PantallaDelMensaje datos={datos} />
      <FuentesConsultadas consultas={datos.consultas} guia={guiaFuentes} />
    </Burbuja>
  )
}

// Sin IA: la frase fija que arma el server con lo que se muestra (no trae cifras del motor).
function RespuestaPorReglas({ accion }) {
  return (
    <Burbuja icono={ChartColumnIcon}>
      <p>{accion.resumen}</p>
      <Avisos avisos={accion.avisos} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="h-auto text-left whitespace-normal"
          title="Sin IA: la pregunta se interpretó por palabras clave (mes, ranking, banco e informe)"
        >
          Interpretado por reglas · cifras del motor
        </Badge>
        {accion.graficos?.length > 0 && <BotonVerGraficos />}
      </div>
    </Burbuja>
  )
}

// Con IA: qué gráficos se mostraron junto a la respuesta.
function ResumenAccion({ accion }) {
  if (!accion) return null
  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <ChartColumnIcon className="size-3.5" aria-hidden="true" />
        {accion.graficos?.length > 0 ? `Gráficos en pantalla: ${accion.titulo}` : accion.titulo}
      </p>
      <Avisos avisos={accion.avisos} />
      {accion.graficos?.length > 0 && (
        <div>
          <BotonVerGraficos />
        </div>
      )}
    </div>
  )
}

// Lleva a los gráficos: el último panel en pantalla (el del panel lateral, si está abierto) o la
// página /asistente si el chat está en otro lugar.
function BotonVerGraficos() {
  const navegar = useNavigate()
  function verGraficos() {
    const paneles = document.querySelectorAll('[data-graficos-asistente]')
    const panel = paneles[paneles.length - 1]
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navegar('/asistente')
  }
  return (
    <Button variant="outline" size="sm" onClick={verGraficos}>
      <ArrowDownIcon aria-hidden="true" />
      Ver gráficos
    </Button>
  )
}

// Cursor guía (#72): si la IA respondió con pasos (`guia`), los muestra sobre la pantalla.
// Acciones de pantalla (#124). Cada respuesta se aplica una sola vez, aunque el mensaje se vuelva a
// dibujar o esté a la vez en el panel y en /asistente (la conversación es una sola).
const pantallasAplicadas = new WeakSet()

function PantallaDelMensaje({ datos }) {
  const { ejecutarPantalla } = useAgente()
  const pantalla = datos?.pantalla
  useEffect(() => {
    if (pantalla?.modo !== 'ejecutar' || pantallasAplicadas.has(pantalla)) return
    pantallasAplicadas.add(pantalla)
    ejecutarPantalla(pantalla)
  }, [pantalla, ejecutarPantalla])
  return null
}

function BotonGuia({ pasos }) {
  const { iniciar } = useGuia()
  if (!pasos?.length) return null
  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => iniciar(pasos)}>
        <MousePointer2Icon aria-hidden="true" />
        Mostrarme en la pantalla ({pasos.length} {pasos.length === 1 ? 'paso' : 'pasos'})
      </Button>
    </div>
  )
}

// Error de red o del API (por ejemplo, el servidor apagado o una pregunta inválida).
export function MensajeError({ error, alReintentar, pendiente }) {
  return (
    <Burbuja icono={CircleAlertIcon}>
      <p className="font-medium text-destructive">No se pudo enviar la pregunta</p>
      <p className="text-muted-foreground">{error?.mensaje ?? error?.message ?? 'Ocurrió un error inesperado.'}</p>
      {error?.codigo && <p className="font-mono text-xs text-muted-foreground">Código: {error.codigo}</p>}
      {alReintentar && error?.status !== 400 && (
        <div>
          <Button variant="outline" size="sm" onClick={alReintentar} disabled={pendiente}>
            <RotateCwIcon aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}
    </Burbuja>
  )
}
