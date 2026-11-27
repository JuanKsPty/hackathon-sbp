import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { registrarOperacion, leerOperaciones, archivoBitacora, carpetaStorage } from '../src/datos/bitacora.js';
import { carpetaStorage as carpetaDeStorage } from '../src/datos/storage.js';
import { catalogosReales } from './ayuda.js';

// La bitácora de estas pruebas va a una carpeta temporal propia.
const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-bitacora-'));
process.env.STORAGE_DIR = carpeta;

let servidor;
let base;

before(async () => {
  servidor = crearApp({ almacen: crearAlmacen(catalogosReales(), []) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  fs.rmSync(carpeta, { recursive: true, force: true });
});

async function pedirBitacora(perfil) {
  const headers = perfil === undefined ? {} : { 'X-Perfil': perfil };
  const respuesta = await fetch(`${base}/bitacora`, { headers });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test('bitacora.js reexporta carpetaStorage de storage.js (la usa la carga de período, #29)', () => {
  assert.equal(carpetaStorage, carpetaDeStorage);
  assert.equal(carpetaStorage(), carpeta);
});

test('sin operaciones, la bitácora está vacía', () => {
  assert.equal(fs.existsSync(archivoBitacora()), false);
  assert.deepEqual(leerOperaciones(), []);
});

test('registrarOperacion agrega una línea JSON con qué, archivo, cuándo, perfil y resultado', () => {
  const registro = registrarOperacion({
    operacion: 'carga_periodo',
    archivo: 'AT03_sintetico_202610.csv',
    perfil: 'admin',
    resultado: 'exito',
    detalle: 'Período 20261031',
  });
  assert.match(registro.fecha_hora, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.equal(archivoBitacora(), path.join(carpeta, 'operaciones.jsonl'));
  const lineas = fs.readFileSync(archivoBitacora(), 'utf8').trim().split('\n');
  assert.equal(lineas.length, 1);
  assert.deepEqual(JSON.parse(lineas[0]), registro);
});

test('registrarOperacion exige operacion, perfil y resultado', () => {
  assert.throws(() => registrarOperacion({ operacion: 'carga_periodo', perfil: 'admin' }), /resultado/);
});

test('leerOperaciones devuelve la más reciente primero y salta líneas dañadas', () => {
  fs.appendFileSync(archivoBitacora(), 'esto no es JSON\n');
  registrarOperacion({ operacion: 'cambio_parametros', perfil: 'admin', resultado: 'error', detalle: 'valor inválido' });
  const operaciones = leerOperaciones();
  assert.deepEqual(operaciones.map((o) => o.operacion), ['cambio_parametros', 'carga_periodo']);
  assert.equal(operaciones[1].archivo, 'AT03_sintetico_202610.csv');
  assert.equal(operaciones[0].archivo, null);
});

test('GET /api/bitacora: publico y analista reciben 403 y el intento queda registrado', async () => {
  for (const perfil of [undefined, 'analista']) {
    const { status, cuerpo } = await pedirBitacora(perfil);
    assert.equal(status, 403);
    assert.equal(cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
  }
  const [ultimo, penultimo] = leerOperaciones();
  assert.deepEqual(
    [ultimo.operacion, ultimo.perfil, ultimo.resultado, ultimo.detalle],
    ['acceso_denegado', 'analista', 'rechazado', 'GET /api/bitacora'],
  );
  assert.equal(penultimo.perfil, 'publico');
});

test('GET /api/bitacora con perfil admin devuelve las operaciones', async () => {
  const { status, cuerpo } = await pedirBitacora('admin');
  assert.equal(status, 200);
  assert.equal(cuerpo.total, cuerpo.operaciones.length);
  assert.equal(cuerpo.total, 4); // carga, cambio de parámetros y 2 accesos denegados
  assert.equal(cuerpo.operaciones[0].operacion, 'acceso_denegado');
});

test('contracts/bitacora.json tiene los mismos campos que GET /api/bitacora', async () => {
  const ejemplo = JSON.parse(fs.readFileSync(new URL('../../contracts/bitacora.json', import.meta.url), 'utf8'));
  const { cuerpo } = await pedirBitacora('admin');
  assert.deepEqual(Object.keys(ejemplo).sort(), Object.keys(cuerpo).sort());
  for (const operacion of ejemplo.operaciones) {
    assert.deepEqual(Object.keys(operacion).sort(), Object.keys(cuerpo.operaciones[0]).sort());
  }
});
