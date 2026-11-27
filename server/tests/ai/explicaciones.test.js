import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { explicarPorReglas } from '../../src/ai/plantillas.js';
import { verificarNumeros, extraerNumeros } from '../../src/ai/verificador.js';
import { explicarMovimientos, ETIQUETA_IA, ETIQUETA_REGLAS } from '../../src/ai/explicaciones.js';

// Mock del contrato de /api/movimientos (contracts/movimientos.json).
const datos = JSON.parse(
  readFileSync(new URL('../../../contracts/movimientos.json', import.meta.url), 'utf8'),
);

// Cliente falso de Anthropic que devuelve los textos indicados por id.
function clienteFalso(textos, stop_reason = 'end_turn') {
  return {
    beta: {
      messages: {
        create: async () => ({
          stop_reason,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                items: Object.entries(textos).map(([id, texto]) => ({ id, texto })),
              }),
            },
          ],
        }),
      },
    },
  };
}

test('las plantillas usan los valores del motor', () => {
  const items = explicarPorReglas(datos);
  const textos = Object.fromEntries(items.map((i) => [i.id, i.texto]));
  assert.equal(
    textos['HIPOTECARIO:lider'],
    'Banco Pacifico pasa a liderar HIPOTECARIO y desplaza a Banco Istmo.',
  );
  assert.equal(
    textos['HIPOTECARIO:104'],
    'Banco Pacifico sube 2 posiciones en HIPOTECARIO (del 3.º al 1.º), con una variación de saldo de +12.00% (+150,000.00).',
  );
  assert.equal(
    textos['HIPOTECARIO:101'],
    'Banco Istmo baja 1 posición en HIPOTECARIO (del 1.º al 2.º), con una variación de saldo de -2.17% (-30,000.00).',
  );
});

test('por defecto solo explica los movimientos significativos', () => {
  const ids = explicarPorReglas(datos).map((i) => i.id);
  assert.ok(!ids.includes('HIPOTECARIO:112'));
  const todos = explicarPorReglas(datos, { soloSignificativos: false }).map((i) => i.id);
  assert.ok(todos.includes('HIPOTECARIO:112'));
});

test('ordena por cambio de posición más grande', () => {
  const movs = explicarPorReglas(datos).filter((i) => i.tipo === 'movimiento');
  assert.deepEqual(movs.map((i) => i.Codigo_Banco), ['104', '101']);
});

test('saldo anterior 0: sin porcentaje y sin dividir por cero', () => {
  const sinBase = {
    rankings: [{
      Ranking: 'CONSUMO',
      movimientos: [{
        Codigo_Banco: '112', Banco: 'Banco Solidez', Posicion_anterior: 12, Posicion_actual: 10,
        Cambio_Posicion: 2, Saldo_anterior: 0, Saldo_actual: 5000, Var_Saldo: 5000,
        Var_Saldo_Pct: null, Significativo: true, Motivos: ['cambio_posicion'],
      }],
    }],
  };
  const [item] = explicarPorReglas(sinBase);
  assert.equal(
    item.texto,
    'Banco Solidez sube 2 posiciones en CONSUMO (del 12.º al 10.º); su saldo pasa de 0.00 a 5,000.00.',
  );
});

test('todas las frases por reglas pasan el verificador', () => {
  for (const item of explicarPorReglas(datos, { soloSignificativos: false })) {
    assert.deepEqual(verificarNumeros(item.texto, datos), { ok: true, noEncontrados: [] }, item.texto);
  }
});

test('el verificador detecta números inventados', () => {
  assert.deepEqual(extraerNumeros('subió 1,250,000.00 y 3.5%').map((n) => n.valor), [1250000, 3.5]);
  const r = verificarNumeros('Banco Pacifico creció 15% y suma 2,650,000.00 entre ambos meses.', datos);
  assert.equal(r.ok, false);
  assert.deepEqual(r.noEncontrados, ['15', '2,650,000.00']);
  assert.equal(verificarNumeros('Al 30 de septiembre de 2026 lidera Banco Pacifico.', datos).ok, true);
});

// Límite documentado en src/ai/README.md (#86, B3): el verificador comprueba que el número exista
// en los resultados, no que sea el de ese banco ni ese campo. Los valores salen de los datos de
// ejemplo, no se escriben a mano.
test('límite conocido: un entero pequeño que existe en otro campo pasa aunque no sea el de ese dato', () => {
  const mov = datos.rankings[0].movimientos[0];
  const otro = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((n) => n !== Math.abs(mov.Cambio_Posicion) && verificarNumeros(String(n), datos).ok);
  assert.ok(otro, 'los enteros 1 a 12 casi siempre existen en los datos (posiciones, códigos, fechas)');
  assert.equal(verificarNumeros(`${mov.Banco} subió ${otro} posiciones.`, datos).ok, true);
});

test('límite conocido: un entero sin decimales coincide con un valor que redondea a él', () => {
  const fraccion = extraerNumeros(JSON.stringify(datos)).find((n) => n.decimales > 0 && n.valor >= 1);
  assert.ok(fraccion);
  assert.equal(verificarNumeros(`creció ${Math.round(fraccion.valor)}`, datos).ok, true);
  // Con los decimales escritos sí se exige el valor: uno que no está en los datos no pasa.
  assert.equal(verificarNumeros(`creció ${(fraccion.valor + 10_000_000.5).toFixed(fraccion.decimales)}`, datos).ok, false);
});

test('sin API key responde por reglas y avisa que la IA no está disponible', async () => {
  const r = await explicarMovimientos(datos, { apiKey: '' });
  assert.equal(r.ia_disponible, false);
  assert.match(r.motivo, /IA no disponible/);
  assert.equal(r.etiqueta, ETIQUETA_REGLAS);
  assert.ok(r.items.every((i) => i.fuente === 'reglas'));
});

test('con IA: usa el texto verificado y descarta el que inventa números', async () => {
  const cliente = clienteFalso({
    'HIPOTECARIO:lider': 'Banco Pacifico toma el liderazgo de HIPOTECARIO, que antes tenía Banco Istmo.',
    'HIPOTECARIO:104': 'Banco Pacifico escala del 3.º al 1.º lugar en HIPOTECARIO gracias a un saldo +12.00% mayor.',
    'HIPOTECARIO:101': 'Banco Istmo cae al 2.º lugar tras perder un 4% de saldo.',
  });
  const r = await explicarMovimientos(datos, { cliente });
  const porId = Object.fromEntries(r.items.map((i) => [i.id, i]));
  assert.equal(r.etiqueta, ETIQUETA_IA);
  assert.equal(porId['HIPOTECARIO:104'].fuente, 'ia');
  assert.equal(porId['HIPOTECARIO:lider'].fuente, 'ia');
  assert.equal(porId['HIPOTECARIO:101'].fuente, 'reglas');
  assert.match(porId['HIPOTECARIO:101'].texto, /^Banco Istmo baja 1 posición/);
});

test('si la IA falla, responde por reglas', async () => {
  const cliente = { beta: { messages: { create: async () => { throw new Error('sin red'); } } } };
  const r = await explicarMovimientos(datos, { cliente });
  assert.equal(r.ia_disponible, false);
  assert.ok(r.items.every((i) => i.fuente === 'reglas'));
});

test('si la IA se corta (max_tokens / refusal), responde por reglas', async () => {
  const r = await explicarMovimientos(datos, { cliente: clienteFalso({}, 'refusal') });
  assert.ok(r.items.every((i) => i.fuente === 'reglas'));
});
