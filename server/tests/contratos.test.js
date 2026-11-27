// Cada ejemplo JSON de /contracts tiene la misma forma que la respuesta real de la API (#85).
// Se comparan claves y tipos en todos los niveles, no los valores: los números de los ejemplos
// son ilustrativos (R2). Cada endpoint se pide con el perfil que lo puede usar (header X-Perfil).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { calidadDePeriodo } from '../src/routes/formato.js';
import { eventoPeriodoPublicado, eventoConfirmacion, eventoSuscripcion } from '../src/automation/zapier.js';
import { CARPETA_DATOS, paqueteReal } from './ayuda.js';

// Bitácora, parámetros y copias de la carga van a una carpeta temporal propia.
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-contratos-'));
process.env.STORAGE_DIR = storage;

const CARPETA_CONTRATOS = new URL('../../contracts/', import.meta.url);

// Qué petición devuelve cada ejemplo y con qué perfil. carga.json es la respuesta del POST de before().
const PETICIONES = {
  'periodos.json': { ruta: '/periodos' },
  'catalogos.json': { ruta: '/catalogos' },
  'rankings.json': { ruta: '/rankings' },
  'subactividades.json': { ruta: '/subactividades' },
  'calidad.json': { ruta: '/calidad' },
  'excluidas.json': { ruta: '/excluidas' },
  'indicadores.json': { ruta: '/indicadores' },
  'verificacion.json': { ruta: '/verificacion?banco=101' }, // el ejemplo está acotado a un banco
  'parametros.json': { ruta: '/parametros' },
  'movimientos.json': { ruta: '/movimientos', perfil: 'analista' },
  'perfil.json': { ruta: '/perfil', perfil: 'admin' },
  'catalogos-admin.json': { ruta: '/admin/catalogos', perfil: 'admin' },
  'bitacora.json': { ruta: '/bitacora', perfil: 'admin' },
  'carga.json': { carga: true },
};

// Eventos que la app manda a Zapier (#7, contracts/eventos-zapier.md): no son respuestas de la API,
// así que cada ejemplo se compara con el evento real que arma automation/zapier.js con los datos del reto.
const suscriptor = { correo: 'equipo@ejemplo.com', bancos: [], rankings: [], activo: true, token: 't-1' };
const EVENTOS = {
  'evento-periodo-publicado.json': () => {
    const { catalogos, periodos } = paqueteReal();
    const septiembre = periodos.find((p) => p.fecha === '20260930');
    const comparacion = crearObtenerMovimientos(crearAlmacen(catalogos, periodos))({ desde: '20260831', hasta: '20260930' });
    const publicado = { fecha: septiembre.fecha, accion: 'NUEVO', comparacion, calidad: calidadDePeriodo(septiembre), periodo: septiembre };
    return eventoPeriodoPublicado(publicado, { archivo: 'AT03_sintetico_202609.csv', catalogos, suscriptores: [suscriptor] });
  },
  'evento-confirmacion-suscripcion.json': () =>
    eventoConfirmacion({ ...suscriptor, confirmacion: { token: 'c-1', bancos: ['104'], rankings: [], solicitado_en: '2026-11-27T15:00:00Z' } }),
  'evento-suscripcion-actualizada.json': () => eventoSuscripcion({ ...suscriptor, bancos: ['104'] }, 'alta'),
};

let servidor;
let base;
let respuestaDeCarga;

// La app arranca con julio y agosto y el Administrador carga septiembre por la API:
// así carga.json se compara con una carga real y la bitácora tiene operaciones.
before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos.filter((p) => p.fecha !== '20260930'));
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;

  const septiembre = fs.readFileSync(path.join(CARPETA_DATOS, 'AT03_sintetico_202609.csv'), 'utf8');
  const respuesta = await fetch(`${base}/periodos`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv', 'X-Perfil': 'admin', 'X-Nombre-Archivo': 'AT03_sintetico_202609.csv' },
    body: septiembre,
  });
  assert.equal(respuesta.status, 200);
  respuestaDeCarga = await respuesta.json();
});

after(() => {
  servidor.close();
  fs.rmSync(storage, { recursive: true, force: true });
});

