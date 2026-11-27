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
import { leerOperaciones } from '../src/datos/bitacora.js';
import { calidadDePeriodo } from '../src/routes/formato.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { CARPETA_DATOS, paqueteReal, catalogosReales, filaSintetica, textoCsv } from './ayuda.js';

// Las copias de los períodos y la bitácora de estas pruebas van a una carpeta temporal propia.
const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-carga-api-'));
process.env.STORAGE_DIR = storage;

const SEPTIEMBRE = 'AT03_sintetico_202609.csv';
const EJEMPLO = JSON.parse(fs.readFileSync(new URL('../../contracts/carga.json', import.meta.url), 'utf8'));
const servidores = [];
const pedidosDeMovimientos = [];
let base;

// Simula obtenerMovimientos de #32 (GET /api/movimientos): anota qué se pidió y responde con el
// formato de contracts/movimientos.json. El cálculo real se prueba en las pruebas de #32.
function obtenerMovimientosDePrueba(query) {
  pedidosDeMovimientos.push(query);
  const { regla_significativo, rankings } = EJEMPLO.periodos[0].Comparacion;
  return {
    fuente: 'f',
    aviso: 'a',
    periodo_anterior: query.desde,
    periodo_actual: query.hasta,
    regla_significativo,
    rankings,
  };
}

// Arranca una app como si solo estuvieran julio y agosto en data/.
async function arrancar(opciones = {}) {
  const { catalogos, periodos } = paqueteReal();
  const julioYAgosto = periodos.filter((p) => p.fecha !== '20260930');
  const servidor = crearApp({ almacen: crearAlmacen(catalogos, julioYAgosto), ...opciones }).listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

before(async () => {
  base = await arrancar({ obtenerMovimientos: obtenerMovimientosDePrueba });
});

after(() => {
  servidores.forEach((servidor) => servidor.close());
  fs.rmSync(storage, { recursive: true, force: true });
});

async function subir(texto, { perfil = 'admin', nombre = 'AT03.csv', tipo = 'text/csv', en = base } = {}) {
  const headers = { 'Content-Type': tipo, 'X-Perfil': perfil };
  if (nombre !== null) headers['X-Nombre-Archivo'] = encodeURIComponent(nombre);
  const respuesta = await fetch(`${en}/periodos`, { method: 'POST', headers, body: texto });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

const fechasCargadas = async () => (await (await fetch(`${base}/periodos`)).json()).periodos.map((p) => p.Fecha);
const campos = () => catalogosReales().campos.map((c) => c.campo);
const textoSeptiembre = () => fs.readFileSync(path.join(CARPETA_DATOS, SEPTIEMBRE), 'utf8');
const copias = () => fs.readdirSync(carpetaDePeriodos(storage));

// Reduce un JSON a su forma: claves y tipos (el primer elemento representa a cada arreglo).
function forma(valor) {
  if (Array.isArray(valor)) return valor.length > 0 ? [forma(valor[0])] : [];
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((clave) => [clave, forma(valor[clave])]));
  }
  return valor === null ? 'null' : typeof valor;
}

