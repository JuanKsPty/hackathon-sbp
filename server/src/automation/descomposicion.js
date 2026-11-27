// Descomposición de cada movimiento siguiendo Numero_Prestamo (diferencial de la app).
// Para cada ranking y banco, la variación de saldo entre dos períodos se parte en tres piezas
// que suman EXACTAMENTE Var_Saldo (centavos):
//   Nuevos:       préstamos del período actual que no estaban (en ese ranking y banco) en el anterior.
//   Salen:        préstamos del anterior que ya no están; su saldo se resta (valor negativo).
//   Amortizacion: diferencia de saldo de los préstamos que continúan (normalmente negativa).
// Usa el universo válido que ya calculó el motor (periodo.operaciones); no vuelve a leer los AT03.

const clave = (ranking, banco) => `${ranking}|${banco}`;
const continua = (antes, despues) => antes.macro === despues.macro && antes.codigoBanco === despues.codigoBanco;

const piezasVacias = () => ({
  nuevos: { saldo: 0, operaciones: 0 },
  salen: { saldo: 0, operaciones: 0 },
  amortizacion: { saldo: 0, operaciones: 0 },
});

function porPrestamo(periodo) {
  return new Map(periodo.operaciones.map((op) => [op.numeroPrestamo, op]));
}

/**
 * Descompone todos los rankings y bancos entre dos períodos procesados por el motor.
 * Devuelve { continuidad: { continuan, entran, salen }, piezas(ranking, banco) }.
 */
export function descomponer(anterior, actual) {
  const antes = porPrestamo(anterior);
  const despues = porPrestamo(actual);
  const piezas = new Map();
  const de = (op) => {
    const k = clave(op.macro, op.codigoBanco);
    if (!piezas.has(k)) piezas.set(k, piezasVacias());
    return piezas.get(k);
  };

  for (const op of despues.values()) {
    const previo = antes.get(op.numeroPrestamo);
    const pieza = de(op);
    if (previo && continua(previo, op)) {
      pieza.amortizacion.saldo += op.saldo - previo.saldo;
      pieza.amortizacion.operaciones += 1;
    } else {
      pieza.nuevos.saldo += op.saldo;
      pieza.nuevos.operaciones += 1;
    }
  }
  for (const op of antes.values()) {
    const siguiente = despues.get(op.numeroPrestamo);
    if (!siguiente || !continua(op, siguiente)) {
      const pieza = de(op);
      pieza.salen.saldo -= op.saldo;
      pieza.salen.operaciones += 1;
    }
  }

  // Continuidad en todo el universo válido, sin importar banco ni ranking.
  let continuan = 0;
  for (const numero of despues.keys()) if (antes.has(numero)) continuan += 1;
  const continuidad = { continuan, entran: despues.size - continuan, salen: antes.size - continuan };

  return { continuidad, piezas: (ranking, banco) => piezas.get(clave(ranking, banco)) ?? piezasVacias() };
}

/**
 * Evidencia de un ranking y banco: la lista de préstamos detrás de cada pieza.
 * Las sumas de cada lista son iguales a las piezas de descomponer().
 */
export function evidencia(anterior, actual, ranking, banco) {
  const enRankingYBanco = (op) => op.macro === ranking && op.codigoBanco === banco;
  const antes = new Map(anterior.operaciones.filter(enRankingYBanco).map((op) => [op.numeroPrestamo, op]));
  const despues = new Map(actual.operaciones.filter(enRankingYBanco).map((op) => [op.numeroPrestamo, op]));

  const nuevos = [];
  const continuan = [];
  for (const op of despues.values()) {
    const previo = antes.get(op.numeroPrestamo);
    if (previo) {
      continuan.push({ numeroPrestamo: op.numeroPrestamo, saldoAnterior: previo.saldo, saldoActual: op.saldo, diferencia: op.saldo - previo.saldo });
    } else {
      nuevos.push({ numeroPrestamo: op.numeroPrestamo, saldo: op.saldo });
    }
  }
  const salen = [...antes.values()]
    .filter((op) => !despues.has(op.numeroPrestamo))
    .map((op) => ({ numeroPrestamo: op.numeroPrestamo, saldo: -op.saldo }));

  const porMonto = (a, b) => Math.abs(b.saldo ?? b.diferencia) - Math.abs(a.saldo ?? a.diferencia);
  return { nuevos: nuevos.sort(porMonto), salen: salen.sort(porMonto), continuan: continuan.sort(porMonto) };
}
