import { useId, useState } from 'react'
import { MailIcon } from 'lucide-react'
import { enviarReporte } from '@/api/correo.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatearPeriodo } from '@/lib/formato.js'

// Reporte por correo (#7), abierto a los 3 perfiles y a los dos sitios: manda el reporte del corte
// elegido a un correo, sin suscribirlo. El server calcula las cifras y Zapier envía el correo.
export function ReportePorCorreo({ periodo }) {
  const id = useId()
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState({ enviando: false, ok: null, mensaje: '' })

  async function alEnviar(evento) {
    evento.preventDefault()
    setEstado({ enviando: true, ok: null, mensaje: '' })
    try {
      const respuesta = await enviarReporte({ correo: correo.trim(), periodo })
      setEstado({ enviando: false, ok: respuesta?.enviado === true, mensaje: respuesta?.mensaje ?? 'Listo.' })
    } catch (error) {
      setEstado({ enviando: false, ok: false, mensaje: error?.mensaje ?? 'No pudimos enviar el reporte.' })
    }
  }

  return (
    <Card id="reporte-por-correo">
      <CardHeader>
        <CardTitle>Reporte por correo</CardTitle>
        <CardDescription>
          Recibe en tu Gmail, o en cualquier correo, el reporte del corte{' '}
          {periodo ? formatearPeriodo(periodo) : 'más reciente'}: movimientos significativos, líderes y calidad de los datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={alEnviar} className="flex flex-col gap-2">
          <label htmlFor={id} className="text-xs font-medium">
            Correo
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={id}
              type="email"
              required
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <Button type="submit" disabled={estado.enviando || !correo.trim()} className="shrink-0">
              <MailIcon aria-hidden="true" />
              {estado.enviando ? 'Enviando…' : 'Enviar reporte'}
            </Button>
          </div>
          {estado.mensaje && (
            <p role="status" className={estado.ok ? 'text-sm text-emerald-700 dark:text-emerald-400' : 'text-sm text-destructive'}>
              {estado.mensaje}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