async function pedir({ ruta, perfil = 'publico' }) {
  const respuesta = await fetch(base + ruta, { headers: { 'X-Perfil': perfil } });
  assert.equal(respuesta.status, 200, `GET /api${ruta} con perfil ${perfil} respondió ${respuesta.status}`);
  return respuesta.json();
}

// Diferencias de forma entre el ejemplo y la respuesta real: claves y tipos, no valores.
// - null es "sin valor" (por ejemplo Var_Saldo_Pct o Comparacion): no se compara su tipo.
// - En un arreglo, cada elemento del ejemplo se compara con el primero de la respuesta.
function diferenciasDeForma(ejemplo, real, ruta = '$') {
  if (ejemplo === null || real === null) return [];
  if (Array.isArray(ejemplo) || Array.isArray(real)) {
    if (!Array.isArray(ejemplo) || !Array.isArray(real)) return [`${ruta}: solo uno de los dos es un arreglo`];
    if (ejemplo.length === 0 || real.length === 0) return [];
    return ejemplo.flatMap((elemento, i) => diferenciasDeForma(elemento, real[0], `${ruta}[${i}]`));
  }
  if (typeof ejemplo !== typeof real) return [`${ruta}: ${typeof ejemplo} en el ejemplo y ${typeof real} en la API`];
  if (typeof ejemplo !== 'object') return [];

  const faltan = Object.keys(real).filter((clave) => !(clave in ejemplo)).map((clave) => `${ruta}.${clave}: falta en el ejemplo`);
  const sobran = Object.keys(ejemplo).filter((clave) => !(clave in real)).map((clave) => `${ruta}.${clave}: no está en la API`);
  const internas = Object.keys(ejemplo)
    .filter((clave) => clave in real)
    .flatMap((clave) => diferenciasDeForma(ejemplo[clave], real[clave], `${ruta}.${clave}`));
  return [...faltan, ...sobran, ...internas];
}

const leerEjemplo = (archivo) => JSON.parse(fs.readFileSync(new URL(archivo, CARPETA_CONTRATOS), 'utf8'));

test('cada ejemplo JSON de /contracts tiene su prueba de forma', () => {
  const ejemplos = fs.readdirSync(CARPETA_CONTRATOS).filter((archivo) => archivo.endsWith('.json')).sort();
  assert.deepEqual(ejemplos, [...Object.keys(PETICIONES), ...Object.keys(EVENTOS)].sort());
});

for (const [archivo, armarEvento] of Object.entries(EVENTOS)) {
  test(`contracts/${archivo} tiene la forma del evento que se manda a Zapier`, () => {
    assert.deepEqual(diferenciasDeForma(leerEjemplo(archivo), armarEvento()), []);
  });
}

for (const [archivo, peticion] of Object.entries(PETICIONES)) {
  const descripcion = peticion.carga ? 'POST /api/periodos (admin)' : `GET /api${peticion.ruta} (${peticion.perfil ?? 'publico'})`;
  test(`contracts/${archivo} tiene la forma de ${descripcion}`, async () => {
    const real = peticion.carga ? respuestaDeCarga : await pedir(peticion);
    assert.deepEqual(diferenciasDeForma(leerEjemplo(archivo), real), []);
  });
}

test('el comparador de forma detecta claves y tipos distintos', () => {
  assert.deepEqual(diferenciasDeForma({ a: 1, b: [{ c: 'x' }] }, { a: 2, b: [{ c: 'y' }] }), []);
  assert.deepEqual(diferenciasDeForma({ a: 1 }, { a: '1' }), ['$.a: number en el ejemplo y string en la API']);
  assert.deepEqual(diferenciasDeForma({ a: 1 }, { a: 1, b: 2 }), ['$.b: falta en el ejemplo']);
  assert.deepEqual(diferenciasDeForma({ a: 1, b: 2 }, { a: 1 }), ['$.b: no está en la API']);
  assert.deepEqual(diferenciasDeForma({ a: [1] }, { a: 1 }), ['$.a: solo uno de los dos es un arreglo']);
  assert.deepEqual(diferenciasDeForma({ a: null }, { a: { b: 1 } }), []);
});
