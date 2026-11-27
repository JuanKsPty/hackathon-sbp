import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { AVISO, FUENTE } from '../src/routes/formato.js';
import { formatearCentavos, formatearE4 } from '../src/engine/montos.js';
import { paqueteReal } from './ayuda.js';

let servidor;
let base;
let almacen;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  almacen = crearAlmacen(catalogos, periodos);
  servidor = crearApp({ almacen }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const conMiles = (t) => t.replace(/\B(?=(\d{3})+(?!\d))(?=\d*\.)/g, ',');

test('dashboard.html: 200 text/html adjunto, con fuente, período, aviso y los bancos del ranking pedido', async () => {
  const fecha = almacen.ultimaFecha();
  const periodo = almacen.obtener(fecha);
  const { ranking, filas } = periodo.rankings[0];
  const respuesta = await fetch(`${base}/exportar/dashboard.html?periodo=${fecha}&ranking=${encodeURIComponent(ranking)}`);
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /^text\/html; charset=utf-8/);
  assert.match(respuesta.headers.get('content-disposition'), /^attachment; filename="?dashboard_\d{8}.*\.html/);
  const html = await respuesta.text();
  assert.ok(html.includes(escapar(AVISO)), 'falta el aviso de datos ficticios');
  assert.ok(html.includes(escapar(FUENTE)), 'falta la fuente');
  assert.ok(html.includes(`${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}`), 'falta el período');
  assert.equal(filas.length, almacen.catalogos.bancos.size);
  for (const f of filas) {
    assert.ok(html.includes(escapar(f.banco)), `falta ${f.banco}`);
    assert.ok(html.includes(conMiles(formatearCentavos(f.saldoActividad))), `falta el saldo de ${f.banco}`);
    assert.ok(html.includes(formatearE4(f.ponderacionE4)), `falta la ponderación de ${f.banco}`);
  }
  // Solo el ranking pedido.
  for (const otro of periodo.rankings.slice(1)) assert.ok(!html.includes(`Ranking ${escapar(otro.ranking)}<`));
});

test('dashboard.html sin filtros: último período, todos los rankings y la calidad E1-E4', async () => {
  const respuesta = await fetch(`${base}/exportar/dashboard.html`);
  assert.equal(respuesta.status, 200);
  const html = await respuesta.text();
  const periodo = almacen.obtener(almacen.ultimaFecha());
  for (const { ranking } of periodo.rankings) assert.ok(html.includes(`Ranking ${escapar(ranking)}`), `falta ${ranking}`);
  for (const codigo of ['E1', 'E2', 'E3', 'E4']) assert.ok(html.includes(`<td>${codigo}</td>`));
  assert.ok(html.includes(conMiles(formatearCentavos(periodo.calidad.saldoTotalValido))));
});

test('dashboard.html con banco: sus posiciones en todos los rankings', async () => {
  const [codigo, nombre] = [...almacen.catalogos.bancos.entries()][0];
  const respuesta = await fetch(`${base}/exportar/dashboard.html?banco=${codigo}`);
  assert.equal(respuesta.status, 200);
  const html = await respuesta.text();
  assert.ok(html.includes(`${escapar(nombre)} (${codigo}) en los`));
});

test('dashboard.html: un filtro inválido responde 400 con el formato de error común', async () => {
  for (const consulta of ['periodo=2026', 'ranking=NO_EXISTE', 'banco=999999']) {
    const respuesta = await fetch(`${base}/exportar/dashboard.html?${consulta}`);
    assert.equal(respuesta.status, 400, consulta);
    const cuerpo = await respuesta.json();
    assert.equal(cuerpo.error.codigo, 'PARAMETRO_INVALIDO', consulta);
  }
});

test('dashboard.html es autocontenido: sin scripts ni URLs externas', async () => {
  const html = await (await fetch(`${base}/exportar/dashboard.html`)).text();
  assert.ok(!/<script/i.test(html));
  assert.ok(!html.includes('https://'));
  assert.ok(!html.includes('http://'));
  assert.ok(!/<link/i.test(html));
});

test('personalizado.html (Analista): un período, un ranking y dos bancos', async () => {
  const fecha = almacen.ultimaFecha();
  const periodo = almacen.obtener(fecha);
  const { ranking, filas } = periodo.rankings[0];
  const [a, b] = filas;
  const consulta = `periodos=${fecha}&rankings=${encodeURIComponent(ranking)}&bancos=${a.codigoBanco},${b.codigoBanco}`;
  const respuesta = await fetch(`${base}/exportar/personalizado.html?${consulta}`, { headers: { 'X-Perfil': 'analista' } });
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /^text\/html; charset=utf-8/);
  assert.match(respuesta.headers.get('content-disposition'), /^attachment;/);
  const html = await respuesta.text();
  assert.ok(html.includes(escapar(AVISO)));
  assert.ok(html.includes(escapar(FUENTE)));
  for (const f of [a, b]) {
    assert.ok(html.includes(`<h2>${escapar(f.banco)} (${f.codigoBanco}) · `), `falta la ficha de ${f.banco}`);
    assert.ok(html.includes(conMiles(formatearCentavos(f.saldoActividad))));
    assert.ok(html.includes(formatearE4(f.ponderacionE4)));
    // Su saldo por subactividad (desglose del motor, entregable 3).
    for (const d of periodo.desglose.filter((x) => x.codigoBanco === f.codigoBanco && x.ranking === ranking && x.saldo > 0)) {
      assert.ok(html.includes(`<td>${escapar(d.subactividad)}</td><td class="n">${conMiles(formatearCentavos(d.saldo))}</td>`), `falta ${d.subactividad} de ${f.banco}`);
    }
  }
  // Enfocado en los bancos: sin los totales de calidad del período.
  for (const texto of ['Universo local válido', 'Filas leídas', 'Cartera local válida', 'E1–E4']) {
    assert.ok(!html.includes(texto), `sobra "${texto}"`);
  }
  for (const f of filas.slice(2)) assert.ok(!html.includes(`<td>${f.codigoBanco}</td>`), `sobra ${f.banco}`);
  for (const otro of periodo.rankings.slice(1)) assert.ok(!html.includes(`Ranking ${escapar(otro.ranking)} ·`), `sobra ${otro.ranking}`);
  assert.ok(!/<script/i.test(html) && !html.includes('https://'));
});

test('personalizado.html: 403 para el perfil Público y 400 con un parámetro inválido', async () => {
  const publico = await fetch(`${base}/exportar/personalizado.html`);
  assert.equal(publico.status, 403);
  for (const consulta of ['periodos=2026', 'rankings=NO_EXISTE', 'bancos=999999']) {
    const respuesta = await fetch(`${base}/exportar/personalizado.html?${consulta}`, { headers: { 'X-Perfil': 'analista' } });
    assert.equal(respuesta.status, 400, consulta);
    assert.equal((await respuesta.json()).error.codigo, 'PARAMETRO_INVALIDO', consulta);
  }
});
