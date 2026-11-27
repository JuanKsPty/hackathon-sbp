import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { AVISO, FUENTE } from '../src/routes/formato.js';
import { formatearCentavos, formatearE4 } from '../src/engine/montos.js';
import { paqueteReal } from './ayuda.js';

const COMO_ANALISTA = { headers: { 'X-Perfil': 'analista' } };
const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const conMiles = (t) => t.replace(/\B(?=(\d{3})+(?!\d))(?=\d*\.)/g, ',');

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

// Un préstamo válido en todos los períodos cargados (sale de los datos, no fijado a mano).
function prestamoEnTodos() {
  const [primero, ...resto] = almacen.todos();
  const op = primero.operaciones.find((o) => resto.every((p) => p.operaciones.some((x) => x.numeroPrestamo === o.numeroPrestamo)));
  assert.ok(op, 'no hay un préstamo presente en todos los períodos');
  return op.numeroPrestamo;
}

test('GET /prestamos/:numero (Analista): ficha por período con saldo, banco, ranking, peso y campos del AT03', async () => {
  const numero = prestamoEnTodos();
  const respuesta = await fetch(`${base}/prestamos/${encodeURIComponent(numero)}`, COMO_ANALISTA);
  assert.equal(respuesta.status, 200);
  const ficha = await respuesta.json();
  assert.equal(ficha.fuente, FUENTE);
  assert.equal(ficha.aviso, AVISO);
  assert.equal(ficha.Numero_Prestamo, numero);
  assert.deepEqual(ficha.periodos.map((p) => p.Fecha), almacen.fechas());

  let previo = null;
  for (const [i, periodo] of almacen.todos().entries()) {
    const op = periodo.operaciones.find((o) => o.numeroPrestamo === numero);
    const fila = periodo.rankings.find((r) => r.ranking === op.macro).filas.find((f) => f.codigoBanco === op.codigoBanco);
    const p = ficha.periodos[i];
    assert.equal(p.Estado, 'VALIDO');
    assert.equal(p.Codigo_Banco, op.codigoBanco);
    assert.equal(p.Banco, fila.banco);
    assert.equal(p.Ranking, op.macro);
    assert.equal(p.Subactividad, op.sub);
    assert.equal(p.Saldo, Number(formatearCentavos(op.saldo)));
    assert.equal(p.Var_Saldo, previo === null ? null : Number(formatearCentavos(op.saldo - previo)));
    assert.equal(p.Posicion_Banco, fila.posicion);
    assert.equal(p.Saldo_Banco_Ranking, Number(formatearCentavos(fila.saldoActividad)));
    assert.equal(p.Participacion_Pct, Number(formatearE4(Math.round((op.saldo * 1000000) / fila.saldoActividad))));
    assert.deepEqual(Object.keys(p.Campos), almacen.catalogos.campos.map((c) => c.campo));
    assert.equal(p.Campos.Numero_Prestamo, numero);
    previo = op.saldo;
  }
});

test('GET /prestamos/:numero: un préstamo excluido aparece con su motivo', async () => {
  const periodo = almacen.todos().find((p) => p.excluidas.some((e) => !p.operaciones.some((o) => o.numeroPrestamo === e.numeroPrestamo)));
  assert.ok(periodo, 'no hay préstamos excluidos en los datos');
  const excluida = periodo.excluidas.find((e) => !periodo.operaciones.some((o) => o.numeroPrestamo === e.numeroPrestamo));
  const respuesta = await fetch(`${base}/prestamos/${encodeURIComponent(excluida.numeroPrestamo)}`, COMO_ANALISTA);
  assert.equal(respuesta.status, 200);
  const ficha = await respuesta.json();
  const p = ficha.periodos.find((x) => x.Fecha === periodo.fecha);
  assert.equal(p.Estado, 'EXCLUIDO');
  assert.ok(p.Exclusiones.some((e) => e.Motivo === excluida.motivo));
});

test('GET /exportar/prestamo.html (Analista): informe HTML autocontenido del préstamo', async () => {
  const numero = prestamoEnTodos();
  const respuesta = await fetch(`${base}/exportar/prestamo.html?numero=${encodeURIComponent(numero)}`, COMO_ANALISTA);
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /^text\/html; charset=utf-8/);
  assert.match(respuesta.headers.get('content-disposition'), /^attachment; filename="?prestamo_.+\.html/);
  const html = await respuesta.text();
  assert.ok(html.includes(escapar(numero)));
  assert.ok(html.includes(escapar(AVISO)));
  assert.ok(html.includes(escapar(FUENTE)));
  for (const periodo of almacen.todos()) {
    const op = periodo.operaciones.find((o) => o.numeroPrestamo === numero);
    assert.ok(html.includes(conMiles(formatearCentavos(op.saldo))), `falta el saldo de ${periodo.fecha}`);
  }
  for (const { campo } of almacen.catalogos.campos) assert.ok(html.includes(`<th>${campo}</th>`), `falta el campo ${campo}`);
  assert.ok(!/<script/i.test(html) && !html.includes('https://') && !html.includes('http://'));
});

test('préstamos: 403 al perfil Público, 400 con un número inválido y 404 si no existe', async () => {
  const numero = prestamoEnTodos();
  for (const ruta of [`/prestamos/${encodeURIComponent(numero)}`, `/exportar/prestamo.html?numero=${encodeURIComponent(numero)}`]) {
    const publico = await fetch(base + ruta);
    assert.equal(publico.status, 403, ruta);
  }
  for (const ruta of ['/prestamos/a%20b', '/exportar/prestamo.html', '/exportar/prestamo.html?numero=a%3Cb']) {
    const respuesta = await fetch(base + ruta, COMO_ANALISTA);
    assert.equal(respuesta.status, 400, ruta);
    assert.equal((await respuesta.json()).error.codigo, 'PARAMETRO_INVALIDO', ruta);
  }
  const noExiste = await fetch(`${base}/prestamos/NO-EXISTE-0`, COMO_ANALISTA);
  assert.equal(noExiste.status, 404);
  assert.equal((await noExiste.json()).error.codigo, 'PRESTAMO_NO_ENCONTRADO');
});
