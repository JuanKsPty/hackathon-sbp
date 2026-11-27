// Servidor MCP (#6) contra la API real: en memoria y por stdio (como lo lanza Claude Desktop).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { crearServidorMcp } from '../src/mcp/servidor.js';
import { crearEjecutor } from '../src/ai/herramientas.js';
import { paqueteReal } from './ayuda.js';

let api;
let base;
let cliente;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  api = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } }).listen(0);
  await once(api, 'listening');
  base = `http://127.0.0.1:${api.address().port}/api`;

  const [lado, otroLado] = InMemoryTransport.createLinkedPair();
  await crearServidorMcp({ ejecutar: crearEjecutor(base, { perfil: 'analista' }), perfil: 'analista' }).connect(otroLado);
  cliente = new Client({ name: 'test', version: '0.0.0' });
  await cliente.connect(lado);
});

after(async () => {
  await cliente.close();
  api.close();
});

test('lista las 7 herramientas de solo lectura con instrucciones', async () => {
  const { tools } = await cliente.listTools();
  assert.deepEqual(tools.map((t) => t.name), [
    'listar_periodos', 'consultar_catalogos', 'consultar_rankings', 'consultar_subactividades',
    'consultar_calidad', 'consultar_excluidas', 'consultar_movimientos',
  ]);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint === true));
  assert.match(cliente.getInstructions(), /datos 100% ficticios/);
});

test('consultar_rankings devuelve el ranking del motor', async () => {
  const resultado = await cliente.callTool({ name: 'consultar_rankings', arguments: { periodo: '20260930', ranking: 'COMERCIO' } });
  assert.equal(resultado.isError, undefined);
  const datos = JSON.parse(resultado.content[0].text);
  assert.equal(datos.periodo, '20260930');
  assert.match(datos.aviso, /Datos ficticios/);
  assert.equal(datos.rankings[0].bancos.length, 12);
  // Mismo resultado que la API.
  const directo = await (await fetch(`${base}/rankings?periodo=20260930&ranking=COMERCIO`)).json();
  assert.deepEqual(datos.rankings, directo.rankings);
});

test('consultar_movimientos usa la comparación entre períodos', async () => {
  const resultado = await cliente.callTool({ name: 'consultar_movimientos', arguments: { ranking: 'COMERCIO', solo_significativos: 'true' } });
  const datos = JSON.parse(resultado.content[0].text);
  assert.equal(datos.periodo_actual, '20260930');
  assert.equal(datos.rankings[0].Cambio_Lider, true);
});

test('con perfil Público no ofrece movimientos y la API los rechaza (403)', async () => {
  const [lado, otroLado] = InMemoryTransport.createLinkedPair();
  await crearServidorMcp({ ejecutar: crearEjecutor(base), perfil: 'publico' }).connect(otroLado);
  const publico = new Client({ name: 'test-publico', version: '0.0.0' });
  await publico.connect(lado);
  const { tools } = await publico.listTools();
  assert.equal(tools.length, 6);
  assert.ok(!tools.some((t) => t.name === 'consultar_movimientos'));
  const resultado = await publico.callTool({ name: 'consultar_movimientos', arguments: {} });
  assert.equal(resultado.isError, true);
  await publico.close();
});

test('un parámetro inválido vuelve como error de herramienta', async () => {
  const resultado = await cliente.callTool({ name: 'consultar_rankings', arguments: { ranking: 'VIVIENDA' } });
  assert.equal(resultado.isError, true);
  assert.match(resultado.content[0].text, /VIVIENDA/);
});

test('si la API no responde, devuelve un error claro', async () => {
  const [lado, otroLado] = InMemoryTransport.createLinkedPair();
  await crearServidorMcp({ ejecutar: crearEjecutor('http://127.0.0.1:9/api') }).connect(otroLado);
  const sinApi = new Client({ name: 'test', version: '0.0.0' });
  await sinApi.connect(lado);
  const resultado = await sinApi.callTool({ name: 'listar_periodos', arguments: {} });
  assert.equal(resultado.isError, true);
  assert.match(resultado.content[0].text, /No se pudo consultar la API/);
  await sinApi.close();
});

test('arranca por stdio como lo lanza Claude Desktop', async () => {
  const transporte = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/mcp/index.js', import.meta.url))],
    env: { ...process.env, MCP_API_URL: base },
    stderr: 'ignore',
  });
  const porStdio = new Client({ name: 'test-stdio', version: '0.0.0' });
  await porStdio.connect(transporte);
  const resultado = await porStdio.callTool({ name: 'listar_periodos', arguments: {} });
  assert.equal(JSON.parse(resultado.content[0].text).ultimo, '20260930');
  await porStdio.close();
});
