// Correos con Zapier (#7): suscribirse a las alertas y pedir el reporte de un corte por correo.
// El server arma el evento y lo manda a Zapier; aquí solo se envía el correo que escribió la persona.
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { HEADERS_BASE } from './sesion.js'

async function enviar(ruta, cuerpo) {
  let respuesta
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: 'POST',
      headers: { ...HEADERS_BASE, 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(cuerpo),
    })
  } catch {
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new ApiError({
      status: respuesta.status,
      codigo: datos?.error?.codigo ?? 'ERROR',
      mensaje: datos?.error?.mensaje ?? 'No pudimos completar el pedido.',
    })
  }
  return datos
}

// POST /api/suscripciones: Zapier manda un correo para confirmar (doble confirmación).
export const suscribirse = ({ correo }) => enviar('/suscripciones', { correo, bancos: [], rankings: [] })

// POST /api/reportes/correo: Zapier manda el reporte del corte a ese correo.
export const enviarReporte = ({ correo, periodo }) => enviar('/reportes/correo', { correo, periodo })
