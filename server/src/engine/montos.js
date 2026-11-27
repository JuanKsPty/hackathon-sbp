// Aritmética exacta: dentro del motor todos los montos son centavos enteros.
// Nunca se usa parseFloat para sumar saldos (el punto flotante pierde centavos).

const PATRON_MONTO = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

// ¿El texto es un monto válido? Acepta "123", "123.4" y "123.45", con signo opcional.
export function esMontoValido(texto) {
  return typeof texto === 'string' && PATRON_MONTO.test(texto);
}

// Convierte "84556.97" en 8455697 partiendo la cadena en el punto.
export function aCentavos(texto) {
  const partes = PATRON_MONTO.exec(texto);
  if (!partes) {
    throw new Error(`Monto inválido: "${texto}"`);
  }
  const [, signo, enteros, decimales = ''] = partes;
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos)) {
    throw new Error(`Monto demasiado grande: "${texto}"`);
  }
  if (centavos === 0) return 0; // "-0.00" vale 0 (evita el -0)
  return signo === '-' ? -centavos : centavos;
}

// Convierte centavos enteros a texto con 2 decimales: 8455697 -> "84556.97".
export function formatearCentavos(centavos) {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  const enteros = Math.floor(absoluto / 100);
  const decimales = String(absoluto % 100).padStart(2, '0');
  return `${signo}${enteros}.${decimales}`;
}

// Ponderación en diezmilésimas de punto porcentual (4 decimales) con redondeo aritmético (half-up):
//   pct_e4 = redondear(saldo / total × 100 × 10000) = piso((saldo × 10^6 × 2 + total) / (2 × total))
// Se usa BigInt para que la multiplicación no pierda precisión. Saldo y total son >= 0.
export function ponderacionE4(saldoCentavos, totalCentavos) {
  if (totalCentavos === 0) return 0;
  const saldo = BigInt(saldoCentavos);
  const total = BigInt(totalCentavos);
  return Number((saldo * 1_000_000n * 2n + total) / (2n * total));
}

// Convierte diezmilésimas a texto con 4 decimales: 195397 -> "19.5397".
export function formatearE4(valorE4) {
  const enteros = Math.floor(valorE4 / 10000);
  const decimales = String(valorE4 % 10000).padStart(4, '0');
  return `${enteros}.${decimales}`;
}
