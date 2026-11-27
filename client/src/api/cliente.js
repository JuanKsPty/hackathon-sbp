// Cliente del API del backend. Todas las rutas cuelgan de /api (en desarrollo Vite las pasa al
// server; en Docker lo hace nginx). Los contratos de cada respuesta están en /contracts.
//
// - Cada petición manda el perfil elegido en el header X-Perfil (contracts/perfiles.md).
// - Los errores llegan como ApiError (status, codigo, mensaje, detalles).
// - Si no hay conexión con el API: codigo 'API_NO_DISPONIBLE'.
// - Modo mock (solo en `npm run dev` con VITE_USAR_MOCKS=true): responde con los ejemplos de
//   /contracts. El build de producción no incluye ese código ni esos datos (regla R2).
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { registrarFuente } from './fuente.js'

export { ApiError } from './errores.js'

const BASE = '/api'

let perfilActual = 'publico'

// Lo llama PerfilContext cada vez que cambia el perfil.
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
    const cuerpo = await responderConMock(ruta, parametros)
    registrarFuente(cuerpo)
    return cuerpo
  }

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}${construirQuery(parametros)}`, {
      headers: { Accept: 'application/json', 'X-Perfil': perfilActual },
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }

  const cuerpo = await leerCuerpo(respuesta)
  if (!respuesta.ok) throw errorDeRespuesta(respuesta, cuerpo)
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

// Perfil actual, sus opciones y la lista de perfiles (contracts/perfiles.md, #28). Lo usará el selector (#4).
export const perfil = (opciones) => pedir('/perfil', undefined, opciones)

// ---- Descargas CSV (contracts/exportaciones.md) ----

export const DESCARGAS = ['rankings', 'subactividades', 'calidad', 'excluidas', 'alertas', 'movimientos']

// URL para un <a href download>. Sin periodo, el CSV trae todos los períodos (_todos.csv).
// movimientos acepta desde, hasta, ranking y solo_significativos.
// Ojo: un enlace no manda X-Perfil; si una descarga llega a exigir perfil, hay que pedirla con fetch.
export function urlDescarga(tipo, parametros = {}) {
  if (!DESCARGAS.includes(tipo)) {
    throw new ApiError({
      codigo: 'PARAMETRO_INVALIDO',
      mensaje: `No existe la descarga "${tipo}". Opciones: ${DESCARGAS.join(', ')}.`,
    })
  }
  return `${BASE}/exportar/${tipo}.csv${construirQuery(parametros)}`
}
