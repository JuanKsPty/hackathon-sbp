// La prueba de humo (scripts/humo.js, #85) pasa contra la app levantada en un puerto libre
// y, contra una URL donde no hay nada, informa cada control como fallido sin romperse.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { correrHumo, baseDeLaApi, CONTROLES } from '../scripts/humo.js';
import { paqueteReal } from './ayuda.js';

const correr = promisify(execFile);
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-humo-'));
process.env.STORAGE_DIR = storage;

let servidor;
let raiz;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  raiz = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  fs.rmSync(storage, { recursive: true, force: true });
});

test('todos los controles de humo pasan contra la app local', async () => {
  const resultados = await correrHumo(raiz);
  assert.equal(resultados.length, CONTROLES.length);
  const fallidos = resultados.filter((r) => !r.ok);
  assert.deepEqual(fallidos, []);
});

test('npm run humo con BASE_URL imprime cada control y sale con código 0', async () => {
  const script = fileURLToPath(new URL('../scripts/humo.js', import.meta.url));
  // Asíncrono: el servidor de prueba corre en este mismo proceso y tiene que poder responder.
  const { stdout } = await correr(process.execPath, [script], { env: { ...process.env, BASE_URL: `${raiz}/api/` } });
  assert.match(stdout, new RegExp(`Prueba de humo contra ${raiz}/api`));
  assert.match(stdout, new RegExp(`${CONTROLES.length} de ${CONTROLES.length} controles OK`));
});

test('BASE_URL sirve con o sin /api y con barra al final', () => {
  assert.equal(baseDeLaApi('https://app.ejemplo'), 'https://app.ejemplo/api');
  assert.equal(baseDeLaApi('https://app.ejemplo/'), 'https://app.ejemplo/api');
  assert.equal(baseDeLaApi('https://app.ejemplo/api/'), 'https://app.ejemplo/api');
});

test('si la app no responde, cada control queda como fallido con su motivo', async () => {
  const cerrado = crearApp({ almacen: crearAlmacen(paqueteReal().catalogos, []) }).listen(0, '127.0.0.1');
  await once(cerrado, 'listening');
  const url = `http://127.0.0.1:${cerrado.address().port}`;
  cerrado.close();
  await once(cerrado, 'close');

  const resultados = await correrHumo(url);
  assert.equal(resultados.every((r) => r.ok === false && r.detalle), true);
});
