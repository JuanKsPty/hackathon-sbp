import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import { procesarPeriodo, calcularIndicadores, formatearE4 } from '../src/engine/index.js';
import { camposDeTramos, hhiE4 } from '../src/engine/indicadores.js';
import { aCentavos } from '../src/engine/montos.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { catalogosReales, filaSintetica, comoFilas, paqueteReal } from './ayuda.js';

const HIPOTECARIO = 'L.68.681.6810.00000'; // Vivienda propia
const COMERCIO = 'G.47.471.4719.47191'; // Minorista

// ---- Caso sintético con cifras calculables a mano ----

function periodoSintetico() {
  return procesarPeriodo(
    comoFilas([
      filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '101', Tipo_Actividad: HIPOTECARIO, Saldo: '100.00', Monto_por_Vencer_30_dias: '60.00', Monto_Vencido_30_dias: '40.00', Dias_Mora: '20' }),
      filaSintetica({ Numero_Prestamo: 'B', Codigo_Banco: '101', Tipo_Actividad: COMERCIO, Saldo: '300.00', Monto_por_Vencer_1_ano: '300.00', Dias_Mora: '0' }),
      filaSintetica({ Numero_Prestamo: 'C', Codigo_Banco: '102', Tipo_Actividad: HIPOTECARIO, Saldo: '400.00', Monto_Vencido_mas_1_ano: '400.00', Dias_Mora: '400' }),
    ]),
    catalogosReales(),
  );
}

test('los tramos salen del diccionario AT03, en su orden', () => {
  const { vencido, porVencer } = camposDeTramos(catalogosReales());
  assert.equal(vencido.length, 7);
  assert.equal(porVencer.length, 9);
  assert.equal(vencido[0], 'Monto_Vencido_30_dias');
  assert.equal(porVencer.at(-1), 'Monto_por_Vencer_mas_10_anos');
});

test('morosidad y vencimientos del caso sintético', () => {
  const { total, bancos } = calcularIndicadores(periodoSintetico(), catalogosReales());
  assert.equal(total.saldo, 80000);
  assert.equal(total.vencido, 44000);
  assert.equal(total.porVencer, 36000);
  assert.equal(formatearE4(total.pctVencidoE4), '55.0000');
  assert.equal(total.operacionesEnMora, 2);
  assert.equal(total.saldoEnMora, 50000);
  assert.equal(formatearE4(total.pctSaldoEnMoraE4), '62.5000');
  assert.equal(total.diasMoraPromedioE2, 32400); // (20 × 100 + 400 × 400) / 500 = 324.00
  assert.equal(total.tramosVencido.Monto_Vencido_mas_1_ano, 40000);
  assert.equal(bancos.length, 12); // siempre los 12 bancos
  const b101 = bancos.find((b) => b.codigoBanco === '101');
  assert.equal(formatearE4(b101.pctVencidoE4), '10.0000'); // 40 / 400
  assert.equal(bancos.find((b) => b.codigoBanco === '105').saldo, 0);
});

test('concentración del caso sintético: participación de los 3 primeros y HHI', () => {
  const { concentracion } = calcularIndicadores(periodoSintetico(), catalogosReales());
  const hipotecario = concentracion.find((c) => c.ranking === 'HIPOTECARIO');
  assert.equal(hipotecario.total, 50000);
  assert.equal(formatearE4(hipotecario.hhiE4), '6800.0000'); // 20² + 80²
  assert.equal(formatearE4(hipotecario.participacionTop3E4), '100.0000');
  assert.deepEqual(hipotecario.top3.map((f) => `${f.codigoBanco}:${formatearE4(f.participacionE4)}`).slice(0, 2), ['102:80.0000', '101:20.0000']);
  const comercio = concentracion.find((c) => c.ranking === 'COMERCIO');
  assert.equal(formatearE4(comercio.hhiE4), '10000.0000'); // un solo banco
  const consumo = concentracion.find((c) => c.ranking === 'CONSUMO');
  assert.equal(consumo.hhiE4, 0); // ranking sin saldo
});

test('filtro por ranking: morosidad de esa macroactividad y su concentración', () => {
  const resultado = calcularIndicadores(periodoSintetico(), catalogosReales(), { ranking: 'HIPOTECARIO' });
  assert.equal(resultado.total.saldo, 50000);
  assert.equal(formatearE4(resultado.total.pctVencidoE4), '88.0000'); // 440 / 500
  assert.equal(resultado.concentracion.length, 1);
});

