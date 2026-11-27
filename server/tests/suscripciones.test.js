// Suscripción a las alertas por correo (#7): doble confirmación, límite de pedidos,
// archivo local y gancho de publicación.
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { leerSuscripciones, archivoSuscripciones, confirmar, solicitarSuscripcion, VIGENCIA_CONFIRMACION_MS } from '../src/automation/suscripciones.js';
import { alPublicarPeriodo } from '../src/automation/publicacion.js';
import { rutasDeSuscripciones } from '../src/routes/suscripciones.js';
import { leerPerfil } from '../src/middleware/perfiles.js';
import { rutaNoEncontrada, manejarErrores } from '../src/routes/errores.js';
import { calidadDePeriodo } from '../src/routes/formato.js';
import { paqueteReal } from './ayuda.js';

// Las suscripciones de estas pruebas van a una carpeta temporal propia.
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-suscripciones-'));
process.env.STORAGE_DIR = storage;

const servidores = [];
let base;
let enviados;
let reloj;

// App solo con las rutas de suscripción, con el envío a Zapier y el reloj simulados.
async function arrancar({ limite } = {}) {
  const { catalogos, periodos } = paqueteReal();
  const app = express();
  app.use(express.json());
  app.use('/api', leerPerfil);
  const opciones = {
    enviar: async (evento) => {
      enviados.push(evento);
      return { estado: 'ENVIADO', detalle: null };
    },
    ahora: () => reloj,
  };
  if (limite) opciones.limite = limite;
  app.use('/api', rutasDeSuscripciones(crearAlmacen(catalogos, periodos), opciones));
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

before(async () => {
  base = await arrancar({ limite: { maximo: 100, ventanaMs: 60_000, esperaMismoCorreoMs: 60_000 } });
});

beforeEach(() => {
  enviados = [];
  reloj = new Date(reloj ? reloj.getTime() + 120_000 : '2026-11-27T15:00:00Z'); // siempre pasa la espera por correo
});

after(() => {
  servidores.forEach((s) => s.close());
  fs.rmSync(storage, { recursive: true, force: true });
});

const pedir = (cuerpo, { perfil = 'publico', en = base } = {}) =>
  fetch(`${en}/suscripciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Perfil': perfil },
    body: JSON.stringify(cuerpo),
  });

const tokenDeConfirmacion = () => new URL(enviados.at(-1).enlace_confirmacion).searchParams.get('token');
const buscar = (correo) => leerSuscripciones().find((s) => s.correo === correo);

test('pedir una suscripción no la activa: manda el correo de confirmación y no expone tokens', async () => {
  const respuesta = await pedir({ correo: ' Equipo@Ejemplo.com ', bancos: ['104', '111'], rankings: ['COMERCIO'] });
  assert.equal(respuesta.status, 200);
  const cuerpo = await respuesta.json();
  assert.match(cuerpo.aviso, /Datos ficticios/);
  assert.equal(cuerpo.confirmacion_enviada, true);
  assert.equal(cuerpo.suscripcion.correo, 'equipo@ejemplo.com');
  assert.equal(cuerpo.suscripcion.activo, false);
  assert.equal(cuerpo.suscripcion.pendiente_de_confirmar, true);
  assert.equal(cuerpo.suscripcion.token, undefined);
  assert.equal(cuerpo.suscripcion.confirmacion, undefined);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].evento, 'confirmacion_suscripcion');
  assert.deepEqual(enviados[0].bancos, ['104', '111']);
  assert.equal(archivoSuscripciones(), path.join(storage, 'suscripciones.json'));
});

test('el enlace del correo activa la suscripción y avisa el alta a Zapier', async () => {
  await pedir({ correo: 'activa@ejemplo.com', bancos: ['108'] });
  const confirmacion = await fetch(`${base}/suscripciones/confirmar?token=${tokenDeConfirmacion()}`);
  assert.equal(confirmacion.status, 200);
  assert.match(await confirmacion.text(), /Suscripción confirmada/);
  const s = buscar('activa@ejemplo.com');
  assert.equal(s.activo, true);
  assert.deepEqual(s.bancos, ['108']);
  assert.equal(s.confirmacion, null);
  assert.deepEqual(enviados.map((e) => [e.evento, e.accion]), [['confirmacion_suscripcion', undefined], ['suscripcion_actualizada', 'alta']]);
});

test('una solicitud ajena no cambia una suscripción activa hasta que se confirme', async () => {
  await pedir({ correo: 'activa@ejemplo.com', bancos: ['101'] });
  assert.deepEqual(buscar('activa@ejemplo.com').bancos, ['108']);
  assert.equal(buscar('activa@ejemplo.com').activo, true);
});

test('un token desconocido o vencido no confirma', async () => {
  assert.equal((await fetch(`${base}/suscripciones/confirmar?token=no-existe`)).status, 404);
  const { catalogos } = paqueteReal();
  const hace = new Date('2026-11-20T00:00:00Z');
  const s = solicitarSuscripcion({ correo: 'vieja@ejemplo.com' }, catalogos, hace);
  assert.equal(confirmar(s.confirmacion.token, new Date(hace.getTime() + VIGENCIA_CONFIRMACION_MS + 1)), null);
  assert.equal(buscar('vieja@ejemplo.com').activo, false);
});

test('correo inválido o banco y ranking fuera del catálogo responden 400', async () => {
  for (const cuerpo of [{ correo: 'sin-arroba' }, { correo: 'a@b.com', bancos: ['999'] }, { correo: 'a@b.com', rankings: ['TURISMO'] }]) {
    const respuesta = await pedir(cuerpo);
    assert.equal(respuesta.status, 400, JSON.stringify(cuerpo));
    assert.equal((await respuesta.json()).error.codigo, 'PARAMETRO_INVALIDO');
  }
  assert.equal(enviados.length, 0);
});

test('no se reenvía la confirmación al mismo correo antes de 1 minuto', async () => {
  assert.equal((await pedir({ correo: 'repetido@ejemplo.com' })).status, 200);
  const segunda = await pedir({ correo: 'repetido@ejemplo.com' });
  assert.equal(segunda.status, 429);
  assert.equal((await segunda.json()).error.codigo, 'DEMASIADOS_PEDIDOS');
  assert.ok(Number(segunda.headers.get('retry-after')) > 0);
  assert.equal(enviados.length, 1);
});

test('una misma IP no puede pedir más que el límite', async () => {
  const conLimite = await arrancar({ limite: { maximo: 2, ventanaMs: 60_000, esperaMismoCorreoMs: 0 } });
  assert.equal((await pedir({ correo: 'uno@ejemplo.com' }, { en: conLimite })).status, 200);
  assert.equal((await pedir({ correo: 'dos@ejemplo.com' }, { en: conLimite })).status, 200);
  const tercera = await pedir({ correo: 'tres@ejemplo.com' }, { en: conLimite });
  assert.equal(tercera.status, 429);
  assert.equal(buscar('tres@ejemplo.com'), undefined);
});

test('la lista de suscriptores es solo para el Administrador y no trae tokens', async () => {
  const publico = await fetch(`${base}/suscripciones`, { headers: { 'X-Perfil': 'publico' } });
  assert.equal(publico.status, 403);
  const admin = await (await fetch(`${base}/suscripciones`, { headers: { 'X-Perfil': 'admin' } })).json();
  assert.equal(admin.total, admin.suscripciones.length);
  assert.ok(admin.suscripciones.every((s) => s.token === undefined && s.confirmacion === undefined));
});

test('el enlace de baja desactiva la suscripción y avisa a Zapier', async () => {
  const { token } = buscar('activa@ejemplo.com');
  const baja = await fetch(`${base}/suscripciones/baja?token=${token}`);
  assert.equal(baja.status, 200);
  assert.match(await baja.text(), /Te diste de baja/);
  assert.equal(buscar('activa@ejemplo.com').activo, false);
  assert.equal(enviados.at(-1).accion, 'baja');
  assert.equal((await fetch(`${base}/suscripciones/baja?token=no-existe`)).status, 404);
});

test('la app completa monta las rutas de suscripción', async () => {
  const { catalogos, periodos } = paqueteReal();
  const servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}/api/suscripciones/confirmar?token=x`);
  assert.equal(respuesta.status, 404);
  assert.match(await respuesta.text(), /Enlace no válido/);
});

test('al publicar un período se manda un evento por período solo a los suscriptores confirmados', async () => {
  await pedir({ correo: 'confirmado@ejemplo.com' });
  await fetch(`${base}/suscripciones/confirmar?token=${tokenDeConfirmacion()}`);
  reloj = new Date(reloj.getTime() + 120_000);
  await pedir({ correo: 'sin-confirmar@ejemplo.com' });

  const { catalogos, periodos } = paqueteReal();
  const agosto = periodos.find((p) => p.fecha === '20260831');
  const eventos = [];
  await alPublicarPeriodo(
    {
      archivo: 'AT03_sintetico_202608.csv',
      catalogos,
      periodos: [{ fecha: agosto.fecha, accion: 'NUEVO', comparacion: null, calidad: calidadDePeriodo(agosto), periodo: agosto }],
    },
    { enviar: async (evento) => eventos.push(evento) },
  );
  assert.equal(eventos.length, 1);
  assert.equal(eventos[0].periodo, '20260831');
  assert.deepEqual(eventos[0].destinatarios.map((d) => d.correo), ['confirmado@ejemplo.com']);
});
