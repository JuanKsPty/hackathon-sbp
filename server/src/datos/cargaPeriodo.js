// Carga de un período nuevo desde la pantalla del Administrador (#29, entregable 7).
// No usa Express: recibe el texto del AT03 y el nombre del archivo, lo valida y lo procesa con
// el motor, guarda una copia en storage/periodos/ (ignorado por git) y publica el resultado en el almacén.
// Al arrancar, recargarPeriodosGuardados vuelve a leer esas copias: lo cargado no se pierde al reiniciar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { procesarArchivo, ErrorDeDatos } from '../engine/index.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// storage/ está en la raíz del repo. STORAGE_DIR permite cambiarla (las pruebas usan una carpeta temporal).
export const CARPETA_STORAGE = path.resolve(process.env.STORAGE_DIR ?? path.join(aqui, '..', '..', '..', 'storage'));

export const carpetaDePeriodos = (carpetaStorage = CARPETA_STORAGE) => path.join(carpetaStorage, 'periodos');

// Las copias se llaman "<marca de carga>__<nombre original>", por ejemplo
// "1795793400123__AT03_sintetico_202609.csv". Ordenadas por nombre, quedan en orden de carga.
const SEPARADOR = '__';

// Deja solo el nombre del archivo (sin carpetas) y cambia los caracteres raros por "_",
// porque ese nombre se usa para guardar la copia en disco.
export function limpiarNombreArchivo(nombreArchivo) {
  const nombre = path.basename(String(nombreArchivo ?? '').trim()).replace(/[^\w.-]/g, '_');
  if (nombre === '' || nombre === '.' || nombre === '..') {
    throw new ErrorDeDatos('Falta el nombre del archivo.');
  }
  if (!/\.csv$/i.test(nombre)) {
    throw new ErrorDeDatos(`${nombre} no es un archivo .csv.`, ['Sube el AT03 en formato CSV.']);
  }
  return nombre;
}

// Valida y procesa el texto con el motor (61 columnas, Fecha y Saldo válidos, cascada, rankings...).
// Si el archivo es inválido lanza ErrorDeDatos con el mensaje y los detalles del motor.
export function procesarTextoAT03(texto, nombreArchivo, catalogos) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new ErrorDeDatos(`${nombreArchivo} está vacío.`);
  }
  return procesarArchivo(texto, catalogos, { nombreArchivo });
}

// Marca de carga: milisegundos desde 1970 (13 dígitos). Si dos cargas caen en el mismo milisegundo,
// la segunda recibe el siguiente: así el orden por nombre siempre es el orden de carga.
let ultimaMarca = 0;
function marcaDeCarga() {
  ultimaMarca = Math.max(Date.now(), ultimaMarca + 1);
  return String(ultimaMarca);
}

// Guarda una copia del archivo tal como llegó y devuelve el nombre de la copia.
export function guardarCopia(texto, nombreArchivo, carpetaStorage = CARPETA_STORAGE) {
  const carpeta = carpetaDePeriodos(carpetaStorage);
  fs.mkdirSync(carpeta, { recursive: true });
  const copia = `${marcaDeCarga()}${SEPARADOR}${nombreArchivo}`;
  fs.writeFileSync(path.join(carpeta, copia), texto, 'utf8');
  return copia;
}

// Período cargado justo antes de esta Fecha (contra el que se comparan los rankings), o null.
export function periodoAnterior(almacen, fecha) {
  const previa = almacen.fechas().filter((f) => f < fecha).at(-1);
  return previa ? almacen.obtener(previa) : null;
}

// Carga completa: validar y procesar, guardar la copia y publicar en el almacén.
// Primero se valida: un archivo inválido no se guarda ni cambia lo que ya estaba cargado.
// Un período con una Fecha ya cargada la reemplaza y se informa como ACTUALIZACION.
export function cargarPeriodo(almacen, texto, nombreArchivo, { carpetaStorage = CARPETA_STORAGE } = {}) {
  const archivo = limpiarNombreArchivo(nombreArchivo);
  const periodos = procesarTextoAT03(texto, archivo, almacen.catalogos);
  const copia = guardarCopia(texto, archivo, carpetaStorage);

  const cargados = periodos.map((periodo) => {
    const accion = almacen.obtener(periodo.fecha) ? 'ACTUALIZACION' : 'NUEVO';
    almacen.guardar(periodo);
    return { periodo, accion, anterior: periodoAnterior(almacen, periodo.fecha) };
  });
  return { archivo, copia, periodos: cargados };
}

// Nombre original de una copia: "1795793400123__AT03.csv" -> "AT03.csv".
export function nombreOriginal(copia) {
  const inicio = copia.indexOf(SEPARADOR);
  return inicio === -1 ? copia : copia.slice(inicio + SEPARADOR.length);
}

// Al arrancar, después de procesar data/: vuelve a cargar las copias en el orden en que se subieron.
// Si dos copias traen la misma Fecha, queda la más reciente. Una copia que ya no se puede
// procesar no detiene el arranque: se informa en los avisos.
export function recargarPeriodosGuardados(almacen, carpetaStorage = CARPETA_STORAGE) {
  const carpeta = carpetaDePeriodos(carpetaStorage);
  const recargados = [];
  const avisos = [];
  if (!fs.existsSync(carpeta)) return { recargados, avisos };

  const copias = fs.readdirSync(carpeta).filter((nombre) => /\.csv$/i.test(nombre)).sort();
  for (const copia of copias) {
    try {
      const texto = fs.readFileSync(path.join(carpeta, copia), 'utf8');
      for (const periodo of procesarTextoAT03(texto, nombreOriginal(copia), almacen.catalogos)) {
        almacen.guardar(periodo);
        recargados.push(periodo.fecha);
      }
    } catch (error) {
      avisos.push(`No se pudo recargar ${copia}: ${error.message}`);
    }
  }
  return { recargados, avisos };
}
