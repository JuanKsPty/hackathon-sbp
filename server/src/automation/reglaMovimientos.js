// Regla de "movimiento significativo" (sección 8): se lee de un archivo de parámetros, no está
// fija en el código. Los valores por defecto están en server/config/parametros.json (en el repo).
// Lo que guarda el Administrador (#30) va a storage/parametros.json (o al archivo que indique
// PARAMETROS_FILE) y tiene prioridad.
// Se relee en cada consulta, así un cambio de parámetros aplica sin reiniciar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carpetaStorage } from '../datos/storage.js';

export const POR_DEFECTO = fileURLToPath(new URL('../../config/parametros.json', import.meta.url));

// Archivo donde el Administrador guarda la regla.
export function archivoDelAdministrador() {
  return process.env.PARAMETROS_FILE || path.join(carpetaStorage(), 'parametros.json');
}

// Archivo vigente: el del Administrador, si ya guardó una regla; si no, el de config/.
export function archivoVigente() {
  const delAdministrador = archivoDelAdministrador();
  return fs.existsSync(delAdministrador) ? delAdministrador : POR_DEFECTO;
}

export function leerReglaMovimientos(archivo = archivoVigente()) {
  const { movimientos } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  return validarRegla(movimientos);
}

// Guarda la regla que define el Administrador (#30). Valida antes de escribir.
export function guardarReglaMovimientos(regla) {
  const valida = validarRegla(regla);
  const archivo = archivoDelAdministrador();
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, `${JSON.stringify({ movimientos: valida }, null, 2)}\n`, 'utf8');
  return valida;
}

// Cada umbral es un número >= 0, o null para desactivar ese criterio.
export function validarRegla(regla) {
  const { min_cambio_posicion_abs, cambio_lider, min_var_saldo_pct_abs } = regla ?? {};
  const umbralValido = (v) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  if (!umbralValido(min_cambio_posicion_abs) || !umbralValido(min_var_saldo_pct_abs) || typeof cambio_lider !== 'boolean') {
    throw new Error(
      'Regla de movimientos inválida: se esperan min_cambio_posicion_abs y min_var_saldo_pct_abs (número >= 0 o null) y cambio_lider (true o false).',
    );
  }
  return { min_cambio_posicion_abs, cambio_lider, min_var_saldo_pct_abs };
}
