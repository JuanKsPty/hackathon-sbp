// Conversación del asistente IA. Vive en memoria mientras la pestaña esté abierta y la comparten
// todos los lugares donde se muestre el chat (la página /asistente o un panel lateral): si el
// usuario sigue un enlace de "Fuentes consultadas" y vuelve, la conversación sigue ahí, y la
// respuesta llega aunque haya cambiado de página. No se guarda en el navegador.
import { useSyncExternalStore } from 'react'
import { MAX_HISTORIAL, preguntar } from '@/api/ia.js'

let estado = { mensajes: [], pendiente: false }
let siguienteId = 1
let control = null
const suscriptores = new Set()

function publicar(nuevo) {
  estado = nuevo
  suscriptores.forEach((avisar) => avisar())
}

function agregar(mensaje) {
  publicar({ ...estado, mensajes: [...estado.mensajes, { id: siguienteId++, ...mensaje }] })
}

// Historial para POST /api/ia/preguntar: solo pares pregunta → respuesta con texto, para que los
// turnos alternen usuario/asistente. Las preguntas sin respuesta (error o IA no disponible) no se mandan.
export function historialDe(mensajes) {
  const turnos = []
  mensajes.forEach((mensaje, i) => {
    const siguiente = mensajes[i + 1]
    if (mensaje.rol === 'usuario' && siguiente?.rol === 'asistente' && siguiente.datos?.respuesta) {
      turnos.push({ rol: 'usuario', texto: mensaje.texto }, { rol: 'asistente', texto: siguiente.datos.respuesta })
    }
  })
  return turnos.slice(-MAX_HISTORIAL)
}

// Evento de cada pregunta nueva: la pantalla quita lo que el agente dejó resaltado.
export const NUEVA_PREGUNTA = 'agente:nueva-pregunta'

export async function enviarPregunta(pregunta, perfil) {
  const limpia = String(pregunta ?? '').trim()
  if (!limpia || estado.pendiente) return
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NUEVA_PREGUNTA))
  const historial = historialDe(estado.mensajes)
  agregar({ rol: 'usuario', texto: limpia })
  publicar({ ...estado, pendiente: true })

  const propio = new AbortController()
  control = propio
  try {
    const datos = await preguntar({ pregunta: limpia, historial }, { perfil, signal: propio.signal })
    if (!propio.signal.aborted) agregar({ rol: 'asistente', datos })
  } catch (error) {
    if (!propio.signal.aborted && error?.name !== 'AbortError') agregar({ rol: 'error', error })
  } finally {
    if (control === propio) {
      control = null
      publicar({ ...estado, pendiente: false })
    }
  }
}

// Vuelve a mandar la última pregunta (después de un error de conexión).
export function reintentarUltima(perfil) {
  if (estado.pendiente) return
  const indice = estado.mensajes.findLastIndex((m) => m.rol === 'usuario')
  if (indice < 0) return
  const pregunta = estado.mensajes[indice].texto
  publicar({ ...estado, mensajes: estado.mensajes.slice(0, indice) })
  enviarPregunta(pregunta, perfil)
}

export function borrarConversacion() {
  control?.abort()
  control = null
  publicar({ mensajes: [], pendiente: false })
}

function suscribir(avisar) {
  suscriptores.add(avisar)
  return () => suscriptores.delete(avisar)
}

export function useConversacion() {
  return useSyncExternalStore(suscribir, () => estado)
}
