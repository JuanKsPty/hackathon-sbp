// Auditoría del backend (#84): perfiles en todas las rutas protegidas, validación de entradas,
// errores sin detalles internos y límite de pedidos de los endpoints que gastan IA.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { manejarErrores } from '../src/routes/errores.js';
import { motivoPedido } from '../src/routes/parametros.js';
import { limitarPedidos } from '../src/middleware/limitePedidos.js';
import { catalogosReales } from './ayuda.js';

const servidores = [];
let base;

async function escuchar(app) {
  const servidor = app.listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

// Sin períodos cargados y sin llave de IA: alcanza para probar perfiles, validaciones y límites.
const appDePrueba = (extra = {}) =>
  crearApp({ almacen: crearAlmacen(catalogosReales(), []), opcionesIA: { apiKey: '' }, ...extra });

before(async () => {
  base = await escuchar(appDePrueba());
});

after(() => servidores.forEach((s) => s.close()));

async function pedir(ruta, { metodo = 'GET', perfil, headers = {}, cuerpo, en = base } = {}) {
  const h = { ...headers };
  if (perfil) h['X-Perfil'] = perfil;
  const respuesta = await fetch(en + ruta, { method: metodo, headers: h, body: cuerpo });
  return { status: respuesta.status, headers: respuesta.headers, texto: await respuesta.text() };
}

// [método, ruta, perfiles que NO pueden]. Lista de todas las rutas de Analista y Administrador.
const PROTEGIDAS = [
  ['GET', '/movimientos', ['publico']],
  ['GET', '/movimientos/descomposicion', ['publico']],
  ['GET', '/exportar/movimientos.csv', ['publico']],
  ['GET', '/explicaciones', ['publico']],
  ['POST', '/periodos', ['publico', 'analista']],
  ['PUT', '/parametros', ['publico', 'analista']],
  ['GET', '/admin/catalogos', ['publico', 'analista']],
  ['GET', '/bitacora', ['publico', 'analista']],
];

test('todas las rutas de Analista y Administrador responden 403 a los demás perfiles', async () => {
  for (const [metodo, ruta, sinPermiso] of PROTEGIDAS) {
    for (const perfil of [undefined, ...sinPermiso]) {
      const { status, texto } = await pedir(ruta, { metodo, perfil });
      assert.equal(status, 403, `${metodo} ${ruta} como ${perfil ?? 'sin header'}`);
      assert.equal(JSON.parse(texto).error.codigo, 'PERFIL_NO_AUTORIZADO');
    }
  }
});

test('motivo no acepta claves del prototipo (toString, constructor) ni listas', () => {
  for (const motivo of ['toString', 'constructor', '__proto__', 'hasOwnProperty', ['E1', 'E2']]) {
    assert.throws(() => motivoPedido(motivo), (e) => e.status === 400 && e.codigo === 'PARAMETRO_INVALIDO', String(motivo));
  }
  assert.equal(motivoPedido('E1'), 'E1');
  assert.equal(motivoPedido(undefined), null);
});

test('un charset no soportado responde 415, no 500', async () => {
  const { status, texto } = await pedir('/parametros', {
    metodo: 'PUT',
    perfil: 'admin',
    headers: { 'Content-Type': 'application/json; charset=utf-99' },
    cuerpo: '{}',
  });
  assert.equal(status, 415);
  assert.equal(JSON.parse(texto).error.codigo, 'FORMATO_NO_SOPORTADO');
});

test('un JSON de más de 1 MB responde 413 con un mensaje sobre la petición, no sobre un archivo', async () => {
  const { status, texto } = await pedir('/ia/preguntar', {
    metodo: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cuerpo: JSON.stringify({ pregunta: 'x'.repeat(1.5 * 1024 * 1024) }),
  });
  assert.equal(status, 413);
  assert.match(JSON.parse(texto).error.mensaje, /cuerpo de la petición/);
});

test('un CSV malformado en la carga responde 422 con detalles, sin traza', async () => {
  const { status, texto } = await pedir('/periodos', {
    metodo: 'POST',
    perfil: 'admin',
    headers: { 'Content-Type': 'text/csv', 'X-Nombre-Archivo': 'malo.csv' },
    cuerpo: 'a,b\n"1,2\n3,4',
  });
  assert.equal(status, 422);
  const { error } = JSON.parse(texto);
  assert.equal(error.codigo, 'ARCHIVO_INVALIDO');
  assert.doesNotMatch(texto, /\bat \S+:\d+:\d+|node_modules|[A-Z]:\\\\/);
});

test('un error inesperado responde 500 genérico: sin mensaje, traza ni rutas internas', () => {
  let estado;
  let cuerpo;
  const res = { status: (s) => ((estado = s), res), json: (c) => ((cuerpo = c), res) };
  const original = console.error;
  console.error = () => {}; // el detalle va a la consola del servidor; aquí no hace falta verlo
  try {
    manejarErrores(new Error('ENOENT: C:\\app\\storage\\secreto.json'), { originalUrl: '/api/x' }, res, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(estado, 500);
  assert.deepEqual(cuerpo, { error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' } });
});

test('límite de pedidos de IA: 429 con Retry-After por IP; otra IP sigue pudiendo', async () => {
  const conLimite = await escuchar(appDePrueba({ limiteIA: { maximo: 2, ventanaMs: 60_000 } }));
  const preguntar = (ip) =>
    pedir('/ia/preguntar', {
      metodo: 'POST',
      en: conLimite,
      headers: { 'Content-Type': 'application/json', ...(ip ? { 'X-Forwarded-For': ip } : {}) },
      cuerpo: JSON.stringify({ pregunta: '¿Quién lidera HIPOTECARIO?' }),
    });

  assert.equal((await preguntar()).status, 200);
  assert.equal((await preguntar()).status, 200);
  const bloqueado = await preguntar();
  assert.equal(bloqueado.status, 429);
  assert.equal(JSON.parse(bloqueado.texto).error.codigo, 'DEMASIADOS_PEDIDOS');
  assert.ok(Number(bloqueado.headers.get('retry-after')) > 0);

  // Detrás de nginx/Dokploy la IP real llega en X-Forwarded-For desde un proxy local: es otro contador.
  assert.equal((await preguntar('203.0.113.7')).status, 200);
});

test('límite de pedidos: un 403 por perfil no gasta el cupo de la IA', async () => {
  const conLimite = await escuchar(appDePrueba({ limiteIA: { maximo: 1, ventanaMs: 60_000 } }));
  for (let i = 0; i < 3; i++) {
    assert.equal((await pedir('/explicaciones', { en: conLimite })).status, 403);
  }
});

test('limitarPedidos: la ventana se reinicia y el tope global también corta', () => {
  let ahora = 0;
  const limite = limitarPedidos({ maximo: 1, ventanaMs: 1000, maximoGlobal: 2, ventanaGlobalMs: 10_000 }, () => ahora);
  const correr = (ip) => {
    let resultado;
    const res = { set: () => res };
    limite({ ip }, res, (error) => (resultado = error?.status ?? 200));
    return resultado;
  };
  assert.equal(correr('a'), 200);
  assert.equal(correr('a'), 429); // misma IP, misma ventana
  assert.equal(correr('b'), 200); // otra IP
  ahora = 1500; // la ventana por IP venció
  assert.equal(correr('a'), 429); // pero ya se usaron los 2 del tope global
  ahora = 11_000; // venció también la ventana global
  assert.equal(correr('a'), 200);
});
