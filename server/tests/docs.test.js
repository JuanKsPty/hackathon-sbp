// Documentación OpenAPI y Swagger UI (#9): cada endpoint documentado existe y responde como dice.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { paqueteReal } from './ayuda.js';

let app;
let servidor;
let base;
let documento;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  app = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } });
  servidor = app.listen(0);
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
  // Los enlaces de suscripción exigen un token del correo: se prueban en tests/suscripciones.test.js.
  const conParametroObligatorio = (get) => (get.parameters ?? []).some((p) => p.required === true);
  const rutas = Object.entries(documento.paths).filter(([, operaciones]) => operaciones.get && !conParametroObligatorio(operaciones.get));
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
  assert.deepEqual(restringidas.sort(), ['/admin/catalogos', '/bitacora', '/explicaciones', '/exportar/movimientos.csv', '/exportar/personalizado.csv', '/movimientos', '/movimientos/descomposicion', '/suscripciones']);
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

// Recorre las rutas que montó crearApp (Express 5: app.router.stack) y devuelve "método /ruta" sin el /api.
function rutasMontadas() {
  const rutas = [];
  const recorrer = (capas) => {
    for (const capa of capas) {
      if (capa.route) {
        for (const metodo of Object.keys(capa.route.methods)) rutas.push(`${metodo} ${capa.route.path.replace(/^\/api(?=\/)/, '')}`);
      } else if (capa.handle?.stack) {
        recorrer(capa.handle.stack);
      }
    }
  };
  recorrer(app.router.stack);
  return rutas.sort();
}

test('#86 (B4): toda ruta montada en la app está en el spec, y el spec no documenta rutas que no existen', () => {
  // Fuera del spec a propósito: el propio documento, y GET y DELETE de /mcp, que solo responden 405
  // (se explica en la descripción de POST /mcp).
  const aProposito = new Set(['get /openapi.json', 'get /mcp', 'delete /mcp']);
  const montadas = rutasMontadas().filter((r) => !aProposito.has(r));
  const documentadas = Object.entries(documento.paths)
    .flatMap(([ruta, operaciones]) => Object.keys(operaciones).map((metodo) => `${metodo} ${ruta}`))
    .sort();
  assert.ok(montadas.length >= 25, `solo se encontraron ${montadas.length} rutas montadas`);
  assert.deepEqual(montadas.filter((r) => !documentadas.includes(r)), [], 'rutas montadas que faltan en el spec');
  assert.deepEqual(documentadas.filter((r) => !montadas.includes(r)), [], 'rutas del spec que no existen');
});

test('#86 (B4): GET /indicadores documenta periodo, ranking y el ejemplo de contracts/indicadores.json', async () => {
  const { get } = documento.paths['/indicadores'];
  assert.deepEqual(get.parameters.slice(1).map((p) => p.$ref), ['#/components/parameters/periodo', '#/components/parameters/ranking']);
  const ejemplo = get.responses[200].content['application/json'].example;
  assert.ok(ejemplo.morosidad && ejemplo.vencimientos && ejemplo.concentracion);
  assert.ok(get.responses[400] && get.responses[404]);
  // El ejemplo tiene las mismas claves que la respuesta real.
  const real = await (await fetch(`${base}/indicadores`)).json();
  assert.deepEqual(Object.keys(real).sort(), Object.keys(ejemplo).sort());
});

test('#86 (B4): POST /periodos documenta el 413 ARCHIVO_MUY_GRANDE y responde con ese código', async () => {
  const { post } = documento.paths['/periodos'];
  assert.ok(post.responses[413]);
  assert.match(documento.components.responses.Error413.description, /ARCHIVO_MUY_GRANDE/);
  // 51 MB de texto: pasa el límite de 50 MB de la carga.
  const grande = await fetch(`${base}/periodos`, {
    method: 'POST',
    headers: { 'X-Perfil': 'admin', 'X-Nombre-Archivo': 'grande.csv', 'content-type': 'text/csv' },
    body: 'x'.repeat(51 * 1024 * 1024),
  });
  assert.equal(grande.status, 413);
  assert.equal((await grande.json()).error.codigo, 'ARCHIVO_MUY_GRANDE');
});

test('#86 (C5): los enums de perfiles y motivos salen del código, no de listas escritas a mano', async () => {
  const { PERFILES } = await import('../src/middleware/perfiles.js');
  const { MOTIVOS } = await import('../src/engine/cascada.js');
  assert.deepEqual(documento.components.parameters.perfil.schema.enum, PERFILES);
  assert.deepEqual(documento.paths['/mcp'].post.parameters[1].schema.enum, PERFILES);
  assert.deepEqual(documento.components.parameters.motivo.schema.enum, Object.keys(MOTIVOS));
});
