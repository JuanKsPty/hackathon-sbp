import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { parse } from 'csv-parse/sync';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { csvRankings, csvMovimientos, COLUMNAS } from '../src/engine/index.js';
import { paqueteReal } from './ayuda.js';

// Respuesta de ejemplo con el formato de /api/movimientos (contracts/movimientos.json, issue #1).
// Cifras ilustrativas: solo prueban el aplanado a CSV.
const MOVIMIENTOS_EJEMPLO = {
  periodo_anterior: '20260831',
  periodo_actual: '20260930',
  rankings: [
    {
      Ranking: 'HIPOTECARIO',
      movimientos: [
        { Codigo_Banco: '104', Banco: 'Banco Pacifico', Posicion_anterior: 3, Posicion_actual: 1, Cambio_Posicion: 2, Saldo_anterior: 1250000, Saldo_actual: 1400000.5, Var_Saldo: 150000.5, Var_Saldo_Pct: 12, Significativo: true, Motivos: ['cambio_posicion', 'cambio_lider'] },
        { Codigo_Banco: '112', Banco: 'Banco Solidez', Posicion_anterior: 12, Posicion_actual: 12, Cambio_Posicion: 0, Saldo_anterior: 0, Saldo_actual: 0, Var_Saldo: 0, Var_Saldo_Pct: null, Significativo: false, Motivos: [] },
      ],
    },
  ],
};

// El entregable 5 compara períodos: es de Analista y Administrador (sección 10).
const COMO_ANALISTA = { 'X-Perfil': 'analista' };

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const obtenerMovimientos = async () => MOVIMIENTOS_EJEMPLO;
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos), obtenerMovimientos }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

test('descarga de rankings.csv con todos los períodos (entregable 2)', async () => {
  const respuesta = await fetch(`${base}/exportar/rankings.csv`);
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /^text\/csv; charset=utf-8/);
  assert.match(respuesta.headers.get('content-disposition'), /^attachment; filename="?rankings_todos\.csv"?$/);
  const texto = await respuesta.text();
  assert.equal(texto, csvRankings(paqueteReal().periodos));
  assert.equal(parse(texto, { columns: true }).length, 216);
});

test('descarga filtrada por período', async () => {
  const respuesta = await fetch(`${base}/exportar/rankings.csv?periodo=20260930`);
  assert.match(respuesta.headers.get('content-disposition'), /rankings_20260930\.csv/);
  const filas = parse(await respuesta.text(), { columns: true });
  assert.equal(filas.length, 72);
  assert.equal(filas.every((f) => f.Fecha === '20260930'), true);
});

test('descargas de subactividades, calidad, excluidas y alertas (entregables 3 y 4)', async () => {
  const esperadas = { 'subactividades.csv': 792, 'calidad.csv': 3, 'excluidas.csv': null, 'alertas.csv': 0 };
  for (const [archivo, filasEsperadas] of Object.entries(esperadas)) {
    const respuesta = await fetch(`${base}/exportar/${archivo}`);
    assert.equal(respuesta.status, 200, archivo);
    const filas = parse(await respuesta.text(), { columns: true });
    if (filasEsperadas !== null) assert.equal(filas.length, filasEsperadas, archivo);
  }
});

test('parámetros inválidos responden JSON con el formato común', async () => {
  const respuesta = await fetch(`${base}/exportar/calidad.csv?periodo=20261231`);
  assert.equal(respuesta.status, 404);
  assert.equal((await respuesta.json()).error.codigo, 'PERIODO_SIN_DATOS');
});

test('movimientos.csv (entregable 5) aplana la respuesta de /api/movimientos', async () => {
  const respuesta = await fetch(`${base}/exportar/movimientos.csv?desde=20260831&hasta=20260930`, { headers: COMO_ANALISTA });
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-disposition'), /movimientos_20260831_20260930\.csv/);
  const texto = await respuesta.text();
  assert.equal(texto.split('\n')[0], COLUMNAS.movimientos.join(','));
  const [sube, igual] = parse(texto, { columns: true });
  assert.equal(sube.Saldo_actual, '1400000.50');
  assert.equal(sube.Var_Saldo_Pct, '12.0000');
  assert.equal(sube.Significativo, 'SI');
  assert.equal(sube.Motivos, 'cambio_posicion | cambio_lider');
  assert.equal(igual.Var_Saldo_Pct, ''); // Saldo_anterior = 0
  assert.equal(texto, csvMovimientos(MOVIMIENTOS_EJEMPLO));
});

test('sin el cálculo de movimientos conectado, movimientos.csv responde 501', async () => {
  const sinMovimientos = crearApp({ almacen: crearAlmacen(paqueteReal().catalogos, paqueteReal().periodos) }).listen(0, '127.0.0.1');
  await once(sinMovimientos, 'listening');
  try {
    const respuesta = await fetch(`http://127.0.0.1:${sinMovimientos.address().port}/api/exportar/movimientos.csv`, {
      headers: COMO_ANALISTA,
    });
    assert.equal(respuesta.status, 501);
    assert.equal((await respuesta.json()).error.codigo, 'NO_DISPONIBLE');
  } finally {
    sinMovimientos.close();
  }
});
