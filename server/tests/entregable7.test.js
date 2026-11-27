// Evidencia del entregable 7 (#85, #29): la app procesa julio y agosto; después el Administrador
// carga septiembre por POST /api/periodos y la app detecta los cambios de ranking sin editar código.
// Las cifras de control son una referencia propia del equipo: solo viven en las pruebas, nunca en la app (R2).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { CARPETA_DATOS, paqueteReal } from './ayuda.js';

const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-entregable7-'));
process.env.STORAGE_DIR = storage;

const SEPTIEMBRE = 'AT03_sintetico_202609.csv';
let servidor;
let base;

// Igual que al arrancar el servidor: los períodos de data/, pero sin septiembre.
before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos.filter((p) => p.fecha !== '20260930'));
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  fs.rmSync(storage, { recursive: true, force: true });
});

async function pedirJson(ruta, perfil = 'publico') {
  const respuesta = await fetch(base + ruta, { headers: { 'X-Perfil': perfil } });
  assert.equal(respuesta.status, 200, `GET /api${ruta}`);
  return respuesta.json();
}

// { '108': 4, '111': -1, ... } con el Cambio_Posicion de cada banco del ranking.
function cambiosDe(rankings, nombre) {
  const ranking = rankings.find((r) => r.Ranking === nombre);
  return { ranking, cambio: Object.fromEntries(ranking.movimientos.map((m) => [m.Codigo_Banco, m.Cambio_Posicion])) };
}

test('con julio y agosto, la app ya compara jul→ago: en CONSTRUCCION cambia el líder', async () => {
  const { periodos } = await pedirJson('/periodos');
  assert.deepEqual(periodos.map((p) => p.Fecha), ['20260731', '20260831']);

  const movimientos = await pedirJson('/movimientos?desde=20260731&hasta=20260831', 'analista');
  const { ranking, cambio } = cambiosDe(movimientos.rankings, 'CONSTRUCCION');
  assert.equal(ranking.Cambio_Lider, true);
  assert.deepEqual([cambio['110'], cambio['111'], cambio['112'], cambio['106']], [-2, 2, -2, 2]);
});

test('el Administrador carga septiembre por la API y la respuesta trae los cambios ago→sep', async () => {
  const respuesta = await fetch(`${base}/periodos`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv', 'X-Perfil': 'admin', 'X-Nombre-Archivo': SEPTIEMBRE },
    body: fs.readFileSync(path.join(CARPETA_DATOS, SEPTIEMBRE), 'utf8'),
  });
  assert.equal(respuesta.status, 200);
  const [septiembre] = (await respuesta.json()).periodos;
  assert.equal(septiembre.Fecha, '20260930');
  assert.equal(septiembre.Accion, 'NUEVO');
  assert.equal(septiembre.Periodo_Anterior, '20260831');
  assert.equal(septiembre.Calidad.Cascada_Cuadra, true);

  const { rankings } = septiembre.Comparacion;
  const comercio = cambiosDe(rankings, 'COMERCIO');
  assert.equal(comercio.cambio['108'], 4);
  assert.equal(comercio.ranking.Cambio_Lider, true);
  assert.equal(comercio.ranking.Lider_actual.Codigo_Banco, '112');
  assert.equal(cambiosDe(rankings, 'CONSUMO').cambio['106'], 3);
  assert.equal(cambiosDe(rankings, 'AGROPECUARIO').cambio['109'], 2);

  // Los movimientos grandes quedan marcados como significativos según la regla configurable.
  const banco108 = comercio.ranking.movimientos.find((m) => m.Codigo_Banco === '108');
  assert.equal(banco108.Significativo, true);
  assert.ok(banco108.Motivos.includes('cambio_posicion'));
});

test('después de la carga, septiembre es el último período en todas las consultas', async () => {
  const { periodos, ultimo } = await pedirJson('/periodos');
  assert.deepEqual(periodos.map((p) => p.Fecha), ['20260731', '20260831', '20260930']);
  assert.equal(ultimo, '20260930');

  const rankings = await pedirJson('/rankings');
  assert.equal(rankings.periodo, '20260930');
  assert.equal(rankings.archivo, SEPTIEMBRE);

  const movimientos = await pedirJson('/movimientos', 'analista');
  assert.deepEqual([movimientos.periodo_anterior, movimientos.periodo_actual], ['20260831', '20260930']);
});
