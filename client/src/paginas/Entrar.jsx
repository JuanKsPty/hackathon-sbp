import { useState } from 'react'
import { LogInIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { entrar, rutaSegura } from '@/api/sesion.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NOMBRE_APP } from '@/components/layout/navegacion.js'

// Mensaje claro para cada error de POST /api/sesion (criterio 4: mensajes claros ante errores).
const MENSAJES = {
  CREDENCIALES_INVALIDAS: 'Usuario o contraseña incorrectos.',
  DEMASIADOS_PEDIDOS: 'Demasiados intentos. Espera un minuto y vuelve a probar.',
  USUARIOS_NO_DISPONIBLES: 'No se pudo verificar el usuario en este momento. Intenta de nuevo en unos segundos.',
  API_NO_DISPONIBLE: 'No hay conexión con el servidor.',
  PARAMETRO_INVALIDO: 'Escribe el usuario y la contraseña.',
}

const claseCampo =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'

// Inicio de sesión del sitio interno (Analista y Administrador). El perfil sale de la cuenta.
export default function Entrar() {
  const [parametros] = useSearchParams()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await entrar({ usuario: usuario.trim(), clave })
      // Recarga completa: los datos que se pidieron sin sesión (períodos, perfil) se vuelven a pedir.
      window.location.replace(rutaSegura(parametros.get('volver')))
    } catch (e) {
      setError(MENSAJES[e?.codigo] ?? e?.mensaje ?? 'No se pudo iniciar sesión.')
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src="/marca/logo.svg" alt="" className="mx-auto size-12" />
          <CardTitle className="text-xl">{NOMBRE_APP}</CardTitle>
          <CardDescription>Sitio interno para Analistas y Administradores. Datos ficticios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Usuario
              <input
                name="usuario"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className={claseCampo}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Contraseña
              <input
                name="clave"
                type="password"
                autoComplete="current-password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className={claseCampo}
              />
            </label>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>No se pudo entrar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={enviando || !usuario || !clave}>
              <LogInIcon aria-hidden="true" />
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
