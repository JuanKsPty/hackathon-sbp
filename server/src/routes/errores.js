// Formato común de errores de la API (contracts/README.md):
//   { "error": { "codigo": "PERIODO_SIN_DATOS", "mensaje": "...", "detalles": [...] } }
// "detalles" solo aparece cuando hay información adicional (por ejemplo, las filas de un archivo inválido).
import { ErrorDeDatos } from '../engine/index.js';

export class ErrorApi extends Error {
  constructor(status, codigo, mensaje, detalles = []) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function cuerpoDeError(codigo, mensaje, detalles = []) {
  const error = { codigo, mensaje };
  if (detalles.length > 0) error.detalles = detalles;
  return { error };
}

export function rutaNoEncontrada(req, res) {
  res.status(404).json(cuerpoDeError('RUTA_NO_ENCONTRADA', `No existe ${req.method} ${req.originalUrl}`));
}

// Middleware final de Express: convierte cualquier error en el formato común.
// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, req, res, next) {
  if (error instanceof ErrorApi) {
    return res.status(error.status).json(cuerpoDeError(error.codigo, error.message, error.detalles));
  }
  if (error instanceof ErrorDeDatos) {
    // Archivo AT03 o catálogo inválido (lo usa la carga de períodos)
    return res.status(422).json(cuerpoDeError('ARCHIVO_INVALIDO', error.message, error.detalles));
  }
  if (error.type === 'entity.too.large') {
    // Más grande que el límite: 50 MB en la carga de períodos (#29), 1 MB en los cuerpos JSON.
    const queCosa = req.originalUrl.startsWith('/api/periodos') ? 'El archivo' : 'El cuerpo de la petición';
    return res.status(413).json(cuerpoDeError('ARCHIVO_MUY_GRANDE', `${queCosa} supera el límite de ${Math.round(error.limit / 1048576)} MB.`));
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json(cuerpoDeError('JSON_INVALIDO', 'El cuerpo de la petición no es JSON válido.'));
  }
  if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') {
    return res.status(415).json(cuerpoDeError('FORMATO_NO_SOPORTADO', 'El cuerpo debe venir en UTF-8, sin comprimir.'));
  }
  if (error.expose && error.status >= 400 && error.status < 500) {
    // Otros errores de lectura del cuerpo (petición cortada, tamaño inválido...): 4xx sin detalles internos.
    return res.status(error.status).json(cuerpoDeError('PETICION_INVALIDA', 'No se pudo leer la petición.'));
  }
  // Error inesperado: el detalle (y la traza) solo va a la consola del servidor, nunca al cliente.
  console.error(error);
  return res.status(500).json(cuerpoDeError('ERROR_INTERNO', 'Ocurrió un error inesperado en el servidor.'));
}
