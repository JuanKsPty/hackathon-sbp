// Error de la API con el formato común del backend:
//   { "error": { "codigo": "PERIODO_SIN_DATOS", "mensaje": "...", "detalles": [...] } }
// (contracts/consulta.md, sección Errores). status es 0 cuando no hubo respuesta HTTP.
export class ApiError extends Error {
  constructor({ status = 0, codigo, mensaje, detalles } = {}) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.mensaje = mensaje
    this.detalles = detalles
  }
}

export const MENSAJE_API_NO_DISPONIBLE =
  'No se pudo conectar con el API de datos. Revisa que el servidor esté encendido (npm run dev en la raíz del repo) y vuelve a intentarlo.'
