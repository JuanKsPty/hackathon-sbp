import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { procesarPeriodo } from '../src/engine/index.js';
import { catalogosReales, filaSintetica, comoFilas, paqueteReal, CARPETA_REFERENCIA } from './ayuda.js';

test('cascada sintética: cada fila cuenta una sola vez, en el primer filtro que incumple', () => {
  const filas = comoFilas([
    filaSintetica({ Numero_Prestamo: 'A', Destino: 'E' }), // fila 2: E2 (primera ocurrencia de A)
    filaSintetica({ Numero_Prestamo: 'B' }), // fila 3: válida
    filaSintetica({ Numero_Prestamo: 'A', Destino: 'E' }), // fila 4: E1 (duplicado no adyacente de A)
    filaSintetica({ Numero_Prestamo: 'C', Saldo: '0.00' }), // fila 5: E3
    filaSintetica({ Numero_Prestamo: 'D', Saldo: '-5.00' }), // fila 6: E3
    filaSintetica({ Numero_Prestamo: 'E', Destino: 'E', Saldo: '-1.00' }), // fila 7: E2 (no E3)
    filaSintetica({ Numero_Prestamo: 'F', Tipo_Actividad: 'Z.99.999.9999.99999' }), // fila 8: E4
    filaSintetica({ Numero_Prestamo: 'B', Saldo: '50.00' }), // fila 9: E1 (B ya se conservó)
    filaSintetica({ Numero_Prestamo: 'G', Destino: 'l' }), // fila 10: E2 (mayúscula exacta)
    filaSintetica({ Numero_Prestamo: 'H' }), // fila 11: válida
  ]);
  const { calidad, excluidas, operaciones } = procesarPeriodo(filas, catalogosReales());

  assert.equal(calidad.filasLeidas, 10);
  assert.equal(calidad.e1Duplicados, 2);
  assert.equal(calidad.e2DestinoExtranjero, 3);
  assert.equal(calidad.e3SaldoNoPositivo, 2);
  assert.equal(calidad.e4ActividadNoCatalogada, 1);
  assert.equal(calidad.universoValido, 2);
  assert.equal(calidad.cascadaCuadra, true);
  assert.deepEqual(operaciones.map((op) => op.numeroPrestamo), ['B', 'H']);
  assert.deepEqual(
    excluidas.map((e) => `${e.fila}:${e.motivo}`),
    ['2:E2', '4:E1', '5:E3', '6:E3', '7:E2', '8:E4', '9:E1', '10:E2'],
  );
  // Los conteos independientes van aparte: la fila 7 incumple E2 y E3 a la vez.
  assert.equal(calidad.conteosIndependientes.E3, 3);
  assert.equal(calidad.conteosIndependientes.E2, 4);
});

test('un banco o facilidad fuera de catálogo no excluye la fila', () => {
  const filas = comoFilas([filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '999', Facilidad_Crediticia: '99' })]);
  const { calidad } = procesarPeriodo(filas, catalogosReales());
  assert.equal(calidad.universoValido, 1);
  assert.equal(calidad.alertasBancoFueraDeCatalogo, 1);
});

const referenciaCalidad = parse(fs.readFileSync(path.join(CARPETA_REFERENCIA, 'referencia_calidad.csv'), 'utf8'), {
  columns: true,
});

for (const esperado of referenciaCalidad) {
  test(`cascada real ${esperado.Fecha}: conteos E1-E4 y universo válido`, () => {
    const periodo = paqueteReal().periodos.find((p) => p.fecha === esperado.Fecha);
    const c = periodo.calidad;
    assert.equal(c.filasLeidas, Number(esperado.Filas_Leidas));
    assert.equal(c.e1Duplicados, Number(esperado.E1_Duplicados));
    assert.equal(c.e2DestinoExtranjero, Number(esperado.E2_Destino_Extranjero));
    assert.equal(c.e3SaldoNoPositivo, Number(esperado.E3_Saldo_No_Positivo));
    assert.equal(c.e4ActividadNoCatalogada, Number(esperado.E4_Actividad_No_Catalogada));
    assert.equal(c.universoValido, Number(esperado.Universo_Local_Valido));

    // filas leídas = E1 + E2 + E3 + E4 + universo válido
    assert.equal(c.cascadaCuadra, true);
    assert.equal(periodo.excluidas.length, c.e1Duplicados + c.e2DestinoExtranjero + c.e3SaldoNoPositivo + c.e4ActividadNoCatalogada);
    assert.equal(periodo.excluidas.every((e) => e.motivo && e.detalle && e.fila >= 2), true);

    // Ningún Numero_Prestamo se repite en el universo válido.
    const numeros = periodo.operaciones.map((op) => op.numeroPrestamo);
    assert.equal(new Set(numeros).size, numeros.length);
  });
}
