// Explicación de movimientos por reglas (plantillas de texto). Funciona sin IA y es el
// respaldo de la explicación con IA. Usa solo los campos de /api/movimientos
// (contracts/movimientos.json): no recalcula posiciones, saldos ni variaciones.

import { formatoMonto, formatoMontoConSigno, formatoPctConSigno } from './formato.js';

function posiciones(n) {
  return n === 1 ? '1 posición' : `${n} posiciones`;
}

function fraseSaldo(mov) {
  if (mov.Var_Saldo_Pct !== null && mov.Var_Saldo_Pct !== undefined) {
    return `, con una variación de saldo de ${formatoPctConSigno(mov.Var_Saldo_Pct)} (${formatoMontoConSigno(mov.Var_Saldo)})`;
  }
  // Var_Saldo_Pct es null cuando el saldo anterior era 0 (no hay porcentaje).
  if (mov.Var_Saldo !== 0) {
    return `; su saldo pasa de ${formatoMonto(mov.Saldo_anterior)} a ${formatoMonto(mov.Saldo_actual)}`;
  }
  return '';
}

function textoMovimiento(ranking, mov) {
  const { Banco, Cambio_Posicion: cambio, Posicion_anterior: antes, Posicion_actual: ahora } = mov;
  const saldo = fraseSaldo(mov);
  if (cambio > 0) {
    return `${Banco} sube ${posiciones(cambio)} en ${ranking} (del ${antes}.º al ${ahora}.º)${saldo}.`;
  }
  if (cambio < 0) {
    return `${Banco} baja ${posiciones(-cambio)} en ${ranking} (del ${antes}.º al ${ahora}.º)${saldo}.`;
  }
  return `${Banco} se mantiene en el ${ahora}.º lugar de ${ranking}${saldo}.`;
}

function relevancia(mov) {
  return [Math.abs(mov.Cambio_Posicion), Math.abs(mov.Var_Saldo_Pct ?? 0)];
}

/**
 * Convierte la respuesta de /api/movimientos en frases.
 * @param {object} datos respuesta del motor
 * @param {{ soloSignificativos?: boolean }} opciones por defecto solo los significativos
 * @returns {Array<{ id, Ranking, Codigo_Banco, tipo, texto }>}
 */
export function explicarPorReglas(datos, { soloSignificativos = true } = {}) {
  const items = [];
  for (const ranking of datos.rankings ?? []) {
    const nombre = ranking.Ranking;
    if (ranking.Cambio_Lider && ranking.Lider_actual && ranking.Lider_anterior) {
      items.push({
        id: `${nombre}:lider`,
        Ranking: nombre,
        Codigo_Banco: ranking.Lider_actual.Codigo_Banco,
        tipo: 'cambio_lider',
        texto: `${ranking.Lider_actual.Banco} pasa a liderar ${nombre} y desplaza a ${ranking.Lider_anterior.Banco}.`,
      });
    }
    const movimientos = (ranking.movimientos ?? [])
      .filter((mov) => !soloSignificativos || mov.Significativo)
      .sort((a, b) => {
        const [ca, pa] = relevancia(a);
        const [cb, pb] = relevancia(b);
        return cb - ca || pb - pa;
      });
    for (const mov of movimientos) {
      items.push({
        id: `${nombre}:${mov.Codigo_Banco}`,
        Ranking: nombre,
        Codigo_Banco: mov.Codigo_Banco,
        tipo: 'movimiento',
        texto: textoMovimiento(nombre, mov),
      });
    }
  }
  return items;
}
