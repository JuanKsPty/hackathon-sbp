// Formato de presentación de los números del motor. Solo da formato: nunca calcula.

// Montos y porcentajes se muestran igual: 2 decimales y coma de miles. 'en-US' da lo mismo que
// 'es-PA', el formato que usa el front (client/src/lib/formato.js), y es el que lee el verificador.
const dosDecimales = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1400000 → "1,400,000.00" */
export function formatoMonto(valor) {
  return dosDecimales.format(valor);
}

/** 150000 → "+150,000.00"; -30000 → "-30,000.00" */
export function formatoMontoConSigno(valor) {
  return (valor > 0 ? '+' : '') + dosDecimales.format(valor);
}

/** 12 → "+12.00%"; -2.1739 → "-2.17%" */
export function formatoPctConSigno(valor) {
  return (valor > 0 ? '+' : '') + dosDecimales.format(valor) + '%';
}
