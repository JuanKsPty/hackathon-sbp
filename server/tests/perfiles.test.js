import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import express from 'express';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { manejarErrores } from '../src/routes/errores.js';
import { leerPerfil, requierePerfil, requiereOpcion, opcionesDe, OPCIONES, PERFILES } from '../src/middleware/perfiles.js';
import { catalogosReales } from './ayuda.js';

const servidores = [];
let baseApp; // la app real (crearApp)
let basePrueba; // una app mínima con rutas protegidas, para probar el 403

async function escuchar(app) {
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

before(async () => {
  baseApp = await escuchar(crearApp({ almacen: crearAlmacen(catalogosReales(), []) }));

  // Simula los endpoints de administrador: así se protege la carga de un período (#29).
  const prueba = express();
  prueba.use('/api', leerPerfil);
  prueba.post('/api/periodos', requierePerfil('admin'), (req, res) => res.status(201).json({ ok: true }));
  prueba.get('/api/comparar', requiereOpcion('comparar_periodos'), (req, res) => res.json({ ok: true }));
  prueba.use(manejarErrores);
  basePrueba = await escuchar(prueba);
});

after(() => servidores.forEach((servidor) => servidor.close()));

async function pedir(url, { metodo = 'GET', perfil } = {}) {
  const headers = perfil === undefined ? {} : { 'X-Perfil': perfil };
  const respuesta = await fetch(url, { method: metodo, headers });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test('sin X-Perfil el perfil es publico, sin opciones de administrador', async () => {
  const { status, cuerpo } = await pedir(`${baseApp}/perfil`);
  assert.equal(status, 200);
  assert.equal(cuerpo.perfil, 'publico');
  assert.equal(cuerpo.nombre, 'Público');
  const opciones = cuerpo.opciones.map((o) => o.opcion);
  assert.deepEqual(opciones, ['consultar_rankings', 'descargar']);
  assert.deepEqual(cuerpo.perfiles.map((p) => p.perfil), ['publico', 'analista', 'admin']);
});

test('X-Perfil admin trae todas las opciones; acepta mayúsculas y espacios', async () => {
  const { cuerpo } = await pedir(`${baseApp}/perfil`, { perfil: ' Admin ' });
  assert.equal(cuerpo.perfil, 'admin');
  assert.equal(cuerpo.nombre, 'Administrador');
  assert.deepEqual(cuerpo.opciones.map((o) => o.opcion), OPCIONES.map((o) => o.opcion));
});

test('X-Perfil desconocido responde 400 PARAMETRO_INVALIDO con el formato común', async () => {
  for (const ruta of ['/perfil', '/salud', '/catalogos']) {
    const { status, cuerpo } = await pedir(`${baseApp}${ruta}`, { perfil: 'root' });
    assert.equal(status, 400, ruta);
    assert.equal(cuerpo.error.codigo, 'PARAMETRO_INVALIDO', ruta);
    assert.match(cuerpo.error.mensaje, /X-Perfil/);
  }
});

test('las consultas siguen abiertas para el perfil publico', async () => {
  const { status } = await pedir(`${baseApp}/catalogos`);
  assert.equal(status, 200);
});

test('cargar un período: publico y analista reciben 403, admin pasa', async () => {
  for (const perfil of [undefined, 'publico', 'analista']) {
    const { status, cuerpo } = await pedir(`${basePrueba}/periodos`, { metodo: 'POST', perfil });
    assert.equal(status, 403, `perfil ${perfil}`);
    assert.equal(cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
    assert.match(cuerpo.error.mensaje, /Administrador/);
  }
  const { status } = await pedir(`${basePrueba}/periodos`, { metodo: 'POST', perfil: 'admin' });
  assert.equal(status, 201);
});

test('requiereOpcion usa la tabla de opciones: comparar períodos es de analista y admin', async () => {
  assert.equal((await pedir(`${basePrueba}/comparar`)).status, 403);
  assert.equal((await pedir(`${basePrueba}/comparar`, { perfil: 'analista' })).status, 200);
  assert.equal((await pedir(`${basePrueba}/comparar`, { perfil: 'admin' })).status, 200);
  assert.throws(() => requiereOpcion('no_existe'), /no está en la tabla/);
});

test('cada perfil tiene las opciones del anterior más las suyas', () => {
  for (const fila of OPCIONES) {
    assert.ok(fila.perfiles.every((perfil) => PERFILES.includes(perfil)), fila.opcion);
  }
  const claves = (perfil) => opcionesDe(perfil).map((o) => o.opcion);
  assert.ok(claves('publico').every((o) => claves('analista').includes(o)));
  assert.ok(claves('analista').every((o) => claves('admin').includes(o)));
  assert.ok(claves('analista').length > claves('publico').length);
  assert.ok(claves('admin').length > claves('analista').length);
});

test('contracts/perfil.json es la respuesta real de GET /api/perfil para admin', async () => {
  const ejemplo = JSON.parse(fs.readFileSync(new URL('../../contracts/perfil.json', import.meta.url), 'utf8'));
  const { cuerpo } = await pedir(`${baseApp}/perfil`, { perfil: 'admin' });
  assert.deepEqual(ejemplo, cuerpo);
});
