import { useState } from 'react'
import { ChartAreaIcon, GitCompareArrowsIcon, LockKeyholeIcon, LogInIcon, ServerCogIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { entrar, rutaSegura } from '@/api/sesion.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NOMBRE_APP } from '@/components/layout/navegacion.js'
import { BloqueOscuro, Etiqueta, SeccionGris, TituloDosTonos } from '@/components/marca'
import { DESCRIPCIONES_PERFIL } from '@/contexto/PerfilContext.jsx'

// Mensaje claro para cada error de POST /api/sesion (criterio 4: mensajes claros ante errores).
const MENSAJES = {
  CREDENCIALES_INVALIDAS: 'Usuario o contraseña incorrectos.',
  DEMASIADOS_PEDIDOS: 'Demasiados intentos. Espera un minuto y vuelve a probar.',
  USUARIOS_NO_DISPONIBLES: 'No se pudo verificar el usuario en este momento. Intenta de nuevo en unos segundos.',
  API_NO_DISPONIBLE: 'No hay conexión con el servidor.',
  PARAMETRO_INVALIDO: 'Escribe el usuario y la contraseña.',
}

// Aviso de los datos (el mismo que manda el API en cada respuesta). Esta pantalla no pide datos.
const AVISO = 'Datos ficticios · Uso informativo, no opinión formal de la SBP'

const PERFILES = [
  { nombre: 'Analista', texto: DESCRIPCIONES_PERFIL.analista, icono: GitCompareArrowsIcon },
  { nombre: 'Administrador', texto: DESCRIPCIONES_PERFIL.admin, icono: ServerCogIcon },
]

const claseCampo =
  'h-11 w-full rounded-full border border-input bg-background px-4 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'

// Inicio de sesión del sitio interno (Analista y Administrador). El perfil sale de la cuenta.
// Bloque oscuro de la guía visual (#140) a la izquierda y el formulario a la derecha; en 360 px, uno debajo del otro.
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
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-6 sm:py-10">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6">
        <BloqueOscuro className="flex animate-aparecer flex-col justify-between gap-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-sm font-medium text-bloque-foreground">
              <img src="/marca/logo.svg" alt="" className="size-7" />
              {NOMBRE_APP}
            </div>
            <Etiqueta icono={LockKeyholeIcon}>
              Sitio interno
            </Etiqueta>
            <TituloDosTonos
              como="h1"
              fuerte="Qué cambió en cada corte,"
              suave="y por qué."
            />
            <p className="max-w-md text-sm text-bloque-muted">
              Rankings de crédito por banco calculados desde los archivos AT03, con sus movimientos explicados.
            </p>
          </div>
          <ul className="hidden flex-col gap-3 sm:flex">
            {PERFILES.map(({ nombre, texto, icono: Icono }) => (
              <li key={nombre} className="flex items-start gap-3 rounded-tarjeta bg-bloque-foreground/5 p-3 ring-1 ring-bloque-foreground/10">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bloque-foreground/10 text-brillo">
                  <Icono className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{nombre}</span>
                  <span className="text-xs text-bloque-muted">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 text-xs text-bloque-muted">
            <ChartAreaIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {AVISO}
          </p>
        </BloqueOscuro>

        <SeccionGris className="flex animate-aparecer flex-col justify-center gap-6 rounded-bloque p-6 sm:p-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-medium tracking-tight">Inicia sesión</h2>
            <p className="text-sm text-muted-foreground">Para Analistas y Administradores. El perfil sale de tu cuenta.</p>
          </div>
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
            <Button type="submit" size="pildora" disabled={enviando || !usuario || !clave}>
              <LogInIcon aria-hidden="true" />
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </SeccionGris>
      </div>
    </main>
  )
}
