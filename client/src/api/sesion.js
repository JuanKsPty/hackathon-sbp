// Sesión del sitio interno (Analista y Administrador). El perfil ya no lo elige la UI: sale de la
// cookie de sesión (HttpOnly) que pone POST /api/sesion. El sitio público no inicia sesión.
//   POST   /api/sesion  { usuario, clave } -> { usuario, nombre, perfil, nombre_perfil }
//   DELETE /api/sesion  cierra la sesión
// Todas las peticiones al API mandan X-Sbp: 1; el server rechaza POST, PUT y DELETE sin él (CSRF).
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'

export const HEADERS_BASE = { 'X-Sbp': '1' }

async function leerJson(respuesta) {
  const texto = await respuesta.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

async function pedirSesion(metodo, cuerpo) {
  let respuesta
  try {
    respuesta = await fetch('/api/sesion', {
      method: metodo,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...HEADERS_BASE, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  const datos = await leerJson(respuesta)
  if (!respuesta.ok) {
    const error = datos?.error
    throw new ApiError({
      status: respuesta.status,
      codigo: error?.codigo ?? (respuesta.status >= 500 ? 'API_NO_DISPONIBLE' : 'RESPUESTA_INESPERADA'),
      mensaje: error?.mensaje ?? (respuesta.status >= 500 ? MENSAJE_API_NO_DISPONIBLE : `El API respondió ${respuesta.status}.`),
    })
  }
  return datos
}

export const entrar = ({ usuario, clave }) => pedirSesion('POST', { usuario, clave })

export const salir = () => pedirSesion('DELETE')

// Ruta a la que se vuelve después de entrar. Solo rutas propias ("/algo"), nunca otro sitio
// ("//otro.com" o "/\otro.com"): evita una redirección abierta.
export function rutaSegura(valor) {
  if (typeof valor !== 'string' || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return '/'
  if (valor.startsWith('/entrar')) return '/'
  return valor
}

export function urlEntrar(ruta = window.location.pathname + window.location.search) {
  const volver = rutaSegura(ruta)
  return volver === '/' ? '/entrar' : `/entrar?volver=${encodeURIComponent(volver)}`
}

// Si el API dice que la sesión venció (401 SESION_REQUERIDA) en el sitio interno, vuelve a /entrar.
export function siSesionVencida(error) {
  if (!__INTERNO__ || error?.status !== 401 || error?.codigo !== 'SESION_REQUERIDA') return
  if (window.location.pathname.startsWith('/entrar')) return
  window.location.assign(urlEntrar())
}
