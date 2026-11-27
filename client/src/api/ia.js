// Cliente de los endpoints de IA (contracts/ia.md, issues #2, #3 y #62).
// La IA explica y consulta lo que calcula el motor; nunca calcula. Aquí solo se piden sus respuestas.
//
// api/cliente.js solo hace GET y guarda el perfil por dentro, así que este archivo tiene su propio
// fetch: mismo formato de errores (ApiError), mismo header X-Perfil y mismo registro de fuente y aviso.
// El perfil llega como opción desde el componente (usePerfil()).
//
// Modo mock: con `npm run dev` y VITE_USAR_MOCKS=true responde api/mocksIa.js. El build de
// producción no incluye ese código ni sus textos (regla R2).
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { registrarFuente } from './fuente.js'

const BASE = '/api'

// Límites del backend (server/src/routes/ia.js).
export const MAX_PREGUNTA = 500
export const MAX_HISTORIAL = 6
export const MAX_TEXTO_HISTORIAL = 4000

// Textos de respaldo por si la respuesta no trae `etiqueta` (contracts/ia.md).
export const ETIQUETA_RESPUESTA = 'Respuesta generada con IA · los cálculos provienen del motor determinista'
export const ETIQUETA_EXPLICACION = 'Explicación generada con IA · los cálculos provienen del motor determinista'

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
  if (respuesta.status >= 500) {
    return new ApiError({ status: respuesta.status, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  return new ApiError({
    status: respuesta.status,
    codigo: 'RESPUESTA_INESPERADA',
    mensaje: `El API respondió ${respuesta.status} sin el formato de error esperado.`,
  })
}

async function pedirIA(ruta, { metodo = 'GET', parametros, cuerpo, perfil = 'publico', signal } = {}) {
  if (import.meta.env.DEV && import.meta.env.VITE_USAR_MOCKS === 'true') {
    const { responderConMockIA } = await import('./mocksIa.js')
    const datos = await responderConMockIA(ruta, { parametros, cuerpo, perfil, signal })
    registrarFuente(datos)
    return datos
  }

  const headers = { Accept: 'application/json', 'X-Perfil': perfil || 'publico' }
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}${construirQuery(parametros)}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }

  const datos = await leerCuerpo(respuesta)
  if (!respuesta.ok) throw errorDeRespuesta(respuesta, datos)
  if (datos === null) {
    throw new ApiError({
      status: respuesta.status,
      codigo: 'RESPUESTA_INESPERADA',
      mensaje: 'El API respondió sin un JSON válido.',
    })
  }
  registrarFuente(datos)
  return datos
}

// GET /api/ia/estado -> { ia_disponible, modelo }
export const estadoIA = (opciones = {}) => pedirIA('/ia/estado', opciones)

// GET /api/explicaciones (mismos parámetros que /api/movimientos). Público recibe 403.
export const explicaciones = ({ desde, hasta, ranking } = {}, opciones = {}) =>
  pedirIA('/explicaciones', { ...opciones, parametros: { desde, hasta, ranking } })

// POST /api/ia/preguntar. historial: [{ rol: 'usuario' | 'asistente', texto }], se mandan los últimos 6.
export function preguntar({ pregunta, historial = [] } = {}, opciones = {}) {
  const turnos = historial
    .filter((turno) => (turno.rol === 'usuario' || turno.rol === 'asistente') && typeof turno.texto === 'string' && turno.texto.trim())
    .slice(-MAX_HISTORIAL)
    .map(({ rol, texto }) => ({ rol, texto: texto.slice(0, MAX_TEXTO_HISTORIAL) }))
  return pedirIA('/ia/preguntar', {
    ...opciones,
    metodo: 'POST',
    cuerpo: { pregunta: String(pregunta ?? '').trim(), historial: turnos },
  })
}
