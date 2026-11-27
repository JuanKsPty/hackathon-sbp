// Documentación OpenAPI y Swagger UI (#9): cada endpoint documentado existe y responde como dice.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { paqueteReal } from './ayuda.js';

let servidor;
let base;
let documento;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } }).listen(0);
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
  documento = await (await fetch(`${base}/openapi.json`)).json();
});

after(() => servidor.close());

test('sirve un documento OpenAPI 3.1 con los valores del catálogo', async () => {
  assert.equal(documento.openapi, '3.1.0');
  assert.match(documento.info.description, /Datos ficticios/);
  const catalogos = await (await fetch(`${base}/catalogos`)).json();
  const { parameters } = documento.components;
  assert.deepEqual(parameters.ranking.schema.enum, catalogos.rankings.map((r) => r.Ranking));
  assert.deepEqual(parameters.banco.schema.enum, catalogos.bancos.map((b) => b.Codigo_Banco));
  assert.equal(parameters.subactividad.schema.enum.length, 22);
});

test('trae los ejemplos de /contracts', () => {
  const ejemplo = documento.paths['/rankings'].get.responses[200].content['application/json'].example;
  assert.equal(ejemplo.rankings[0].bancos[0].Codigo_Banco.length, 3);
  assert.ok(documento.paths['/movimientos'].get.responses[200].content['application/json'].example.regla_significativo);
});

test('cada GET documentado responde 200 con el tipo de contenido documentado', async () => {
  const rutas = Object.entries(documento.paths).filter(([, operaciones]) => operaciones.get);
  assert.ok(rutas.length >= 20);
  for (const [ruta, { get }] of rutas) {
    assert.equal(get.parameters[0].$ref, '#/components/parameters/perfil', ruta);
    const respuesta = await fetch(base + ruta, { headers: { 'X-Perfil': 'admin' } });
    assert.equal(respuesta.status, 200, ruta);
    const tipo = Object.keys(get.responses[200].content ?? { 'application/json': {} })[0];
    assert.ok(respuesta.headers.get('content-type').startsWith(tipo), `${ruta}: ${respuesta.headers.get('content-type')}`);
  }
});

test('las respuestas de error documentadas usan el formato común', async () => {
  const respuesta = await fetch(`${base}/rankings?ranking=VIVIENDA`);
  assert.equal(respuesta.status, 400);
  assert.ok(documento.paths['/rankings'].get.responses[400]);
  const cuerpo = await respuesta.json();
  assert.deepEqual(Object.keys(cuerpo.error).sort(), ['codigo', 'mensaje']);

  const post = await fetch(`${base}/ia/preguntar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(post.status, 400);
});

test('las rutas que documentan 403 responden 403 al perfil Público', async () => {
  const restringidas = Object.entries(documento.paths).filter(([, op]) => op.get?.responses[403]).map(([ruta]) => ruta);
  assert.deepEqual(restringidas.sort(), ['/admin/catalogos', '/bitacora', '/explicaciones', '/exportar/movimientos.csv', '/movimientos', '/movimientos/descomposicion']);
  for (const ruta of restringidas) {
    const respuesta = await fetch(base + ruta, { headers: { 'X-Perfil': 'publico' } });
    assert.equal(respuesta.status, 403, ruta);
    assert.equal((await respuesta.json()).error.codigo, 'PERFIL_NO_AUTORIZADO');
  }
});

test('Swagger UI se sirve en /api/docs', async () => {
  const respuesta = await fetch(`${base}/docs/`);
  assert.equal(respuesta.status, 200);
  const html = await respuesta.text();
  assert.match(html, /swagger-ui/);
  assert.match(html, /API rankings de crédito/);
});
