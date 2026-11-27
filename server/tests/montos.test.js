import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aCentavos, formatearCentavos, ponderacionE4, formatearE4, esMontoValido } from '../src/engine/montos.js';

test('aCentavos convierte texto a centavos sin punto flotante', () => {
  assert.equal(aCentavos('84556.97'), 8455697);
  assert.equal(aCentavos('0.10'), 10);
  assert.equal(aCentavos('12.5'), 1250);
  assert.equal(aCentavos('0'), 0); // montos sin decimales (ej. Valor_Segunda_Garantia = 0)
  assert.equal(aCentavos('-3.00'), -300);
  assert.equal(Object.is(aCentavos('-0.00'), 0), true); // -0.00 es cero, no -0
});

test('aCentavos rechaza montos mal formados', () => {
  for (const malo of ['abc', '1.234', '1,50', '', 'NA', ' 5.00']) {
    assert.equal(esMontoValido(malo), false, malo);
    assert.throws(() => aCentavos(malo));
  }
});

test('formatearCentavos devuelve 2 decimales', () => {
  assert.equal(formatearCentavos(8455697), '84556.97');
  assert.equal(formatearCentavos(5), '0.05');
  assert.equal(formatearCentavos(0), '0.00');
  assert.equal(formatearCentavos(-1250), '-12.50');
  assert.equal(formatearCentavos(434239166385), '4342391663.85');
});

test('ponderacionE4 redondea half-up a 4 decimales', () => {
  assert.equal(formatearE4(ponderacionE4(1, 3)), '33.3333');
  assert.equal(formatearE4(ponderacionE4(2, 3)), '66.6667');
  // 1 / 400000 × 100 = 0.00025 -> exactamente a la mitad: sube a 0.0003
  assert.equal(formatearE4(ponderacionE4(1, 400000)), '0.0003');
  assert.equal(formatearE4(ponderacionE4(5, 5)), '100.0000');
  assert.equal(formatearE4(ponderacionE4(0, 5)), '0.0000');
  assert.equal(formatearE4(ponderacionE4(0, 0)), '0.0000'); // banco sin cartera
});

test('ponderacionE4 no pierde precisión con montos reales', () => {
  // HIPOTECARIO, banco 112, julio (cifra de referencia: 19.5397)
  assert.equal(formatearE4(ponderacionE4(8756205392, 44812402975)), '19.5397');
});
