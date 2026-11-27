// Ejecutor de acciones de pantalla (#122), sin React ni DOM para probarlo con node --test.
// Recibe las acciones de `pantalla` (POST /api/ia/preguntar, #121) y las aplica en orden sobre los
// controles registrados. Guarda el estado previo de cada control para poder deshacer.
import { necesitaNavegar } from '../guia/motor.js'

const HANDLER_POR_TIPO = {
  elegir: (h, a) => h.elegir?.(a.valor),
  ordenar: (h, a) => h.ordenar?.(a.columna, a.orden),
  resaltar: (h, a) => h.resaltar?.(a.fila),
  señalar: () => {},
}

/**
 * @param {Array} acciones acciones validadas por el backend
 * @param {object} deps
 * @param {object} deps.registro registro de controles (registro.js)
 * @param {(ruta: string) => void} deps.navegar cambia de página
 * @param {() => string} deps.rutaActual página actual
 * @param {AbortSignal} [deps.signal] para cancelar a mitad de camino
 * @param {(accion, handlers) => Promise<void>} [deps.antesDe] se espera antes de aplicar cada acción
 *   (la demostración lo usa para llevar el cursor hasta el control)
 * @param {number} [deps.timeout] cuánto esperar a que aparezca cada control
 * @returns {Promise<{ aplicadas, fallidas, deshacer }>}
 */
export async function ejecutarAcciones(acciones, { registro, navegar, rutaActual, signal, antesDe, timeout } = {}) {
  const deshacer = { rutaInicial: rutaActual(), estados: [] }
  const guardados = new Set()
  const aplicadas = []
  const fallidas = []
  // Ruta a la que se navegó: el router la informa un instante después, así no se navega dos veces.
  let ruta = rutaActual()

  for (const accion of acciones) {
    if (signal?.aborted) break
    // Cambiar de página: antes, la demostración lleva el cursor al menú (también si la navegación
    // está implícita en una acción de otra página).
    if (accion.ruta && necesitaNavegar(accion, ruta)) {
      await antesDe?.(accion.tipo === 'ir' ? accion : { tipo: 'ir', ruta: accion.ruta, texto: '' }, null)
      if (signal?.aborted) break
      navegar(accion.ruta)
      ruta = accion.ruta
    }
    if (accion.tipo === 'ir') {
      aplicadas.push(accion)
      continue
    }

    const handlers = await registro.esperar(accion.control, { signal, timeout })
    if (!handlers) {
      if (!signal?.aborted) fallidas.push({ accion, motivo: 'no-encontrado' })
      continue
    }
    // Estado previo de cada control, una sola vez (el primero es el que se restaura).
    if (!guardados.has(accion.control) && handlers.estado) {
      guardados.add(accion.control)
      deshacer.estados.push({ control: accion.control, estado: handlers.estado() })
    }
    await antesDe?.(accion, handlers)
    if (signal?.aborted) break
    HANDLER_POR_TIPO[accion.tipo]?.(handlers, accion)
    aplicadas.push(accion)
  }
  return { aplicadas, fallidas, deshacer }
}

/**
 * Deshace una ejecución: restaura el estado previo de cada control (del último al primero) que siga
 * en pantalla y vuelve a la página donde estaba el usuario.
 */
export function deshacerAcciones(deshacer, { registro, navegar, rutaActual }) {
  if (!deshacer) return
  for (const { control, estado } of [...deshacer.estados].reverse()) {
    registro.obtener(control)?.restaurar?.(estado)
  }
  if (deshacer.rutaInicial && rutaActual() !== deshacer.rutaInicial) navegar(deshacer.rutaInicial)
}
