import { useId, useState } from 'react'
import { BellRingIcon, CircleCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { suscribirse } from '@/api/cliente.js'
import { useFuente } from '@/api/fuente.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  alternarElegido,
  etiquetaSeleccion,
  LARGO_MAXIMO_CORREO,
  mensajeDeSuscripcion,
  validarCorreo,
} from '@/lib/suscripcion.js'

// Tarjeta "Alertas por correo" (#7): pide POST /api/suscripciones con el correo y, si se quiere, los
// bancos y rankings a seguir (sin marcas = todos). Hay doble confirmación: el server manda un correo
// con el enlace para confirmar y cada alerta trae su enlace para darse de baja.
// Abierta a los 3 perfiles y presente en los dos sitios. El correo vive solo en este formulario: no
// se guarda en el navegador ni se muestra en otra parte de la app.
export function AlertasPorCorreo({ bancos, rankings }) {
  const idCorreo = useId()
  const idErrorCorreo = useId()
  const { aviso } = useFuente()
  const [correo, setCorreo] = useState('')
  const [bancosElegidos, setBancosElegidos] = useState([])
  const [rankingsElegidos, setRankingsElegidos] = useState([])
  const [errorCorreo, setErrorCorreo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // resultado: { tipo: 'enviado' | 'no-enviado' | 'error', texto }
  const [resultado, setResultado] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    if (enviando) return
    const problema = validarCorreo(correo)
    setErrorCorreo(problema)
    if (problema) {
      setResultado(null)
      return
    }
    setEnviando(true)
    setResultado(null)
    try {
      const respuesta = await suscribirse({ correo, bancos: bancosElegidos, rankings: rankingsElegidos })
      setResultado({ tipo: respuesta.confirmacion_enviada ? 'enviado' : 'no-enviado', texto: respuesta.mensaje })
    } catch (error) {
      setResultado({ tipo: 'error', texto: mensajeDeSuscripcion(error) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card data-guia="reportes.suscribirse">
      <CardHeader>
        <CardTitle>Alertas por correo</CardTitle>
        <CardDescription>
          Recibe un correo con los movimientos significativos cada vez que se publique un período. Sin elegir bancos ni
          rankings, te avisamos de todos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idCorreo} className="text-sm font-medium">
              Correo electrónico
            </label>
            <Input
              id={idCorreo}
              name="correo"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nombre@ejemplo.com"
              maxLength={LARGO_MAXIMO_CORREO}
              className="h-10 md:h-9"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value)
                if (errorCorreo) setErrorCorreo(null)
              }}
              aria-invalid={errorCorreo ? true : undefined}
              aria-describedby={errorCorreo ? idErrorCorreo : undefined}
            />
            {errorCorreo && (
              <p id={idErrorCorreo} className="text-sm text-destructive">
                {errorCorreo}
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Filtro
              titulo="Bancos"
              opciones={bancos.map((b) => ({ valor: b.Codigo_Banco, etiqueta: `${b.Codigo_Banco} · ${b.Banco}` }))}
              elegidos={bancosElegidos}
              alCambiar={setBancosElegidos}
            />
            <Filtro
              titulo="Rankings"
              opciones={rankings.map((r) => ({ valor: r.Ranking, etiqueta: r.Ranking }))}
              elegidos={rankingsElegidos}
              alCambiar={setRankingsElegidos}
            />
          </div>

          <div>
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={enviando} aria-busy={enviando}>
              <BellRingIcon aria-hidden="true" />
              {enviando ? 'Enviando…' : 'Suscribirse'}
            </Button>
          </div>

          <div aria-live="polite">{resultado && <Resultado resultado={resultado} />}</div>

          <p className="text-xs text-muted-foreground">
            Primero te llega un correo para confirmar la suscripción, y cada alerta trae un enlace para darte de baja
            cuando quieras. {aviso}
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

// Mensaje del server tras enviar: confirmación enviada, confirmación que no salió o error de la solicitud.
function Resultado({ resultado }) {
  if (resultado.tipo === 'enviado') {
    return (
      <Alert role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Revisa tu correo</AlertTitle>
        <AlertDescription>{resultado.texto}</AlertDescription>
      </Alert>
    )
  }
  if (resultado.tipo === 'no-enviado') {
    return (
      <Alert role="status" className="border-aviso/30 bg-aviso-fondo text-aviso">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertTitle>Todavía no estás suscrito</AlertTitle>
        <AlertDescription className="text-aviso">{resultado.texto}</AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>No se pudo enviar la solicitud</AlertTitle>
      <AlertDescription>{resultado.texto}</AlertDescription>
    </Alert>
  )
}

// Filtro opcional: un desplegable nativo con casillas, para que la tarjeta no crezca con la lista de
// bancos. Sin marcas significa "todos".
function Filtro({ titulo, opciones, elegidos, alCambiar }) {
  const valores = opciones.map((o) => o.valor)
  return (
    <details className="group/filtro rounded-lg border border-input">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span>
          {titulo} <span className="font-normal text-muted-foreground">({etiquetaSeleccion(elegidos.length)})</span>
        </span>
        <span aria-hidden="true" className="text-xs text-muted-foreground group-open/filtro:rotate-180">
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-input p-2.5">
        <fieldset className="flex max-h-48 min-w-0 flex-col gap-2 overflow-y-auto">
          <legend className="sr-only">{titulo} que quieres seguir (sin marcar, todos)</legend>
          {opciones.map((o) => (
            <label key={o.valor} className="flex min-w-0 items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={elegidos.includes(o.valor)}
                onChange={(e) => alCambiar(alternarElegido(elegidos, valores, o.valor, e.target.checked))}
              />
              <span className="min-w-0 break-words">{o.etiqueta}</span>
            </label>
          ))}
        </fieldset>
        {elegidos.length > 0 && (
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={() => alCambiar([])}>
              Quitar selección
            </Button>
          </div>
        )}
      </div>
    </details>
  )
}
