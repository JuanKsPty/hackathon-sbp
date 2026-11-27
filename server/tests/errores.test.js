// Formato común de errores (routes/errores.js): los casos que no salen de las rutas de consulta.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { manejarErrores, rutaNoEncontrada } from '../src/routes/errores.js';

let servidor;
let base;

// App mínima con el mismo manejador de errores que la API.
before(async () => {
  const app = express();
  app.post('/texto', express.text({ limit: '10b' }), (req, res) => res.json({ ok: true }));
  app.post('/json', express.json(), (req, res) => res.json({ ok: true }));
  app.get('/roto', () => {
    throw new Error('falla inesperada');
  });
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  servidor = app.listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

async function pedir(ruta, opciones) {
  const respuesta = await fetch(base + ruta, opciones);
  return { status: respuesta.status, error: (await respuesta.json()).error };
}

test('un cuerpo más grande que el límite responde 413 ARCHIVO_MUY_GRANDE', async () => {
  const { status, error } = await pedir('/texto', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'un texto de más de diez bytes',
  });
  assert.equal(status, 413);
  assert.equal(error.codigo, 'ARCHIVO_MUY_GRANDE');
});

test('un JSON mal formado responde 400 JSON_INVALIDO', async () => {
  const { status, error } = await pedir('/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "regla": ',
  });
  assert.equal(status, 400);
  assert.equal(error.codigo, 'JSON_INVALIDO');
});

test('un error inesperado responde 500 ERROR_INTERNO sin mostrar el detalle interno', async () => {
  const errorOriginal = console.error;
  console.error = () => {};
  try {
    const { status, error } = await pedir('/roto');
    assert.equal(status, 500);
    assert.equal(error.codigo, 'ERROR_INTERNO');
    assert.doesNotMatch(error.mensaje, /falla inesperada/);
  } finally {
    console.error = errorOriginal;
  }
});

test('una ruta que no existe responde 404 RUTA_NO_ENCONTRADA', async () => {
  const { status, error } = await pedir('/no-existe');
  assert.equal(status, 404);
  assert.equal(error.codigo, 'RUTA_NO_ENCONTRADA');
  assert.match(error.mensaje, /GET \/no-existe/);
});
