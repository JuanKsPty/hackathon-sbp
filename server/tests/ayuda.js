// Utilidades compartidas por las pruebas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { procesarCarpeta, leerCatalogosDeCarpeta } from '../src/datos/paquete.js';

export const CARPETA_DATOS = fileURLToPath(new URL('../../data/', import.meta.url));
export const CARPETA_REFERENCIA = fileURLToPath(new URL('./referencia/', import.meta.url));

// Filas de un CSV de tests/referencia (cálculo de control propio, no la clave oficial), como texto.
// Las pruebas comparan contra estos archivos en lugar de escribir cifras a mano (R2).
export function leerReferencia(archivo) {
  return parse(fs.readFileSync(path.join(CARPETA_REFERENCIA, archivo), 'utf8'), { columns: true });
}

// Los tres períodos reales se procesan una sola vez por archivo de prueba.
let paquete;
export function paqueteReal() {
  paquete ??= procesarCarpeta(CARPETA_DATOS);
  return paquete;
}

let catalogos;
export function catalogosReales() {
  catalogos ??= leerCatalogosDeCarpeta(CARPETA_DATOS);
  return catalogos;
}

// Valor por defecto válido para cada tipo del diccionario (para armar filas de prueba).
function valorPorDefecto(tipo) {
  if (tipo.startsWith('Fecha')) return '20260731';
  if (tipo === 'Numerico (Decimal)') return '0.00';
  if (tipo === 'Numerico (Entero)') return '0';
  return 'NA';
}

// Fila AT03 sintética con los 61 campos; `cambios` sobrescribe los que importan en la prueba.
export function filaSintetica(cambios = {}) {
  const base = {};
  for (const { campo, tipo } of catalogosReales().campos) base[campo] = valorPorDefecto(tipo);
  return {
    ...base,
    Codigo_Banco: '101',
    Facilidad_Crediticia: '01',
    Destino: 'L',
    Tipo_Actividad: 'L.68.681.6810.00000',
    Saldo: '100.00',
    ...cambios,
  };
}

// Convierte objetos de datos en filas del motor: [{ numeroFila, datos }].
export function comoFilas(listaDeDatos) {
  return listaDeDatos.map((datos, i) => ({ numeroFila: i + 2, datos }));
}

// Arma el texto de un CSV a partir de encabezados y filas (sin comillas: solo para pruebas).
export function textoCsv(encabezados, listaDeDatos) {
  const lineas = [encabezados.join(',')];
  for (const datos of listaDeDatos) lineas.push(encabezados.map((c) => datos[c]).join(','));
  return lineas.join('\r\n') + '\r\n';
}
