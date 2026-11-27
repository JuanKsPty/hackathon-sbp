// Reporte por correo con Zapier (#7): POST /api/reportes/correo manda el reporte de un corte a un correo.
// El server arma el evento y lo manda a Zapier; aquí solo se envía el correo y el corte elegidos.
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { HEADERS_BASE } from './sesion.js'

export async function enviarReporte({ correo, periodo }) {
  let respuesta
  try {
    respuesta = await fetch('/api/reportes/correo', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...HEADERS_BASE },
      body: JSON.stringify({ correo, periodo }),
    })
  } catch {
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new ApiError({
      status: respuesta.status,
      codigo: datos?.error?.codigo ?? 'ERROR',
      mensaje: datos?.error?.mensaje ?? 'No pudimos enviar el reporte.',
    })
  }
  return datos
}
