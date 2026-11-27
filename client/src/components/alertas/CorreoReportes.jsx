import { useState } from 'react'
import { BellIcon, MailIcon } from 'lucide-react'
import { enviarReporte, suscribirse } from '@/api/correo.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatearPeriodo } from '@/lib/formato.js'

const CAMPO = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

// Un formulario de correo: escribe la dirección, pulsa el botón y muestra lo que respondió el server.
function FormularioCorreo({ id, etiqueta, boton, Icono, accion }) {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState({ enviando: false, ok: null, mensaje: '' })

  async function alEnviar(evento) {
    evento.preventDefault()
    setEstado({ enviando: true, ok: null, mensaje: '' })
    try {
      const respuesta = await accion(correo.trim())
      const ok = respuesta?.confirmacion_enviada ?? respuesta?.enviado ?? true
      setEstado({ enviando: false, ok, mensaje: respuesta?.mensaje ?? 'Listo.' })
    } catch (error) {
      setEstado({ enviando: false, ok: false, mensaje: error?.mensaje ?? 'No pudimos completar el pedido.' })
    }
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium">
        {etiqueta}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="nombre@ejemplo.com"
          className={CAMPO}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
        <Button type="submit" disabled={estado.enviando || !correo.trim()} className="shrink-0">
          <Icono aria-hidden="true" />
          {estado.enviando ? 'Enviando…' : boton}
        </Button>
      </div>
      {estado.mensaje && (
        <p role="status" className={estado.ok ? 'text-sm text-emerald-700 dark:text-emerald-400' : 'text-sm text-destructive'}>
          {estado.mensaje}
        </p>
      )}
    </form>
  )
}

// Reportes y alertas por correo (#7), en el sitio público y en el interno. Zapier envía los correos
// desde la cuenta del equipo; la app solo le pasa el correo y el corte, y las cifras las calcula el server.
export function CorreoReportes({ periodo }) {
  return (
    <Card id="correo">
      <CardHeader>
        <CardTitle>Reportes por correo</CardTitle>
        <CardDescription>
          Recibe el reporte en tu Gmail o en cualquier correo. Datos ficticios · Uso informativo, no opinión formal de la SBP.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <FormularioCorreo
          id="correo-reporte"
          etiqueta={`Enviar el reporte del corte ${periodo ? formatearPeriodo(periodo) : 'más reciente'} a este correo`}
          boton="Enviar reporte"
          Icono={MailIcon}
          accion={(correo) => enviarReporte({ correo, periodo })}
        />
        <FormularioCorreo
          id="correo-alertas"
          etiqueta="Recibir alertas cada vez que se publique un nuevo corte"
          boton="Suscribirme"
          Icono={BellIcon}
          accion={(correo) => suscribirse({ correo })}
        />
      </CardContent>
    </Card>
  )
}
