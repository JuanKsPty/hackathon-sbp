// Textos y formatos propios de la página de Administración.
import { NOMBRES_PERFIL } from '@/contexto/PerfilContext.jsx'

const fechaHora = new Intl.DateTimeFormat('es-PA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

// ISO 8601 -> fecha y hora local, con el mes en letras como el resto de la app ('27 nov 2026, 10:31:57 a. m.').
export function formatearFechaHora(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso ?? '—'
  return fechaHora.format(fecha)
}

// Perfiles de la bitácora: los 3 de la app más "sistema" (la carga inicial al arrancar el servidor).
export const NOMBRES_PERFIL_BITACORA = { ...NOMBRES_PERFIL, sistema: 'Sistema' }

// Nombres para mostrar de las operaciones de la bitácora (contracts/bitacora.md).
export const NOMBRES_OPERACION = {
  carga_inicial: 'Carga inicial',
  carga_periodo: 'Carga de período',
  cambio_parametros: 'Cambio de parámetros',
  acceso_denegado: 'Acceso denegado',
}

export const NOMBRES_RESULTADO = {
  exito: 'Éxito',
  error: 'Error',
  rechazado: 'Rechazado',
}

// Clases de color del tema (styles/tema.css) para cada resultado.
export const COLOR_RESULTADO = {
  exito: 'bg-sube-fondo text-sube',
  error: 'bg-baja-fondo text-baja',
  rechazado: 'bg-igual-fondo text-igual',
}
