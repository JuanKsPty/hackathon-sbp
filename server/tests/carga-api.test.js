// POST /api/periodos (#29): solo el Administrador carga; septiembre se carga después de julio y agosto (entregable 7).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { carpetaDePeriodos } from '../src/datos/cargaPeriodo.js';
import { calidadDePeriodo } from '../src/routes/formato.js';
import { CARPETA_DATOS, paqueteReal, catalogosReales, filaSintetica, textoCsv } from './ayuda.js';

const SEPTIEMBRE = 'AT03_sintetico_202609.csv';
let servidor;
let base;
let storage;

// Arranca como si solo estuvieran julio y agosto en data/.
before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const julioYAgosto = periodos.filter((p) => p.fecha !== '20260930');
  storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-carga-api-'));
  servidor = crearApp({ almacen: crearAlmacen(catalogos, julioYAgosto), carpetaStorage: storage }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

async function subir(texto, { perfil = 'admin', nombre = 'AT03.csv', tipo = 'text/csv' } = {}) {
  const headers = { 'Content-Type': tipo, 'X-Perfil': perfil };
  if (nombre !== null) headers['X-Nombre-Archivo'] = encodeURIComponent(nombre);
  const respuesta = await fetch(`${base}/periodos`, { method: 'POST', headers, body: texto });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const fechasCargadas = async () => (await (await fetch(`${base}/periodos`)).json()).periodos.map((p) => p.Fecha);
const campos = () => catalogosReales().campos.map((c) => c.campo);

test('Público y Analista reciben 403 y no se carga nada', async () => {
  for (const perfil of ['publico', 'analista']) {
    const { status, cuerpo } = await subir('no importa', { perfil });
    assert.equal(status, 403, perfil);
    assert.equal(cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
  }
  const sinHeader = await fetch(`${base}/periodos`, { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/csv' } });
  assert.equal(sinHeader.status, 403);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831']);
});

test('el Administrador carga septiembre después de julio y agosto (entregable 7)', async () => {
  const texto = fs.readFileSync(path.join(CARPETA_DATOS, SEPTIEMBRE), 'utf8');
  const { status, cuerpo } = await subir(texto, { nombre: SEPTIEMBRE });

  assert.equal(status, 200);
  assert.equal(cuerpo.archivo, SEPTIEMBRE);
  assert.match(cuerpo.aviso, /Datos ficticios/);
  assert.equal(cuerpo.periodos.length, 1);
  const [septiembre] = cuerpo.periodos;
  assert.equal(septiembre.Fecha, '20260930');
  assert.equal(septiembre.Accion, 'NUEVO');
  assert.equal(septiembre.Periodo_Anterior, '20260831');

  // E1-E4, universo válido y reconciliaciones: iguales a lo que calcula el motor al procesar data/.
  const delMotor = paqueteReal().periodos.find((p) => p.fecha === '20260930');
  assert.deepEqual(septiembre.Calidad, calidadDePeriodo(delMotor));
  assert.equal(septiembre.Calidad.Cascada_Cuadra, true);
  assert.equal(Object.values(septiembre.Calidad.Reconciliaciones).every((r) => r.ok), true);

  // Queda publicado para las consultas y guardado en storage/periodos.
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
  const rankings = await (await fetch(`${base}/rankings?periodo=20260930`)).json();
  assert.equal(rankings.archivo, SEPTIEMBRE);
  assert.equal(fs.readdirSync(carpetaDePeriodos(storage)).length, 1);
});

// Reduce un JSON a su forma: claves y tipos (el primer elemento representa a cada arreglo).
function forma(valor) {
  if (Array.isArray(valor)) return valor.length > 0 ? [forma(valor[0])] : [];
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, forma(valor[clave])]));
  }
  return valor === null ? 'null' : typeof valor;
}

test('volver a subir septiembre lo informa como ACTUALIZACION y la respuesta tiene la forma de contracts/carga.json', async () => {
  const texto = fs.readFileSync(path.join(CARPETA_DATOS, SEPTIEMBRE), 'utf8');
  const { status, cuerpo } = await subir(texto, { nombre: 'AT03_septiembre_corregido.csv' });
  assert.equal(status, 200);
  const ejemplo = JSON.parse(fs.readFileSync(new URL('../../contracts/carga.json', import.meta.url), 'utf8'));
  assert.deepEqual(forma(cuerpo), forma(ejemplo));
  assert.equal(cuerpo.periodos[0].Accion, 'ACTUALIZACION');
  assert.match(cuerpo.periodos[0].Mensaje, /reemplaza/);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
});

test('un archivo inválido responde 422 ARCHIVO_INVALIDO con detalles y no cambia nada', async () => {
  const antes = fs.readdirSync(carpetaDePeriodos(storage)).length;
  const sinSaldo = campos().filter((c) => c !== 'Saldo');
  const { status, cuerpo } = await subir(textoCsv(sinSaldo, [filaSintetica({ Fecha: '20261031' })]), {
    nombre: 'AT03_octubre.csv',
  });
  assert.equal(status, 422);
  assert.equal(cuerpo.error.codigo, 'ARCHIVO_INVALIDO');
  assert.ok(cuerpo.error.detalles.length > 0);

  const saldoMalo = await subir(textoCsv(campos(), [filaSintetica({ Fecha: '20261031', Saldo: 'abc' })]), {
    nombre: 'AT03_octubre.csv',
  });
  assert.equal(saldoMalo.status, 422);
  assert.match(saldoMalo.cuerpo.error.mensaje, /Saldo/);

  assert.equal(fs.readdirSync(carpetaDePeriodos(storage)).length, antes);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
});

test('sin X-Nombre-Archivo responde 400 y con otro Content-Type responde 415', async () => {
  const sinNombre = await subir('Fecha\n', { nombre: null });
  assert.equal(sinNombre.status, 400);
  assert.equal(sinNombre.cuerpo.error.codigo, 'PARAMETRO_INVALIDO');

  const json = await subir(JSON.stringify({ a: 1 }), { tipo: 'application/json' });
  assert.equal(json.status, 415);
  assert.equal(json.cuerpo.error.codigo, 'FORMATO_NO_SOPORTADO');
});
