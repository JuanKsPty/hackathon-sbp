import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowDownIcon,
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
import { useDemostracion } from '@/agente/DemostracionContext.jsx'
import { Button } from '@/components/ui/button'

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
// Solo la respuesta y los botones (pedido de @atraverso06): sin etiquetas, fuentes ni resúmenes.
export function MensajeAsistente({ datos }) {
  // Texto: la respuesta de la IA; sin IA, la frase de las reglas; si no hay, un aviso corto.
  let texto = datos?.respuesta
  let icono = BotIcon
  if (!texto && datos?.ia_disponible === false) {
    texto = datos.accion?.resumen ?? 'La IA no está disponible. Igual puedo mostrarte un ranking, un informe o cómo va un banco.'
    icono = datos.accion ? ChartColumnIcon : BotOffIcon
  } else if (!texto) {
    texto = datos?.pantalla ? 'Te lo muestro en la pantalla.' : 'No encontré una respuesta con cifras del motor. Prueba con una pregunta más concreta.'
    icono = datos?.pantalla ? BotIcon : SearchXIcon
  }
  return (
    <Burbuja icono={icono}>
      <TextoRespuesta texto={texto} />
      <BotonesRespuesta datos={datos} />
    </Burbuja>
  )
}

// Botones de la respuesta: "Ver gráficos" y "Muéstrame cómo" (o la guía, si no hay pantalla).
function BotonesRespuesta({ datos }) {
  const conGraficos = datos?.accion?.graficos?.length > 0
  const conPantalla = datos?.pantalla?.acciones?.length > 0
  const conGuia = !conPantalla && datos?.guia?.pasos?.length > 0
  // La pantalla se aplica al llegar la respuesta ("ejecutar" al instante, "demostrar" con el cursor).
  useAplicarPantalla(datos?.pantalla)
  if (!conGraficos && !conPantalla && !conGuia) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {conGraficos && <BotonVerGraficos />}
      {conPantalla && <BotonMostrarComo pantalla={datos.pantalla} />}
      {conGuia && <BotonGuia pasos={datos.guia.pasos} />}
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

// Al llegar la respuesta: "ejecutar" se aplica al instante; "demostrar" arranca el cursor.
function useAplicarPantalla(pantalla) {
  const { ejecutarPantalla } = useAgente()
  const { demostrar } = useDemostracion()
  useEffect(() => {
    if (!pantalla?.acciones?.length || pantallasAplicadas.has(pantalla)) return
    pantallasAplicadas.add(pantalla)
    if (pantalla.modo === 'ejecutar') ejecutarPantalla(pantalla)
    else if (pantalla.modo === 'demostrar') demostrar(pantalla)
  }, [pantalla, ejecutarPantalla, demostrar])
}

// "Muéstrame cómo": deshace lo aplicado y lo demuestra paso a paso desde donde estaba el usuario.
function BotonMostrarComo({ pantalla }) {
  const { deshacerUltima } = useAgente()
  const { demostrar, demostrando } = useDemostracion()
  const mostrarComo = () => {
    if (pantalla.modo === 'ejecutar') deshacerUltima()
    demostrar(pantalla)
  }
  return (
    <Button variant="outline" size="sm" onClick={mostrarComo} disabled={demostrando}>
      <MousePointer2Icon aria-hidden="true" />
      {pantalla.modo === 'ejecutar' ? 'Muéstrame cómo' : 'Ver de nuevo'}
    </Button>
  )
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
