import { useState } from 'react'
import { CheckCircle2Icon, RotateCcwIcon, SaveIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cargando } from '@/components/estados/Cargando.jsx'
import { ErrorApi } from '@/components/estados/ErrorApi.jsx'
import { guardarParametros, leerParametros } from '@/api/admin.js'
import { usePerfil } from '@/contexto/PerfilContext.jsx'
import { useConsulta } from '@/hooks/useConsulta.js'

// Regla de movimiento significativo (GET/PUT /api/parametros, #30). Aplica de inmediato a la
// comparación de períodos y al entregable 5. Un umbral vacío desactiva ese criterio (null).
const UMBRALES = [
  {
    campo: 'min_cambio_posicion_abs',
    nombre: 'Cambio de posición mínimo',
    ayuda: 'Significativo si el banco sube o baja al menos este número de posiciones.',
  },
  {
    campo: 'min_var_saldo_pct_abs',
    nombre: 'Variación de saldo mínima (%)',
    ayuda: 'Significativo si el saldo varía al menos este porcentaje, hacia arriba o hacia abajo.',
  },
]

// regla del API -> valores del formulario (texto; null se muestra vacío)
const aFormulario = (regla) => ({
  min_cambio_posicion_abs: regla.min_cambio_posicion_abs ?? '',
  cambio_lider: regla.cambio_lider,
  min_var_saldo_pct_abs: regla.min_var_saldo_pct_abs ?? '',
})

// true si la regla vigente tiene los mismos valores que la regla por defecto.
const esPorDefecto = (datos) =>
  ['min_cambio_posicion_abs', 'cambio_lider', 'min_var_saldo_pct_abs'].every(
    (campo) => datos.regla_significativo[campo] === datos.por_defecto[campo],
  )

// valores del formulario -> regla para el API. Devuelve { regla } o { error }.
function aRegla(formulario) {
  const regla = { cambio_lider: formulario.cambio_lider }
  for (const { campo, nombre } of UMBRALES) {
    const texto = String(formulario[campo]).trim()
    if (texto === '') {
      regla[campo] = null
      continue
    }
    const numero = Number(texto)
    if (!Number.isFinite(numero) || numero < 0) return { error: `${nombre} debe ser un número mayor o igual a 0, o quedar vacío.` }
    regla[campo] = numero
  }
  return { regla }
}

export function ReglaSignificativo({ alCambiar }) {
  const { perfil } = usePerfil()
  const consulta = useConsulta((opciones) => leerParametros(perfil, opciones), [perfil])
  const [guardado, setGuardado] = useState(null) // última respuesta del PUT
  const [editado, setFormulario] = useState(null) // lo que escribe el Administrador
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'error', texto, codigo? }
  const [guardando, setGuardando] = useState(false)

  const datos = guardado ?? consulta.datos
  // Mientras no se edite, el formulario muestra la regla vigente.
  const formulario = editado ?? (datos ? aFormulario(datos.regla_significativo) : null)

  async function guardar(regla, textoOk) {
    setGuardando(true)
    setAviso(null)
    try {
      const respuesta = await guardarParametros(perfil, regla)
      setGuardado(respuesta)
      setFormulario(null) // vuelve a mostrar la regla vigente, la que respondió el API
      setAviso({ tipo: 'ok', texto: textoOk })
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.mensaje ?? error.message, codigo: error.codigo })
    } finally {
      setGuardando(false)
      alCambiar?.() // la bitácora registra el cambio, con éxito o con error
    }
  }

  function enviar(evento) {
    evento.preventDefault()
    const { regla, error } = aRegla(formulario)
    if (error) {
      setAviso({ tipo: 'error', texto: error })
      return
    }
    guardar(regla, 'Regla guardada. La comparación de períodos ya la usa.')
  }

  let contenido
  if (consulta.cargando && !datos) contenido = <Cargando filas={3} />
  else if (consulta.error && !datos) contenido = <ErrorApi error={consulta.error} alReintentar={consulta.reintentar} />
  else if (formulario)
    contenido = (
      // noValidate: la validación la hace aRegla(), con un mensaje claro en español.
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {UMBRALES.map(({ campo, nombre, ayuda }) => (
          <div key={campo} className="flex flex-col gap-1">
            <label htmlFor={campo} className="text-sm font-medium">
              {nombre}
            </label>
            <input
              id={campo}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="Vacío = criterio desactivado"
              value={formulario[campo]}
              onChange={(e) => setFormulario({ ...formulario, [campo]: e.target.value })}
              className="h-8 w-full max-w-48 rounded-md border bg-background px-2 text-sm cifra"
            />
            <p className="text-xs text-muted-foreground">
              {ayuda} Por defecto: {datos.por_defecto[campo] ?? 'desactivado'}.
            </p>
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={formulario.cambio_lider}
            onChange={(e) => setFormulario({ ...formulario, cambio_lider: e.target.checked })}
            className="size-4"
          />
          Marcar el cambio de líder (el líder anterior y el nuevo). Por defecto:{' '}
          {datos.por_defecto.cambio_lider ? 'sí' : 'no'}.
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={guardando}>
            <SaveIcon aria-hidden="true" />
            Guardar regla
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={guardando}
            onClick={() => guardar(datos.por_defecto, 'Se restablecieron los valores por defecto.')}
          >
            <RotateCcwIcon aria-hidden="true" />
            Restablecer
          </Button>
        </div>

        <div aria-live="polite">
          {aviso?.tipo === 'ok' && (
            <Alert>
              <CheckCircle2Icon aria-hidden="true" />
              <AlertTitle>{aviso.texto}</AlertTitle>
            </Alert>
          )}
          {aviso?.tipo === 'error' && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>No se guardó la regla</AlertTitle>
              <AlertDescription>
                <p>{aviso.texto}</p>
                {aviso.codigo && <p className="font-mono text-xs">Código: {aviso.codigo}</p>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </form>
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regla de movimiento significativo</CardTitle>
        <CardDescription>
          Un movimiento es significativo si cumple al menos un criterio. Aplica de inmediato a la comparación de
          períodos y al reporte de movimientos.
        </CardDescription>
        {datos && (
          <CardAction>
            <Badge variant="outline">{esPorDefecto(datos) ? 'Valores por defecto' : 'Cambiada por el Administrador'}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{contenido}</CardContent>
    </Card>
  )
}
