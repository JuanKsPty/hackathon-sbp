// Valida el set de evaluación del agente (#72) sin usar IA: cada caso obtiene su respuesta esperada
// de la API real, y el calificador aprueba una respuesta correcta y rechaza una incorrecta.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { CASOS, variantes } from '../evals/agente/casos.js';
import { calificar } from '../evals/agente/calificar.js';
import { paqueteReal } from './ayuda.js';

let servidor;
let api;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } }).listen(0);
  await once(servidor, 'listening');
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  api = async (ruta, perfil = 'publico') => {
    const r = await fetch(base + ruta, { headers: { 'X-Perfil': perfil } });
    assert.equal(r.status, 200, ruta);
    return r.json();
  };
});

after(() => servidor.close());

test('los ids son únicos y cada caso tiene pregunta, perfil y categoría', () => {
  assert.equal(new Set(CASOS.map((c) => c.id)).size, CASOS.length);
  assert.ok(CASOS.length >= 15);
  for (const c of CASOS) {
    assert.ok(c.pregunta.length > 10 && ['publico', 'analista', 'admin'].includes(c.perfil) && c.categoria, c.id);
  }
});

test('cada caso obtiene su respuesta esperada de la API', async () => {
  for (const caso of CASOS) {
    const esperado = await caso.esperado(api);
    const claves = Object.keys(esperado);
    assert.ok(claves.length > 0, caso.id);
    for (const valor of esperado.contiene ?? []) {
      const opciones = Array.isArray(valor) ? valor : [valor];
      assert.ok(opciones.length > 0 && opciones.every((o) => typeof o === 'string' && o !== ''), caso.id);
    }
  }
});

test('variantes cubre formatos con y sin separador de miles y redondeos', () => {
  assert.deepEqual(variantes(1234567.891, 2), ['1234567.89', '1,234,567.89', '1234567.9', '1,234,567.9', '1234568', '1,234,568']);
  assert.deepEqual(variantes(12, 0), ['12']);
});

test('el calificador aprueba la respuesta correcta y rechaza la incorrecta', async () => {
  const caso = CASOS.find((c) => c.id === 'ranking-lider-hipotecario');
  const esperado = await caso.esperado(api);
  const [nombre, saldos] = esperado.contiene;
  const base = { ia_disponible: true, verificada: true, consultas: [{ herramienta: 'consultar_rankings' }], guia: null };

  assert.deepEqual(calificar({ ...base, respuesta: `Lidera ${nombre} con ${saldos[1]}.` }, esperado), { ok: true, fallas: [] });

  const mala = calificar({ ...base, respuesta: 'Lidera Banco Inventado con 1.00.', consultas: [] }, esperado);
  assert.equal(mala.ok, false);
  assert.equal(mala.fallas.length, 3); // falta el banco, falta el saldo y no usó la herramienta
});

test('el calificador revisa la guía y lo que no se debe decir', () => {
  const r = {
    ia_disponible: true,
    verificada: true,
    respuesta: 'Te recomiendo Banco Istmo.',
    consultas: [],
    guia: { pasos: [{ guia: 'admin.subir-archivo', texto: 'Sube el archivo.' }] },
  };
  const { fallas } = calificar(r, { noContiene: ['te recomiendo'], sinGuia: ['admin.subir-archivo'], guia: ['reportes.descarga-calidad'] });
  assert.equal(fallas.length, 3);
});
