// Formato de presentación de los números del motor. Solo da formato: nunca calcula.

const montoFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1400000 → "1,400,000.00" */
export function formatoMonto(valor) {
  return montoFmt.format(valor);
}

/** 150000 → "+150,000.00"; -30000 → "-30,000.00" */
export function formatoMontoConSigno(valor) {
  return (valor > 0 ? '+' : '') + montoFmt.format(valor);
}

/** 12 → "+12.00%"; -2.1739 → "-2.17%" */
export function formatoPctConSigno(valor) {
  return (valor > 0 ? '+' : '') + pctFmt.format(valor) + '%';
}
