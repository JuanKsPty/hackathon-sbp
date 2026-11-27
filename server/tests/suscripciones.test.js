// Suscripción a las alertas por correo (#7): API, archivo local y gancho de publicación.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { leerSuscripciones, archivoSuscripciones } from '../src/automation/suscripciones.js';
import { alPublicarPeriodo } from '../src/automation/publicacion.js';
import { calidadDePeriodo } from '../src/routes/formato.js';
import { paqueteReal } from './ayuda.js';

// Las suscripciones de estas pruebas van a una carpeta temporal propia.
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-suscripciones-'));
process.env.STORAGE_DIR = storage;

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  fs.rmSync(storage, { recursive: true, force: true });
});

const suscribir = (cuerpo, perfil = 'publico') =>
  fetch(`${base}/suscripciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Perfil': perfil },
    body: JSON.stringify(cuerpo),
  });

test('cualquier perfil se suscribe y la respuesta no expone el token', async () => {
  const respuesta = await suscribir({ correo: ' Equipo@Ejemplo.com ', bancos: ['104', '111'], rankings: ['COMERCIO'] });
  assert.equal(respuesta.status, 200);
  const cuerpo = await respuesta.json();
  assert.match(cuerpo.aviso, /Datos ficticios/);
  assert.deepEqual(cuerpo.suscripcion.bancos, ['104', '111']);
  assert.equal(cuerpo.suscripcion.correo, 'equipo@ejemplo.com');
  assert.equal(cuerpo.suscripcion.token, undefined);
  assert.equal(archivoSuscripciones(), path.join(storage, 'suscripciones.json'));
  assert.equal(typeof leerSuscripciones()[0].token, 'string');
});

test('suscribirse de nuevo actualiza las preferencias sin duplicar', async () => {
  await suscribir({ correo: 'equipo@ejemplo.com', bancos: [] });
  const lista = leerSuscripciones().filter((s) => s.correo === 'equipo@ejemplo.com');
  assert.equal(lista.length, 1);
  assert.deepEqual(lista[0].bancos, []);
});

test('correo inválido o banco y ranking fuera del catálogo responden 400', async () => {
  for (const cuerpo of [{ correo: 'sin-arroba' }, { correo: 'a@b.com', bancos: ['999'] }, { correo: 'a@b.com', rankings: ['TURISMO'] }]) {
    const respuesta = await suscribir(cuerpo);
    assert.equal(respuesta.status, 400, JSON.stringify(cuerpo));
    assert.equal((await respuesta.json()).error.codigo, 'PARAMETRO_INVALIDO');
  }
});

test('la lista de suscriptores es solo para el Administrador y no trae tokens', async () => {
  const publico = await fetch(`${base}/suscripciones`, { headers: { 'X-Perfil': 'publico' } });
  assert.equal(publico.status, 403);
  const admin = await (await fetch(`${base}/suscripciones`, { headers: { 'X-Perfil': 'admin' } })).json();
  assert.equal(admin.total, admin.suscripciones.length);
  assert.ok(admin.suscripciones.every((s) => s.token === undefined));
});

test('el enlace del correo da de baja y un token desconocido responde 404', async () => {
  const { token } = leerSuscripciones().find((s) => s.correo === 'equipo@ejemplo.com');
  const baja = await fetch(`${base}/suscripciones/baja?token=${token}`);
  assert.equal(baja.status, 200);
  assert.match(await baja.text(), /Te diste de baja/);
  assert.equal(leerSuscripciones().find((s) => s.correo === 'equipo@ejemplo.com').activo, false);
  assert.equal((await fetch(`${base}/suscripciones/baja?token=no-existe`)).status, 404);
});

test('al publicar un período se manda un evento por período solo a los suscriptores activos', async () => {
  await suscribir({ correo: 'activo@ejemplo.com' });
  const { catalogos, periodos } = paqueteReal();
  const agosto = periodos.find((p) => p.fecha === '20260831');
  const enviados = [];
  await alPublicarPeriodo(
    {
      archivo: 'AT03_sintetico_202608.csv',
      catalogos,
      periodos: [{ fecha: agosto.fecha, accion: 'NUEVO', comparacion: null, calidad: calidadDePeriodo(agosto), periodo: agosto }],
    },
    { enviar: async (evento) => enviados.push(evento) },
  );
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].periodo, '20260831');
  assert.deepEqual(enviados[0].destinatarios.map((d) => d.correo), ['activo@ejemplo.com']);
});
