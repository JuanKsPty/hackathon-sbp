// "Todos los períodos": el acumulado de los cortes cargados (engine/acumulado.js y ?periodo=todos).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { acumularPeriodos, TODOS } from '../src/engine/index.js';
import { periodoPedido } from '../src/routes/parametros.js';
import { paqueteReal } from './ayuda.js';

const { catalogos, periodos } = paqueteReal();
const acumulado = acumularPeriodos(periodos, catalogos);

let servidor;
let base;

before(async () => {
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

async function pedir(ruta) {
  const respuesta = await fetch(base + ruta);
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test('el saldo acumulado de cada banco y ranking es la suma de sus saldos en cada corte, al centavo', () => {
  assert.equal(acumulado.fecha, TODOS);
  for (const { ranking, filas } of acumulado.rankings) {
    for (const fila of filas) {
      const suma = periodos.reduce(
        (total, p) => total + p.rankings.find((r) => r.ranking === ranking).filas.find((f) => f.codigoBanco === fila.codigoBanco).saldoActividad,
        0,
      );
      assert.equal(fila.saldoActividad, suma, `${ranking} ${fila.codigoBanco}`);
    }
  }
});

test('el acumulado ordena por saldo con desempate por código y numera del 1 al 12', () => {
  for (const { filas } of acumulado.rankings) {
    assert.deepEqual(filas.map((f) => f.posicion), filas.map((_, i) => i + 1));
    for (let i = 1; i < filas.length; i += 1) {
      const [a, b] = [filas[i - 1], filas[i]];
      assert.ok(a.saldoActividad > b.saldoActividad || (a.saldoActividad === b.saldoActividad && a.codigoBanco < b.codigoBanco));
    }
  }
});

test('el acumulado cuadra R1, R2, R3 y la unicidad dentro de cada corte', () => {
  const r = acumulado.reconciliaciones;
  assert.equal(r.r1.ok && r.r2.ok && r.r3.ok && r.unicidad.ok, true);
});

test('la calidad acumulada suma las filas de cada corte y la cascada sigue cuadrando', () => {
  const suma = (campo) => periodos.reduce((total, p) => total + p.calidad[campo], 0);
  for (const campo of ['filasLeidas', 'e1Duplicados', 'e2DestinoExtranjero', 'e3SaldoNoPositivo', 'e4ActividadNoCatalogada', 'universoValido', 'saldoTotalValido']) {
    assert.equal(acumulado.calidad[campo], suma(campo), campo);
  }
  assert.equal(acumulado.calidad.cascadaCuadra, true);
  assert.equal(acumulado.excluidas.length, periodos.reduce((total, p) => total + p.excluidas.length, 0));
});

test('GET /api/periodos trae el resumen del acumulado', async () => {
  const { status, cuerpo } = await pedir('/periodos');
  assert.equal(status, 200);
  assert.equal(cuerpo.acumulado.Fecha, TODOS);
  assert.equal(cuerpo.acumulado.Filas_Leidas, cuerpo.periodos.reduce((total, p) => total + p.Filas_Leidas, 0));
  assert.equal(cuerpo.acumulado.Reconciliaciones_OK, true);
});

test('?periodo=todos funciona en rankings, subactividades, calidad, excluidas e indicadores', async () => {
  for (const ruta of ['/rankings', '/subactividades', '/excluidas', '/indicadores']) {
    const { status, cuerpo } = await pedir(`${ruta}?periodo=todos`);
    assert.equal(status, 200, ruta);
    assert.equal(cuerpo.periodo, TODOS, ruta);
  }
  const calidad = await pedir('/calidad?periodo=todos');
  assert.equal(calidad.status, 200);
  assert.deepEqual(calidad.cuerpo.periodos.map((p) => p.Fecha), [TODOS]);
});

test('periodo=todos solo vale donde se permite: movimientos y descomposición comparan dos cortes', () => {
  const almacen = crearAlmacen(catalogos, periodos);
  assert.equal(periodoPedido(almacen, TODOS, { permitirTodos: true }).fecha, TODOS);
  assert.throws(() => periodoPedido(almacen, TODOS), (e) => e.codigo === 'PARAMETRO_INVALIDO');
});