test('hhiE4 redondea half-up y se mantiene entre 0 y 10000', () => {
  assert.equal(hhiE4([1, 1, 1], 3), 33333333); // 3 × (33.333...)² = 3333.3333
  assert.equal(hhiE4([0, 0], 0), 0);
  assert.equal(hhiE4([5, 0, 0], 5), 100000000);
});

// ---- Datos reales: controles de la sección 13 ----

test('datos reales: para cada préstamo con Saldo > 0, tramos por vencer + vencidos = Saldo', () => {
  const { vencido, porVencer } = camposDeTramos(catalogosReales());
  const campos = [...vencido, ...porVencer];
  for (const periodo of paqueteReal().periodos) {
    const descuadres = periodo.operaciones.filter((op) => campos.reduce((s, c) => s + aCentavos(op.datos[c]), 0) !== op.saldo);
    assert.equal(descuadres.length, 0, `${periodo.fecha}: ${descuadres.slice(0, 3).map((op) => op.numeroPrestamo).join(', ')}`);
    const { total, bancos } = calcularIndicadores(periodo, catalogosReales());
    assert.equal(total.porVencer + total.vencido, total.saldo, periodo.fecha);
    assert.equal(total.saldo, periodo.calidad.saldoTotalValido, periodo.fecha);
    for (const b of bancos) assert.equal(b.porVencer + b.vencido, b.saldo, `${periodo.fecha} ${b.codigoBanco}`);
    assert.equal(total.valoresInvalidos, 0);
  }
});

test('datos reales: HHI entre 0 y 10000 y participación de los 3 primeros entre 0 y 100', () => {
  for (const periodo of paqueteReal().periodos) {
    for (const c of calcularIndicadores(periodo, catalogosReales()).concentracion) {
      assert.ok(c.hhiE4 > 0 && c.hhiE4 <= 100_000_000, `${periodo.fecha} ${c.ranking} HHI ${c.hhiE4}`);
      assert.ok(c.participacionTop3E4 > 0 && c.participacionTop3E4 <= 1_000_000, `${periodo.fecha} ${c.ranking}`);
      // Con 12 bancos, el HHI nunca baja de 10000 / 12 (todos iguales).
      assert.ok(c.hhiE4 >= Math.floor(100_000_000 / 12), `${periodo.fecha} ${c.ranking}`);
    }
  }
});

// ---- API ----

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

const pedir = async (ruta) => {
  const respuesta = await fetch(base + ruta);
  return { status: respuesta.status, cuerpo: await respuesta.json() };
};

test('GET /api/indicadores devuelve el último período rotulado como análisis adicional', async () => {
  const { status, cuerpo } = await pedir('/indicadores');
  assert.equal(status, 200);
  assert.equal(cuerpo.periodo, '20260930');
  assert.match(cuerpo.analisis, /Análisis adicional/);
  assert.equal(cuerpo.ranking, null);
  assert.equal(cuerpo.morosidad.bancos.length, 12);
  assert.equal(cuerpo.concentracion.length, 6);
  assert.equal(cuerpo.morosidad.total.Saldo, 5152103850.27); // saldo total válido de septiembre (referencia de pruebas)
});

test('GET /api/indicadores?ranking= limita al ranking pedido', async () => {
  const { cuerpo } = await pedir('/indicadores?periodo=20260831&ranking=CONSUMO');
  assert.equal(cuerpo.ranking, 'CONSUMO');
  assert.deepEqual(cuerpo.concentracion.map((c) => c.Ranking), ['CONSUMO']);
  const consumo = paqueteReal().periodos[1].rankings.find((r) => r.ranking === 'CONSUMO').filas;
  assert.equal(Math.round(cuerpo.morosidad.total.Saldo * 100), consumo.reduce((s, f) => s + f.saldoActividad, 0));
});

test('GET /api/indicadores con parámetros inválidos responde con el formato común', async () => {
  assert.equal((await pedir('/indicadores?ranking=VIVIENDA')).cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
  assert.equal((await pedir('/indicadores?periodo=20261231')).cuerpo.error.codigo, 'PERIODO_SIN_DATOS');
});

// Reduce un JSON a su forma: claves y tipos (el primer elemento representa a cada arreglo).
function forma(valor) {
  if (Array.isArray(valor)) return valor.length > 0 ? [forma(valor[0])] : [];
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, forma(valor[clave])]));
  }
  return valor === null ? 'null' : typeof valor;
}

test('contracts/indicadores.json coincide con la forma de GET /api/indicadores', async () => {
  const ejemplo = JSON.parse(fs.readFileSync(new URL('../../contracts/indicadores.json', import.meta.url), 'utf8'));
  const { cuerpo } = await pedir('/indicadores');
  assert.deepEqual(forma(ejemplo), forma(cuerpo));
});
