// Regla de "movimiento significativo" (sección 8): se lee de un archivo de parámetros, no está
// fija en el código. Por defecto server/config/parametros.json; con PARAMETROS_FILE se usa otro
// (por ejemplo storage/parametros.json, el que editará el Administrador en #30).
// Se relee en cada consulta, así un cambio de parámetros aplica sin reiniciar.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const POR_DEFECTO = fileURLToPath(new URL('../../config/parametros.json', import.meta.url));

export function leerReglaMovimientos(archivo = process.env.PARAMETROS_FILE || POR_DEFECTO) {
  const { movimientos } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  return validarRegla(movimientos);
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
