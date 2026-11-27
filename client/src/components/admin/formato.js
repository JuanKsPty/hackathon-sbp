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
  inicio_sesion: 'Inicio de sesión',
  cierre_sesion: 'Cierre de sesión',
  cambio_permisos: 'Cambio de permisos',
  restablecer_permisos: 'Permisos por defecto',
  alta_usuario: 'Alta de usuario',
  cambio_usuario: 'Cambio de usuario',
  suscripcion: 'Suscripción a alertas',
  evento_zapier: 'Aviso por correo (Zapier)',
}

// Grupos de operaciones para el filtro de la bitácora.
export const GRUPOS_OPERACION = [
  { valor: 'datos', nombre: 'Cargas de datos', operaciones: ['carga_inicial', 'carga_periodo'] },
  { valor: 'configuracion', nombre: 'Parámetros y permisos', operaciones: ['cambio_parametros', 'cambio_permisos', 'restablecer_permisos'] },
  { valor: 'usuarios', nombre: 'Usuarios y sesiones', operaciones: ['alta_usuario', 'cambio_usuario', 'inicio_sesion', 'cierre_sesion'] },
  { valor: 'accesos', nombre: 'Accesos denegados', operaciones: ['acceso_denegado'] },
  { valor: 'alertas', nombre: 'Alertas por correo', operaciones: ['suscripcion', 'evento_zapier'] },
]

// Fecha corta para tablas ('27 nov 2026'); null o vacío -> 'Nunca'.
const fechaCorta = new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export function formatearFechaCorta(iso, siVacio = 'Nunca') {
  if (!iso) return siVacio
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fechaCorta.format(fecha)
}

// Celda de CSV con comillas si hace falta.
const celdaCsv = (valor) => {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[",\n;]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

// Descarga un CSV armado en el navegador (UTF-8 con BOM, para que Excel lea las tildes).
export function descargarCsv(nombreArchivo, columnas, filas) {
  const lineas = [columnas.map((c) => celdaCsv(c.titulo)).join(','), ...filas.map((f) => columnas.map((c) => celdaCsv(c.valor(f))).join(','))]
  const blob = new Blob([`\uFEFF${lineas.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Contraseña aleatoria para un usuario nuevo o restablecido: 16 caracteres sin ambiguos (0/O, 1/l).
export function generarClave(largo = 16) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const azar = crypto.getRandomValues(new Uint32Array(largo))
  return Array.from(azar, (n) => letras[n % letras.length]).join('')
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
