// Indicadores adicionales (#35): morosidad, vencimientos y concentración. Es ANÁLISIS ADICIONAL:
// no interviene en los 6 rankings oficiales ni en su cálculo.
// Mismo criterio que el motor: montos en centavos enteros y porcentajes con BigInt,
// redondeo aritmético (half-up) a 4 decimales. Saldo, Intereses y provisiones no se tocan.
import { aCentavos, esMontoValido, ponderacionE4 } from './montos.js';

// Los tramos salen del diccionario AT03, en su orden: no se escriben a mano.
export function camposDeTramos(catalogos) {
  const nombres = catalogos.campos.map((c) => c.campo);
  return {
    vencido: nombres.filter((n) => n.startsWith('Monto_Vencido_')),
    porVencer: nombres.filter((n) => n.startsWith('Monto_por_Vencer_')),
  };
}

// periodo: resultado de procesarPeriodo. ranking (opcional): limita morosidad y vencimientos a esa
// macroactividad y la concentración a ese ranking. Devuelve centavos, diezmilésimas (E4) y centésimas (E2).
export function calcularIndicadores(periodo, catalogos, { ranking = null } = {}) {
  const tramos = camposDeTramos(catalogos);
  const operaciones = ranking ? periodo.operaciones.filter((op) => op.macro === ranking) : periodo.operaciones;
  const bancos = periodo.rankings[0].filas
    .map(({ codigoBanco, banco }) => ({ codigoBanco, banco }))
    .sort((a, b) => (a.codigoBanco < b.codigoBanco ? -1 : 1));

  return {
    ranking,
    total: resumirCartera(operaciones, tramos),
    bancos: bancos.map((b) => ({ ...b, ...resumirCartera(operaciones.filter((op) => op.codigoBanco === b.codigoBanco), tramos) })),
    concentracion: periodo.rankings.filter((r) => !ranking || r.ranking === ranking).map(concentracionDe),
  };
}

// Morosidad y vencimientos de un grupo de operaciones (universo válido: todas con Saldo > 0).
export function resumirCartera(operaciones, tramos) {
  const tramosVencido = Object.fromEntries(tramos.vencido.map((campo) => [campo, 0]));
  const tramosPorVencer = Object.fromEntries(tramos.porVencer.map((campo) => [campo, 0]));
  let saldo = 0;
  let operacionesEnMora = 0;
  let saldoEnMora = 0;
  let diasPorSaldo = 0n; // suma de Dias_Mora × Saldo, para el promedio ponderado
  let valoresInvalidos = 0; // montos de tramo con formato inválido (ya reportados como alerta de tipo)

  const sumarTramo = (acumulado, campo, texto) => {
    if (esMontoValido(texto)) acumulado[campo] += aCentavos(texto);
    else valoresInvalidos += 1;
  };

  for (const op of operaciones) {
    saldo += op.saldo;
    for (const campo of tramos.vencido) sumarTramo(tramosVencido, campo, op.datos[campo]);
    for (const campo of tramos.porVencer) sumarTramo(tramosPorVencer, campo, op.datos[campo]);
    const diasMora = Number(op.datos.Dias_Mora);
    if (diasMora > 0) {
      operacionesEnMora += 1;
      saldoEnMora += op.saldo;
      diasPorSaldo += BigInt(diasMora) * BigInt(op.saldo);
    }
  }

  const vencido = sumarValores(tramosVencido);
  const porVencer = sumarValores(tramosPorVencer);
  return {
    operaciones: operaciones.length,
    saldo,
    vencido,
    porVencer,
    pctVencidoE4: ponderacionE4(vencido, saldo),
    operacionesEnMora,
    saldoEnMora,
    pctSaldoEnMoraE4: ponderacionE4(saldoEnMora, saldo),
    diasMoraPromedioE2: promedioE2(diasPorSaldo, saldoEnMora), // entre los préstamos en mora, ponderado por saldo
    tramosVencido,
    tramosPorVencer,
    valoresInvalidos,
  };
}

// Concentración de un ranking: participación de los 3 primeros e índice Herfindahl-Hirschman.
export function concentracionDe({ ranking, filas }) {
  const total = filas.reduce((suma, f) => suma + f.saldoActividad, 0);
  const top3 = filas.slice(0, 3); // las filas ya vienen ordenadas por posición
  const sumaTop3 = top3.reduce((suma, f) => suma + f.saldoActividad, 0);
  return {
    ranking,
    total,
    participacionTop3E4: ponderacionE4(sumaTop3, total),
    hhiE4: hhiE4(filas.map((f) => f.saldoActividad), total),
    top3: top3.map((f) => ({
      posicion: f.posicion,
      codigoBanco: f.codigoBanco,
      banco: f.banco,
      saldoActividad: f.saldoActividad,
      participacionE4: ponderacionE4(f.saldoActividad, total),
    })),
  };
}

// HHI = Σ (participación en %)² = 10000 × Σ saldo² / total². Va de 0 a 10000 (10000 = un solo banco).
// Se devuelve en diezmilésimas (4 decimales), con redondeo half-up exacto en BigInt.
export function hhiE4(saldos, total) {
  if (total === 0) return 0;
  const totalBig = BigInt(total);
  const sumaCuadrados = saldos.reduce((suma, s) => suma + BigInt(s) * BigInt(s), 0n);
  const numerador = sumaCuadrados * 100_000_000n; // 10000 (escala del HHI) × 10000 (4 decimales)
  const denominador = totalBig * totalBig;
  return Number((2n * numerador + denominador) / (2n * denominador));
}

// Promedio en centésimas con redondeo half-up: round(numerador / denominador × 100).
function promedioE2(numerador, denominador) {
  if (denominador === 0) return 0;
  const den = BigInt(denominador);
  return Number((numerador * 200n + den) / (2n * den));
}

function sumarValores(objeto) {
  return Object.values(objeto).reduce((suma, valor) => suma + valor, 0);
}
