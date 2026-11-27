// /api/explicaciones desde el Panel (#60): volver a pedir lo mismo no vuelve a gastar la llave de IA,
// y su límite de pedidos no deja sin cupo al chat (/api/ia/preguntar).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../../src/app.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../../src/routes/movimientos.js';
import { paqueteReal } from '../ayuda.js';

const servidores = [];
after(() => servidores.forEach((s) => s.close()));

// Cliente falso de Anthropic: devuelve el mismo texto del borrador (sus números son del motor) y
// cuenta cuántas veces lo llamaron. Las preguntas al agente terminan sin herramientas.
function clienteQueCuenta() {
  const llamadas = { explicaciones: 0 };
  const cliente = {
    beta: {
      messages: {
        create: async ({ messages }) => {
          const contenido = messages[0].content;
          if (typeof contenido === 'string' && contenido.includes('"borrador"')) {
            llamadas.explicaciones += 1;
            const { borrador } = JSON.parse(contenido);
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ items: borrador }) }] };
          }
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Respuesta sin cifras.' }] };
        },
      },
    },
  };
  return { cliente, llamadas };
}

async function levantar(extra = {}) {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const { cliente, llamadas } = clienteQueCuenta();
  const servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen), opcionesIA: { cliente }, ...extra }).listen(0);
  servidores.push(servidor);
  await once(servidor, 'listening');
  return { base: `http://127.0.0.1:${servidor.address().port}/api`, llamadas };
}

const comoAnalista = { headers: { 'X-Perfil': 'analista' } };

test('la misma explicación se redacta una sola vez con la IA', async () => {
  const { base, llamadas } = await levantar();
  const primera = await (await fetch(`${base}/explicaciones`, comoAnalista)).json();
  const segunda = await (await fetch(`${base}/explicaciones`, { headers: { 'X-Perfil': 'admin' } })).json();
  assert.ok(primera.items.some((item) => item.fuente === 'ia'));
  assert.deepEqual(segunda.items, primera.items);
  assert.equal(llamadas.explicaciones, 1);

  // Otro par de períodos son otros movimientos: se redacta aparte.
  const { periodos } = await (await fetch(`${base}/periodos`)).json();
  const [primero, segundo] = periodos.map((p) => p.Fecha).sort();
  await fetch(`${base}/explicaciones?desde=${primero}&hasta=${segundo}`, comoAnalista);
  assert.equal(llamadas.explicaciones, 2);
});

test('el cupo de /api/explicaciones es aparte del cupo del chat', async () => {
  const { base } = await levantar({ limiteIA: { maximo: 1, ventanaMs: 60_000 } });
  assert.equal((await fetch(`${base}/explicaciones`, comoAnalista)).status, 200);
  assert.equal((await fetch(`${base}/explicaciones`, comoAnalista)).status, 429);
  const pregunta = await fetch(`${base}/ia/preguntar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Perfil': 'analista' },
    body: JSON.stringify({ pregunta: '¿Qué muestra el Panel?' }),
  });
  assert.equal(pregunta.status, 200);
});
