// Exclusiones en cascada E1 -> E2 -> E3 -> E4 (Sección 4.B de las indicaciones).
// Cada filtro se aplica sobre lo que pasó el anterior: cada fila se cuenta una sola vez,
// en el primer filtro que incumple. Lo que queda es el universo local válido.
import { aCentavos } from './montos.js';

export const MOTIVOS = {
  E1: 'Duplicado: el Numero_Prestamo ya apareció antes en el período',
  E2: 'Destino extranjero: Destino distinto de L',
  E3: 'Saldo no positivo: Saldo <= 0',
  E4: 'Actividad no catalogada: Tipo_Actividad no existe en el catálogo CINU',
};

// filas: [{ numeroFila, datos }] de UN período, en el orden del archivo.
// Devuelve las filas válidas, la lista auditable de excluidas y los conteos oficiales.
export function aplicarCascada(filas, catalogos) {
  const vistos = new Set();
  const validas = [];
  const excluidas = [];
  const conteos = { E1: 0, E2: 0, E3: 0, E4: 0 };

  for (const fila of filas) {
    const motivo = motivoDeExclusion(fila.datos, vistos, catalogos);
    if (motivo === null) {
      validas.push(fila);
      continue;
    }
    conteos[motivo] += 1;
    excluidas.push({
      fila: fila.numeroFila,
      numeroPrestamo: fila.datos.Numero_Prestamo,
      codigoBanco: fila.datos.Codigo_Banco,
      motivo,
      detalle: MOTIVOS[motivo],
    });
  }
  return { validas, excluidas, conteos };
}

// Devuelve 'E1'..'E4', o null si la fila supera los cuatro filtros.
function motivoDeExclusion(datos, vistos, catalogos) {
  // E1 se aplica sobre TODAS las filas del período: la primera ocurrencia se conserva
  // en E1 aunque después caiga en E2, E3 o E4. Los duplicados no son adyacentes,
  // por eso se recorre en orden de archivo con un conjunto de números ya vistos.
  if (vistos.has(datos.Numero_Prestamo)) return 'E1';
  vistos.add(datos.Numero_Prestamo);

  if (datos.Destino !== 'L') return 'E2'; // exacto: "l" o "L " también se excluyen
  if (aCentavos(datos.Saldo) <= 0) return 'E3';
  if (!catalogos.cinu.has(datos.Tipo_Actividad)) return 'E4';
  return null;
}

// Conteo INDEPENDIENTE de cada regla sobre todas las filas. No es el reporte oficial:
// si se muestra, va aparte y rotulado (una fila puede incumplir varias reglas a la vez).
export function conteosIndependientes(filas, catalogos) {
  const vistos = new Set();
  const conteos = { E1: 0, E2: 0, E3: 0, E4: 0 };
  for (const { datos } of filas) {
    if (vistos.has(datos.Numero_Prestamo)) conteos.E1 += 1;
    vistos.add(datos.Numero_Prestamo);
    if (datos.Destino !== 'L') conteos.E2 += 1;
    if (aCentavos(datos.Saldo) <= 0) conteos.E3 += 1;
    if (!catalogos.cinu.has(datos.Tipo_Actividad)) conteos.E4 += 1;
  }
  return conteos;
}
