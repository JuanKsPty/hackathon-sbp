// Descripciones de las herramientas de la IA (#86, C4): los rankings y bancos que nombran salen del
// catálogo, no se escriben a mano en el código.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { definicionesPara } from '../../src/ai/herramientas.js';
import { crearApp } from '../../src/app.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../../src/routes/movimientos.js';
import { catalogosReales, paqueteReal } from '../ayuda.js';

const descripcionDe = (definiciones, herramienta, parametro) =>
  definiciones.find((d) => d.name === herramienta).input_schema.properties[parametro].description;

test('con el catálogo, las descripciones nombran sus rankings y el rango de sus bancos', () => {
  const catalogos = catalogosReales();
  const definiciones = definicionesPara('admin', catalogos);
  const ranking = descripcionDe(definiciones, 'consultar_rankings', 'ranking');
  for (const nombre of catalogos.macroactividades) assert.ok(ranking.includes(nombre), nombre);
  const codigos = [...catalogos.bancos.keys()].sort();
  assert.match(descripcionDe(definiciones, 'consultar_rankings', 'banco'), new RegExp(`${codigos[0]} a ${codigos.at(-1)}`));
  const general = definiciones.find((d) => d.name === 'consultar_catalogos').description;
  assert.ok(general.includes(`${catalogos.bancos.size} bancos`));
  assert.ok(general.includes(`${catalogos.macroactividades.length} rankings`));
});

test('si el catálogo cambia, las descripciones cambian: no hay listas fijas en el código', () => {
  const otro = { macroactividades: ['AAA', 'BBB'], bancos: new Map([['201', 'Uno'], ['205', 'Dos'], ['203', 'Tres']]) };
  const definiciones = definicionesPara('analista', otro);
  assert.equal(descripcionDe(definiciones, 'consultar_rankings', 'ranking'), 'Ranking: AAA, BBB.');
  assert.match(descripcionDe(definiciones, 'consultar_movimientos', 'ranking'), /AAA, BBB/);
  assert.match(descripcionDe(definiciones, 'consultar_excluidas', 'banco'), /201 a 205/);
  const general = definiciones.find((d) => d.name === 'consultar_catalogos').description;
  assert.match(general, /3 bancos/);
  assert.match(general, /2 rankings/);
});

test('sin catálogo (MCP por stdio) remiten a consultar_catalogos y no fijan ningún valor', () => {
  const definiciones = definicionesPara('admin');
  for (const [herramienta, parametro] of [['consultar_rankings', 'ranking'], ['consultar_rankings', 'banco'], ['consultar_subactividades', 'banco']]) {
    const texto = descripcionDe(definiciones, herramienta, parametro);
    assert.match(texto, /consultar_catalogos/);
    assert.doesNotMatch(texto, /\d{3}|HIPOTECARIO|CONSUMO/);
  }
  const general = definiciones.find((d) => d.name === 'consultar_catalogos').description;
  assert.doesNotMatch(general, /\d/);
});

const servidores = [];
after(() => servidores.forEach((s) => s.close()));

async function levantar() {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { apiKey: '' } }).listen(0);
  servidores.push(servidor);
  await once(servidor, 'listening');
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

test('el MCP remoto lista las herramientas con las descripciones del catálogo cargado', async () => {
  const base = await levantar();
  const cliente = new Client({ name: 'test-descripciones', version: '0.0.0' });
  await cliente.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  const { tools } = await cliente.listTools();
  const ranking = tools.find((t) => t.name === 'consultar_rankings').inputSchema.properties.ranking.description;
  for (const nombre of catalogosReales().macroactividades) assert.ok(ranking.includes(nombre), nombre);
  await cliente.close();
});
