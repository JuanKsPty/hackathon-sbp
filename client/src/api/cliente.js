// Cliente del API del backend. Todas las rutas cuelgan de /api (en desarrollo Vite las pasa al
// server; en Docker lo hace nginx). Los contratos de cada respuesta están en /contracts.
//
// - El perfil sale de la sesión (cookie HttpOnly del sitio interno); el sitio público siempre es Público.
// - Cada petición manda X-Sbp: 1 (el server lo exige en POST, PUT y DELETE contra CSRF).
// - Los errores llegan como ApiError (status, codigo, mensaje, detalles).
// - Si no hay conexión con el API: codigo 'API_NO_DISPONIBLE'.
// - Modo mock (solo en `npm run dev` con VITE_USAR_MOCKS=true): responde con los ejemplos de
//   /contracts. El build de producción no incluye ese código ni esos datos (regla R2).
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { registrarFuente } from './fuente.js'
import { HEADERS_BASE, siSesionVencida } from './sesion.js'

export { ApiError } from './errores.js'

const BASE = '/api'

let perfilActual = 'publico'

// Lo llama PerfilContext con el perfil de la sesión; solo lo usa el modo mock.
export function fijarPerfilDePeticiones(perfil) {
  perfilActual = perfil || 'publico'
}

// Arma la query solo con los parámetros que tienen valor (undefined, null y '' no se mandan).
function construirQuery(parametros = {}) {
  const query = new URLSearchParams()
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null || valor === '') continue
    query.set(nombre, String(valor))
  }
  const texto = query.toString()
  return texto ? `?${texto}` : ''
}

