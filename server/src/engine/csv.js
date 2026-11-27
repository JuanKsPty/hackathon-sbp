// Lectura de CSV como texto puro: sin conversión de tipos y quitando el BOM.
// Así "07" sigue siendo "07" (no 7) y "NA" sigue siendo el texto "NA".
import { parse } from 'csv-parse/sync';

// Error con un mensaje claro para el usuario y una lista opcional de detalles.
export class ErrorDeDatos extends Error {
  constructor(mensaje, detalles = []) {
    super(mensaje);
    this.name = 'ErrorDeDatos';
    this.detalles = detalles;
  }
}

// Devuelve { encabezados: [...], filas: [{ numeroFila, datos: { campo: texto } }] }.
// numeroFila cuenta el encabezado como fila 1, igual que al abrir el archivo.
export function leerCsv(texto, nombreArchivo = 'archivo') {
  let registros;
  try {
    registros = parse(texto, { bom: true, cast: false, skip_empty_lines: true });
  } catch (error) {
    throw new ErrorDeDatos(`No se pudo leer ${nombreArchivo} como CSV.`, [error.message]);
  }
  if (registros.length === 0) {
    throw new ErrorDeDatos(`${nombreArchivo} está vacío.`);
  }
  const [encabezados, ...resto] = registros;
  const filas = resto.map((valores, indice) => ({
    numeroFila: indice + 2,
    datos: Object.fromEntries(encabezados.map((campo, i) => [campo, valores[i]])),
  }));
  return { encabezados, filas };
}

// Verifica que un catálogo traiga las columnas que el motor necesita.
export function exigirColumnas(encabezados, requeridas, nombreArchivo) {
  const faltantes = requeridas.filter((campo) => !encabezados.includes(campo));
  if (faltantes.length > 0) {
    throw new ErrorDeDatos(`${nombreArchivo} no tiene las columnas requeridas: ${faltantes.join(', ')}.`);
  }
}
