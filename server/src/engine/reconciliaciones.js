// Controles de reconciliación (Sección 7). Se calculan en cada período para mostrarlos en la app
// y las pruebas exigen que cuadren al centavo en los 3 períodos.

export function reconciliar({ operaciones, rankings, desglose }) {
  return {
    r1: subactividadesCuadranConActividad(rankings, desglose),
    r2: actividadesCuadranConTotal(rankings),
    r3: totalesCuadranConUniverso(rankings, operaciones),
    unicidad: prestamosUnicos(operaciones),
  };
}

// R1: por banco y ranking, la suma de Saldo_Subactividad es igual a Saldo_Actividad_Banco.
function subactividadesCuadranConActividad(rankings, desglose) {
  const sumaSubs = new Map();
  for (const { ranking, codigoBanco, saldo } of desglose) {
    const clave = `${ranking}|${codigoBanco}`;
    sumaSubs.set(clave, (sumaSubs.get(clave) ?? 0) + saldo);
  }
  const diferencias = [];
  for (const { ranking, filas } of rankings) {
    for (const fila of filas) {
      const suma = sumaSubs.get(`${ranking}|${fila.codigoBanco}`) ?? 0;
      if (suma !== fila.saldoActividad) {
        diferencias.push({ ranking, codigoBanco: fila.codigoBanco, sumaSubactividades: suma, saldoActividad: fila.saldoActividad });
      }
    }
  }
  return { ok: diferencias.length === 0, diferencias };
}

// R2: por banco, la suma de las 6 macroactividades es igual a Total_Cartera_Local_Valida_Banco.
function actividadesCuadranConTotal(rankings) {
  const sumaPorBanco = new Map();
  const totalPorBanco = new Map();
  for (const { filas } of rankings) {
    for (const fila of filas) {
      sumaPorBanco.set(fila.codigoBanco, (sumaPorBanco.get(fila.codigoBanco) ?? 0) + fila.saldoActividad);
      totalPorBanco.set(fila.codigoBanco, fila.totalCartera);
    }
  }
  const diferencias = [];
  for (const [codigoBanco, suma] of sumaPorBanco) {
    if (suma !== totalPorBanco.get(codigoBanco)) {
      diferencias.push({ codigoBanco, sumaActividades: suma, totalCartera: totalPorBanco.get(codigoBanco) });
    }
  }
  return { ok: diferencias.length === 0, diferencias };
}

// R3: la suma de los totales de los bancos es igual a la suma de Saldo del universo local válido.
function totalesCuadranConUniverso(rankings, operaciones) {
  let sumaTotales = 0;
  for (const fila of rankings[0]?.filas ?? []) sumaTotales += fila.totalCartera; // cada banco aparece una vez por ranking
  let sumaUniverso = 0;
  for (const op of operaciones) sumaUniverso += op.saldo;
  return { ok: sumaTotales === sumaUniverso, sumaTotales, sumaUniverso };
}

// Ningún Numero_Prestamo se repite en el universo local válido.
function prestamosUnicos(operaciones) {
  const vistos = new Set();
  const repetidos = [];
  for (const op of operaciones) {
    if (vistos.has(op.numeroPrestamo)) repetidos.push(op.numeroPrestamo);
    vistos.add(op.numeroPrestamo);
  }
  return { ok: repetidos.length === 0, repetidos };
}