async function leerCuerpo(respuesta) {
  const texto = await respuesta.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

function errorDeRespuesta(respuesta, cuerpo) {
  const error = cuerpo?.error
  if (error?.codigo) {
    return new ApiError({
      status: respuesta.status,
      codigo: error.codigo,
      mensaje: error.mensaje ?? 'El API respondió con un error.',
      detalles: error.detalles,
    })
  }
  // Sin el formato común: el proxy (Vite o nginx) no llegó al backend, o algo inesperado.
  if (respuesta.status >= 500) {
    return new ApiError({ status: respuesta.status, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  return new ApiError({
    status: respuesta.status,
    codigo: 'RESPUESTA_INESPERADA',
    mensaje: `El API respondió ${respuesta.status} sin el formato de error esperado.`,
  })
}

async function pedir(ruta, parametros, { signal } = {}) {
  if (import.meta.env.DEV && import.meta.env.VITE_USAR_MOCKS === 'true') {
    const { responderConMock } = await import('./mocks.js')
    const cuerpo = await responderConMock(ruta, parametros, perfilActual)
    registrarFuente(cuerpo)
    return cuerpo
  }

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}${construirQuery(parametros)}`, {
      headers: { Accept: 'application/json', ...HEADERS_BASE },
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }

  const cuerpo = await leerCuerpo(respuesta)
  if (!respuesta.ok) {
    const error = errorDeRespuesta(respuesta, cuerpo)
    siSesionVencida(error)
    throw error
  }
  if (cuerpo === null) {
    throw new ApiError({
      status: respuesta.status,
      codigo: 'RESPUESTA_INESPERADA',
      mensaje: 'El API respondió sin un JSON válido.',
    })
  }
  registrarFuente(cuerpo)
  return cuerpo
}

// ---- Endpoints (contracts/consulta.md) ----

export const salud = (opciones) => pedir('/salud', undefined, opciones)

export const periodos = (opciones) => pedir('/periodos', undefined, opciones)

export const catalogos = (opciones) => pedir('/catalogos', undefined, opciones)

export const rankings = ({ periodo, ranking, banco } = {}, opciones) =>
  pedir('/rankings', { periodo, ranking, banco }, opciones)

export const subactividades = ({ periodo, ranking, banco, subactividad } = {}, opciones) =>
  pedir('/subactividades', { periodo, ranking, banco, subactividad }, opciones)

// Sin periodo devuelve todos los períodos.
export const calidad = ({ periodo } = {}, opciones) => pedir('/calidad', { periodo }, opciones)

export const excluidas = ({ periodo, motivo, banco } = {}, opciones) =>
  pedir('/excluidas', { periodo, motivo, banco }, opciones)

// contracts/movimientos.json (#1, #32)
export const movimientos = ({ desde, hasta, ranking, solo_significativos } = {}, opciones) =>
  pedir('/movimientos', { desde, hasta, ranking, solo_significativos }, opciones)

// contracts/indicadores.md (#35): morosidad, vencimientos y concentración. Análisis adicional: no forma
// parte de los 6 rankings oficiales. Abierto a los 3 perfiles.
export const indicadores = ({ periodo, ranking } = {}, opciones) =>
  pedir('/indicadores', { periodo, ranking }, opciones)

// Por qué se movió el saldo de cada banco entre dos períodos: préstamos nuevos, que salen y
// amortización (contracts/consulta.md, #61). Como /movimientos, es de Analista y Administrador.
// evidencia=true exige ranking y banco.
export const movimientosDescomposicion = ({ desde, hasta, ranking, banco, evidencia } = {}, opciones) =>
  pedir('/movimientos/descomposicion', { desde, hasta, ranking, banco, evidencia: evidencia ? 'true' : undefined }, opciones)

// contracts/verificacion.json (#63): un dato de cada punto de la sección 11.1 con sus chequeos.
// periodo (puntos 2 a 5; por defecto el último) y banco acotan los datos; los chequeos usan todos los bancos.
export const verificacion = ({ periodo, banco } = {}, opciones) => pedir('/verificacion', { periodo, banco }, opciones)

// Perfil actual, sus opciones y la lista de perfiles (contracts/perfiles.md, #28). Lo usa PerfilContext
// para armar el selector y el menú.
export const perfil = (opciones) => pedir('/perfil', undefined, opciones)

// ---- Descargas CSV (contracts/exportaciones.md) ----

export const DESCARGAS = ['rankings', 'subactividades', 'calidad', 'excluidas', 'alertas', 'movimientos']

// URL para un <a href download>. Sin periodo, el CSV trae todos los períodos (_todos.csv).
// movimientos acepta desde, hasta, ranking y solo_significativos.
// Un enlace manda la cookie de sesión (mismo origen), pero no X-Sbp; basta para un GET.
export function urlDescarga(tipo, parametros = {}) {
  if (!DESCARGAS.includes(tipo)) {
    throw new ApiError({
      codigo: 'PARAMETRO_INVALIDO',
      mensaje: `No existe la descarga "${tipo}". Opciones: ${DESCARGAS.join(', ')}.`,
    })
  }
  return `${BASE}/exportar/${tipo}.csv${construirQuery(parametros)}`
}

// Descarga con fetch, para las descargas que exigen perfil: movimientos.csv
// (entregable 5) y personalizado.csv. Si el API responde error, lanza ApiError como pedir().
export async function descargarArchivo(ruta, parametros = {}) {
  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}${construirQuery(parametros)}`, { headers: { ...HEADERS_BASE } })
  } catch {
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  if (!respuesta.ok) {
    const cuerpo = await leerCuerpo(respuesta)
    const error = errorDeRespuesta(respuesta, cuerpo)
    siSesionVencida(error)
    throw error
  }
  const blob = await respuesta.blob()
  const disposicion = respuesta.headers.get('Content-Disposition') ?? ''
  const nombre = /filename="?([^";]+)"?/i.exec(disposicion)?.[1] ?? ruta.split('/').at(-1)
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

// Parámetros del reporte personalizado: cada lista va separada por comas; una lista vacía no se
// manda (el API entiende "todos").
export function parametrosPersonalizado({ periodos = [], rankings = [], bancos = [] } = {}) {
  const unir = (lista) => (lista.length > 0 ? lista.join(',') : undefined)
  return { periodos: unir(periodos), rankings: unir(rankings), bancos: unir(bancos) }
}
