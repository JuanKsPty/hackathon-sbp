// Registro de operaciones (bitácora): qué se hizo, con qué archivo, cuándo, con qué perfil
// y con qué resultado. Cada operación es una línea JSON en storage/operaciones.jsonl
// (la carpeta storage/ está en .gitignore: no se sube al repo).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CARPETA_SERVER = fileURLToPath(new URL('../../', import.meta.url));

// Carpeta donde se guarda la bitácora:
// - STORAGE_DIR, si está definida;
// - durante `npm test`, una carpeta temporal, para no ensuciar la bitácora real;
// - si no, server/storage.
export function carpetaStorage() {
  if (process.env.STORAGE_DIR) return path.resolve(process.env.STORAGE_DIR);
  if (process.env.NODE_TEST_CONTEXT) return path.join(os.tmpdir(), `sbp-pruebas-${process.pid}`);
  return path.join(CARPETA_SERVER, 'storage');
}

export function archivoBitacora() {
  return path.join(carpetaStorage(), 'operaciones.jsonl');
}

// Agrega una operación a la bitácora y la devuelve.
// resultado: "exito", "error" o "rechazado". archivo y detalle son opcionales.
// Ejemplo: registrarOperacion({ operacion: 'carga_periodo', archivo: 'AT03_sintetico_202610.csv',
//                               perfil: req.perfil, resultado: 'exito', detalle: 'Período 20261031' })
export function registrarOperacion({ operacion, archivo = null, perfil, resultado, detalle = null }) {
  if (!operacion || !perfil || !resultado) {
    throw new Error('registrarOperacion necesita operacion, perfil y resultado.');
  }
  const registro = { fecha_hora: new Date().toISOString(), operacion, archivo, perfil, resultado, detalle };
  try {
    fs.mkdirSync(carpetaStorage(), { recursive: true });
    fs.appendFileSync(archivoBitacora(), `${JSON.stringify(registro)}\n`, 'utf8');
  } catch (error) {
    // Si no se puede escribir la bitácora, la operación principal no debe fallar por eso.
    console.error(`No se pudo escribir la bitácora: ${error.message}`);
  }
  return registro;
}

// Operaciones registradas, de la más reciente a la más antigua.
// Una línea dañada se salta (no tumba la consulta).
export function leerOperaciones() {
  if (!fs.existsSync(archivoBitacora())) return [];
  const lineas = fs.readFileSync(archivoBitacora(), 'utf8').split('\n');
  const operaciones = [];
  for (const linea of lineas) {
    if (linea.trim() === '') continue;
    try {
      operaciones.push(JSON.parse(linea));
    } catch {
      console.warn('Bitácora: se ignoró una línea que no es JSON válido.');
    }
  }
  return operaciones.reverse();
}
