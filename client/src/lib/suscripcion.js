// Lógica pura de la tarjeta "Alertas por correo" (#7): validar el correo, armar el cuerpo de
// POST /api/suscripciones y traducir los errores a mensajes claros. Sin DOM ni React, para probarla
// con node:test. Contrato: contracts/eventos-zapier.md (sección "Endpoints de suscripción").
import { ApiError } from '../api/errores.js'

// Mismo patrón que el server (automation/suscripciones.js): algo@dominio.ext, sin espacios.
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Largo máximo de una dirección de correo (RFC 5321).
export const LARGO_MAXIMO_CORREO = 254

export const MENSAJE_CORREO_INVALIDO = 'Escribe un correo válido, por ejemplo nombre@ejemplo.com.'

/** Mensaje de error si el correo no sirve, o null si es válido. */
export function validarCorreo(correo) {
  const limpio = String(correo ?? '').trim()
  if (limpio === '') return 'Escribe tu correo para suscribirte.'
  if (limpio.length > LARGO_MAXIMO_CORREO || !PATRON_CORREO.test(limpio)) return MENSAJE_CORREO_INVALIDO
  return null
}

const sinRepetir = (lista) => [...new Set((lista ?? []).map(String))]

/**
 * Cuerpo de POST /api/suscripciones. Una lista vacía significa "todos": el server la guarda así
 * y Zapier la entiende igual.
 */
export function cuerpoSuscripcion({ correo, bancos = [], rankings = [] }) {
  return { correo: String(correo ?? '').trim(), bancos: sinRepetir(bancos), rankings: sinRepetir(rankings) }
}

/**
 * Marca o desmarca `valor` y devuelve los elegidos en el orden de `opciones`
 * (las opciones son los valores del catálogo, en el orden en que se muestran).
 */
export function alternarElegido(elegidos, opciones, valor, marcado) {
  const conjunto = new Set(elegidos)
  if (marcado) conjunto.add(valor)
  else conjunto.delete(valor)
  return opciones.filter((opcion) => conjunto.has(opcion))
}

/** Texto junto al título de cada filtro: sin marcas significa todos. */
export function etiquetaSeleccion(cantidad) {
  if (cantidad === 0) return 'todos'
  return cantidad === 1 ? '1 elegido' : `${cantidad} elegidos`
}

const MENSAJE_LIMITE = 'Hiciste muchas solicitudes seguidas.'

/**
 * Completa un 429 con los segundos de espera. El server ya los escribe en su mensaje; si el mensaje
 * no los trae (o el 429 vino de un proxy sin el formato común de errores) se arman con el header
 * Retry-After. Cualquier otro error pasa tal cual.
 * @param {ApiError} error error ya convertido desde la respuesta
 * @param {string | null | undefined} retryAfter valor del header Retry-After, en segundos
 */
export function conEspera(error, retryAfter) {
  if (error?.status !== 429) return error
  const delServer = error.codigo === 'DEMASIADOS_PEDIDOS' && /segundo/i.test(error.mensaje ?? '')
  if (delServer) return error

  const segundos = /^\d+$/.test(String(retryAfter ?? '').trim()) ? Number(retryAfter) : 0
  const espera = segundos > 0 ? `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}` : 'unos minutos'
  const base = error.codigo === 'DEMASIADOS_PEDIDOS' && error.mensaje ? error.mensaje : MENSAJE_LIMITE
  return new ApiError({
    status: 429,
    codigo: 'DEMASIADOS_PEDIDOS',
    mensaje: `${base} Espera ${espera} y vuelve a intentar.`,
    detalles: error.detalles,
  })
}

/** Texto que ve la persona cuando falla la solicitud (400, 429, API caída u otro error). */
export function mensajeDeSuscripcion(error) {
  if (error?.codigo === 'API_NO_DISPONIBLE') {
    return 'No hay conexión con el servidor. Revisa tu conexión y vuelve a intentarlo en unos minutos.'
  }
  const mensaje = error?.mensaje ?? error?.message
  return mensaje || 'No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos.'
}