test('Público y Analista reciben 403, no se carga nada y queda como acceso_denegado', async () => {
  for (const perfil of ['publico', 'analista']) {
    const { status, cuerpo } = await subir('no importa', { perfil });
    assert.equal(status, 403, perfil);
    assert.equal(cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
  }
  const sinHeader = await fetch(`${base}/periodos`, { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/csv' } });
  assert.equal(sinHeader.status, 403);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831']);

  const rechazos = leerOperaciones().filter((o) => o.operacion === 'acceso_denegado');
  assert.equal(rechazos.length, 3);
  assert.equal(leerOperaciones().some((o) => o.operacion === 'carga_periodo'), false);
});

test('el Administrador carga septiembre después de julio y agosto (entregable 7)', async () => {
  const { status, cuerpo } = await subir(textoSeptiembre(), { nombre: SEPTIEMBRE });

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

  // Los cambios de ranking se piden a /api/movimientos: agosto -> septiembre, sin repetir fuente ni aviso.
  assert.deepEqual(pedidosDeMovimientos, [{ desde: '20260831', hasta: '20260930' }]);
  assert.equal(septiembre.Comparacion.periodo_anterior, '20260831');
  assert.equal(septiembre.Comparacion.periodo_actual, '20260930');
  assert.equal('fuente' in septiembre.Comparacion, false);

  // Queda publicado para las consultas, guardado en storage/periodos y en la bitácora.
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
  const rankings = await (await fetch(`${base}/rankings?periodo=20260930`)).json();
  assert.equal(rankings.archivo, SEPTIEMBRE);
  assert.equal(copias().length, 1);
  const [registro] = leerOperaciones().filter((o) => o.operacion === 'carga_periodo');
  assert.equal(registro.archivo, SEPTIEMBRE);
  assert.equal(registro.perfil, 'admin');
  assert.equal(registro.resultado, 'exito');
  assert.match(registro.detalle, /20260930 \(NUEVO\)/);
});

test('volver a subir septiembre es ACTUALIZACION y la respuesta tiene la forma de contracts/carga.json', async () => {
  const { status, cuerpo } = await subir(textoSeptiembre(), { nombre: 'AT03_septiembre_corregido.csv' });
  assert.equal(status, 200);
  assert.deepEqual(forma(cuerpo), forma(EJEMPLO));
  assert.equal(cuerpo.periodos[0].Accion, 'ACTUALIZACION');
  assert.match(cuerpo.periodos[0].Mensaje, /reemplaza/);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
  assert.equal(copias().length, 2);
});

test('un archivo inválido responde 422 con detalles, no cambia nada y queda en la bitácora como error', async () => {
  const antes = copias().length;
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

  assert.equal(copias().length, antes);
  assert.deepEqual(await fechasCargadas(), ['20260731', '20260831', '20260930']);
  const errores = leerOperaciones().filter((o) => o.operacion === 'carga_periodo' && o.resultado === 'error');
  assert.equal(errores.length, 2);
  assert.equal(errores[0].archivo, 'AT03_octubre.csv');
});

test('sin X-Nombre-Archivo responde 400 y con otro Content-Type responde 415', async () => {
  const sinNombre = await subir('Fecha\n', { nombre: null });
  assert.equal(sinNombre.status, 400);
  assert.equal(sinNombre.cuerpo.error.codigo, 'PARAMETRO_INVALIDO');

  const json = await subir(JSON.stringify({ a: 1 }), { tipo: 'application/json' });
  assert.equal(json.status, 415);
  assert.equal(json.cuerpo.error.codigo, 'FORMATO_NO_SOPORTADO');
});

test('con el cálculo real de movimientos, Comparacion es lo mismo que GET /api/movimientos', async () => {
  const almacen = crearAlmacen(paqueteReal().catalogos, paqueteReal().periodos.filter((p) => p.fecha !== '20260930'));
  const servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0);
  await once(servidor, 'listening');
  servidores.push(servidor);
  const real = `http://127.0.0.1:${servidor.address().port}/api`;

  const { status, cuerpo } = await subir(textoSeptiembre(), { nombre: SEPTIEMBRE, en: real });
  assert.equal(status, 200);
  const comparacion = cuerpo.periodos[0].Comparacion;
  assert.equal(comparacion.periodo_anterior, '20260831');
  assert.equal(comparacion.rankings.length, 6);
  assert.equal(comparacion.rankings.every((r) => r.movimientos.length === 12), true);

  const respuesta = await fetch(`${real}/movimientos?desde=20260831&hasta=20260930`, { headers: { 'X-Perfil': 'admin' } });
  const movimientos = await respuesta.json();
  assert.deepEqual(comparacion.rankings, movimientos.rankings);
  assert.deepEqual(comparacion.regla_significativo, movimientos.regla_significativo);
});

test('sin el cálculo de movimientos, o si falla, la carga igual se publica con Comparacion = null', async () => {
  const sinMovimientos = await arrancar();
  const uno = await subir(textoSeptiembre(), { nombre: SEPTIEMBRE, en: sinMovimientos });
  assert.equal(uno.status, 200);
  assert.equal(uno.cuerpo.periodos[0].Comparacion, null);

  const conFalla = await arrancar({
    obtenerMovimientos: () => {
      throw new Error('regla inválida');
    },
  });
  const errorOriginal = console.error;
  console.error = () => {};
  try {
    const dos = await subir(textoSeptiembre(), { nombre: SEPTIEMBRE, en: conFalla });
    assert.equal(dos.status, 200);
    assert.equal(dos.cuerpo.periodos[0].Comparacion, null);
  } finally {
    console.error = errorOriginal;
  }
});
