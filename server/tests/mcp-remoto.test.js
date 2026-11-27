// MCP remoto (#81): /api/mcp por HTTP, con el cliente Streamable HTTP del SDK (como un conector de Claude).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { paqueteReal } from './ayuda.js';

let servidor;
let base;
const anterior = process.env.MCP_API_INTERNA;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
  process.env.MCP_API_INTERNA = base; // en Dokploy es la API del mismo contenedor
});

after(() => {
  servidor.close();
  if (anterior === undefined) delete process.env.MCP_API_INTERNA;
  else process.env.MCP_API_INTERNA = anterior;
});

async function conectar(query = '') {
  const cliente = new Client({ name: 'test-remoto', version: '0.0.0' });
  await cliente.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp${query}`)));
  return cliente;
}

test('se conecta por URL y lista las herramientas con instrucciones', async () => {
  const cliente = await conectar('?perfil=analista');
  const { tools } = await cliente.listTools();
  assert.equal(tools.length, 7);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint));
  assert.match(cliente.getInstructions(), /datos 100% ficticios/);
  await cliente.close();
});

test('consulta los rankings del motor igual que la API', async () => {
  const cliente = await conectar();
  const resultado = await cliente.callTool({ name: 'consultar_rankings', arguments: { periodo: '20260930', ranking: 'CONSUMO' } });
  const datos = JSON.parse(resultado.content[0].text);
  const directo = await (await fetch(`${base}/rankings?periodo=20260930&ranking=CONSUMO`)).json();
  assert.deepEqual(datos.rankings, directo.rankings);
  await cliente.close();
});

test('sin perfil es Público: no ofrece movimientos y la API los rechaza', async () => {
  const cliente = await conectar();
  const { tools } = await cliente.listTools();
  assert.equal(tools.length, 6);
  const resultado = await cliente.callTool({ name: 'consultar_movimientos', arguments: {} });
  assert.equal(resultado.isError, true);
  await cliente.close();

  const analista = await conectar('?perfil=analista');
  const movimientos = await analista.callTool({ name: 'consultar_movimientos', arguments: { ranking: 'COMERCIO' } });
  assert.equal(JSON.parse(movimientos.content[0].text).rankings[0].Ranking, 'COMERCIO');
  await analista.close();
});

test('perfil inválido responde 400 y GET responde 405', async () => {
  const invalido = await fetch(`${base}/mcp?perfil=jefe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.equal(invalido.status, 400);
  assert.equal((await invalido.json()).error.codigo, 'PARAMETRO_INVALIDO');

  const get = await fetch(`${base}/mcp`);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
});
