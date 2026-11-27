// Fuente y aviso que se muestran siempre en pantalla (lámina 9).
// Cada respuesta del API trae `fuente` y `aviso`; el cliente guarda los últimos que llegaron
// y la BarraFuente los lee con useFuente(). Si el API no responde, se usan los textos de respaldo.
import { useSyncExternalStore } from 'react'

export const FUENTE_RESPALDO = 'AT03 sintético · Hackathon SBP 2026'
export const AVISO_RESPALDO = 'Datos ficticios · Uso informativo, no opinión formal de la SBP'

let actual = { fuente: FUENTE_RESPALDO, aviso: AVISO_RESPALDO }
const suscriptores = new Set()

export function registrarFuente(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return
  const fuente = typeof cuerpo.fuente === 'string' && cuerpo.fuente ? cuerpo.fuente : actual.fuente
  const aviso = typeof cuerpo.aviso === 'string' && cuerpo.aviso ? cuerpo.aviso : actual.aviso
  if (fuente === actual.fuente && aviso === actual.aviso) return
  actual = { fuente, aviso }
  suscriptores.forEach((avisar) => avisar())
}

function suscribir(avisar) {
  suscriptores.add(avisar)
  return () => suscriptores.delete(avisar)
}

export function useFuente() {
  return useSyncExternalStore(suscribir, () => actual)
}
