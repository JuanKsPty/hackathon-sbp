// Llamadas de la página de Administración (#66). Todas exigen X-Perfil: admin en el backend.
//   POST /api/periodos        carga de un AT03 (contracts/carga.md, #29)
//   GET/PUT /api/parametros   regla de movimiento significativo (contracts/administracion.md, #30)
//   GET /api/admin/catalogos  estado de los catálogos (#30)
//   GET /api/bitacora         registro de operaciones (contracts/bitacora.md, #31)
// cliente.js solo hace GET con el perfil global; aquí el perfil se pasa explícito y se permiten
// POST y PUT. Los errores llegan como ApiError, igual que en cliente.js.
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from './errores.js'
import { registrarFuente } from './fuente.js'

const BASE = '/api'

async function leerJson(respuesta) {
  const texto = await respuesta.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

// Convierte una respuesta no exitosa en ApiError (formato común { error: { codigo, mensaje, detalles } }).
function errorDe(respuesta, cuerpo) {
  const error = cuerpo?.error
  if (error?.codigo) {
    return new ApiError({ status: respuesta.status, codigo: error.codigo, mensaje: error.mensaje, detalles: error.detalles })
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

async function pedirComo(perfil, ruta, { metodo = 'GET', headers = {}, cuerpo, signal } = {}) {
  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { Accept: 'application/json', 'X-Perfil': perfil, ...headers },
      body: cuerpo,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  }
  const datos = await leerJson(respuesta)
  if (!respuesta.ok) throw errorDe(respuesta, datos)
  if (datos === null) {
    throw new ApiError({ status: respuesta.status, codigo: 'RESPUESTA_INESPERADA', mensaje: 'El API respondió sin un JSON válido.' })
  }
  registrarFuente(datos)
  return datos
}

// Sube el AT03 como texto (contracts/carga.md). archivo es un File del <input type="file">.
export async function cargarPeriodo(perfil, archivo) {
  return pedirComo(perfil, '/periodos', {
    metodo: 'POST',
    headers: { 'Content-Type': 'text/csv', 'X-Nombre-Archivo': encodeURIComponent(archivo.name) },
    cuerpo: await archivo.text(),
  })
}

export const leerParametros = (perfil, opciones) => pedirComo(perfil, '/parametros', opciones)

// regla: { min_cambio_posicion_abs, cambio_lider, min_var_saldo_pct_abs }
export const guardarParametros = (perfil, regla) =>
  pedirComo(perfil, '/parametros', {
    metodo: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    cuerpo: JSON.stringify({ regla_significativo: regla }),
  })

export const leerCatalogosAdmin = (perfil, opciones) => pedirComo(perfil, '/admin/catalogos', opciones)

export const leerBitacora = (perfil, opciones) => pedirComo(perfil, '/bitacora', opciones)
