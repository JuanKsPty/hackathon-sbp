import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { procesarPeriodo } from '../src/engine/index.js';
import { formatearCentavos, formatearE4 } from '../src/engine/montos.js';
import { catalogosReales, filaSintetica, comoFilas, paqueteReal, CARPETA_REFERENCIA } from './ayuda.js';

const HIPOTECARIO = 'L.68.681.6810.00000'; // Vivienda propia
const COMERCIO = 'G.47.471.4719.47191'; // Minorista

function ranking(resultado, nombre) {
  return resultado.rankings.find((r) => r.ranking === nombre).filas;
}

test('cada ranking trae los 12 bancos con posiciones 1 a 12; sin saldo aparece en 0', () => {
  const resultado = procesarPeriodo(comoFilas([filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '105' })]), catalogosReales());
  assert.equal(resultado.rankings.length, 6);
  for (const { filas } of resultado.rankings) {
    assert.equal(filas.length, 12);
    assert.deepEqual(filas.map((f) => f.posicion), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  }
  const hipotecario = ranking(resultado, 'HIPOTECARIO');
  assert.equal(hipotecario[0].codigoBanco, '105');
  const sinSaldo = hipotecario.find((f) => f.codigoBanco === '101');
  assert.equal(sinSaldo.saldoActividad, 0);
  assert.equal(sinSaldo.ponderacionE4, 0);
  assert.equal(sinSaldo.operacionesValidas, 0);
});

test('empate exacto de saldo: gana el Codigo_Banco menor', () => {
  const resultado = procesarPeriodo(
    comoFilas([
      filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '110', Saldo: '500.00' }),
      filaSintetica({ Numero_Prestamo: 'B', Codigo_Banco: '103', Saldo: '500.00' }),
      filaSintetica({ Numero_Prestamo: 'C', Codigo_Banco: '107', Saldo: '499.99' }),
    ]),
    catalogosReales(),
  );
  assert.deepEqual(ranking(resultado, 'HIPOTECARIO').slice(0, 3).map((f) => f.codigoBanco), ['103', '110', '107']);
});

test('la ponderación usa como denominador toda la cartera válida del banco', () => {
  const resultado = procesarPeriodo(
    comoFilas([
      filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '101', Tipo_Actividad: HIPOTECARIO, Saldo: '100.00' }),
      filaSintetica({ Numero_Prestamo: 'B', Codigo_Banco: '101', Tipo_Actividad: COMERCIO, Saldo: '200.00' }),
      filaSintetica({ Numero_Prestamo: 'C', Codigo_Banco: '101', Tipo_Actividad: COMERCIO, Saldo: '0.01' }),
    ]),
    catalogosReales(),
  );
  const hip = ranking(resultado, 'HIPOTECARIO').find((f) => f.codigoBanco === '101');
  const com = ranking(resultado, 'COMERCIO').find((f) => f.codigoBanco === '101');
  assert.equal(hip.totalCartera, 30001);
  assert.equal(com.totalCartera, 30001);
  assert.equal(formatearE4(hip.ponderacionE4), '33.3322'); // 10000 / 30001 × 100 = 33.33222...
  assert.equal(formatearE4(com.ponderacionE4), '66.6678'); // 20001 / 30001 × 100 = 66.66777...
  assert.equal(com.operacionesValidas, 2);
});

test('datos reales: el denominador es el mismo en los 6 rankings de un banco', () => {
  for (const periodo of paqueteReal().periodos) {
    const totales = new Map();
    for (const { filas } of periodo.rankings) {
      for (const f of filas) {
        if (!totales.has(f.codigoBanco)) totales.set(f.codigoBanco, new Set());
        totales.get(f.codigoBanco).add(f.totalCartera);
      }
    }
    assert.equal(totales.size, 12, periodo.fecha);
    for (const [banco, valores] of totales) assert.equal(valores.size, 1, `${periodo.fecha} ${banco}`);
  }
});

// ---- Comparación contra el cálculo de referencia (tests/referencia: NO es la clave oficial) ----

const leerReferencia = (archivo) =>
  parse(fs.readFileSync(path.join(CARPETA_REFERENCIA, archivo), 'utf8'), { columns: true });

test('datos reales: saldo total válido por período igual a la referencia', () => {
  for (const esperado of leerReferencia('referencia_calidad.csv')) {
    const periodo = paqueteReal().periodos.find((p) => p.fecha === esperado.Fecha);
    assert.equal(formatearCentavos(periodo.calidad.saldoTotalValido), esperado.Saldo_Total_Valido, esperado.Fecha);
  }
});

test('datos reales: los 216 renglones de rankings coinciden con la referencia', () => {
  const esperados = leerReferencia('referencia_rankings.csv');
  let comparados = 0;
  for (const esperado of esperados) {
    const periodo = paqueteReal().periodos.find((p) => p.fecha === esperado.Fecha);
    const fila = ranking(periodo, esperado.Ranking).find((f) => f.posicion === Number(esperado.Posicion));
    const obtenido = {
      Codigo_Banco: fila.codigoBanco,
      Banco: fila.banco,
      Saldo_Actividad: formatearCentavos(fila.saldoActividad),
      Total_Cartera_Local_Valida: formatearCentavos(fila.totalCartera),
      Ponderacion_Pct: formatearE4(fila.ponderacionE4),
      Operaciones_Validas: String(fila.operacionesValidas),
    };
    const { Fecha, Ranking, Posicion, ...resto } = esperado;
    assert.deepEqual(obtenido, resto, `${Fecha} ${Ranking} posición ${Posicion}`);
    comparados += 1;
  }
  assert.equal(comparados, 216);
  const totalObtenido = paqueteReal().periodos.reduce((n, p) => n + p.rankings.reduce((m, r) => m + r.filas.length, 0), 0);
  assert.equal(totalObtenido, 216);
});

test('datos reales: los 792 renglones del desglose por subactividad coinciden con la referencia', () => {
  const esperados = leerReferencia('referencia_subactividades.csv');
  const obtenidos = new Map();
  for (const periodo of paqueteReal().periodos) {
    for (const d of periodo.desglose) {
      obtenidos.set(`${periodo.fecha}|${d.ranking}|${d.subactividad}|${d.codigoBanco}`, formatearCentavos(d.saldo));
    }
  }
  assert.equal(esperados.length, 792);
  assert.equal(obtenidos.size, 792);
  for (const e of esperados) {
    const clave = `${e.Fecha}|${e.Ranking}|${e.Subactividad}|${e.Codigo_Banco}`;
    assert.equal(obtenidos.get(clave), e.Saldo, clave);
  }
});
