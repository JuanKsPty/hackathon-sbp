// Verificación del jurado (#63): armado con los datos reales y chequeos que detectan errores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacen } from '../src/datos/almacen.js';
import { armarVerificacion, RANKINGS_OBLIGATORIOS, RANKINGS_ADICIONALES } from '../src/automation/verificacion.js';
import { paqueteReal } from './ayuda.js';

const almacenReal = () => {
  const { catalogos, periodos } = paqueteReal();
  return crearAlmacen(catalogos, periodos);
};

test('arma los 6 puntos de la sección 11.1 y todos los chequeos pasan con los datos reales', () => {
  const almacen = almacenReal();
  const v = armarVerificacion(almacen, almacen.obtener(almacen.ultimaFecha()));
  assert.equal(v.periodo, '20260930');
  assert.deepEqual(v.periodos, ['20260731', '20260831', '20260930']);
  assert.deepEqual(v.puntos.map((p) => p.punto), [1, 2, 3, 4, 5, 6]);
  for (const p of v.puntos) {
    assert.ok(p.chequeos.length > 0, `punto ${p.punto}`);
    for (const c of p.chequeos) assert.equal(c.ok, true, `punto ${p.punto}: ${c.nombre}`);
  }
  assert.equal(v.todo_ok, true);
});

test('los datos coinciden con los resultados del motor', () => {
  const almacen = almacenReal();
  const periodo = almacen.obtener('20260831');
  const v = armarVerificacion(almacen, periodo);
  const [p1, p2, p3, p4, p5] = v.puntos;

  const julio = almacen.obtener('20260731').calidad;
  assert.equal(p1.datos.periodos[0].Universo_Local_Valido, julio.universoValido);
  assert.equal(p1.datos.periodos[0].E2_Destino_Extranjero, julio.e2DestinoExtranjero);

  assert.deepEqual(p2.datos.rankings.map((r) => r.Ranking), RANKINGS_OBLIGATORIOS);
  assert.deepEqual(p3.datos.rankings.map((r) => r.Ranking), RANKINGS_ADICIONALES);
  const lider = periodo.rankings.find((r) => r.ranking === 'HIPOTECARIO').filas[0];
  assert.deepEqual(p2.datos.rankings[0].bancos[0], {
    Posicion: 1, Codigo_Banco: lider.codigoBanco, Banco: lider.banco, Saldo_Actividad: lider.saldoActividad / 100,
  });

  const istmo = p4.datos.bancos.find((b) => b.Codigo_Banco === '101');
  const filaIstmo = periodo.rankings.find((r) => r.ranking === 'INDUSTRIA').filas.find((f) => f.codigoBanco === '101');
  assert.equal(istmo.Total_Cartera_Local_Valida, filaIstmo.totalCartera / 100);
  assert.equal(istmo.Ponderacion_Pct.INDUSTRIA, filaIstmo.ponderacionE4 / 10000);
  assert.equal(Object.keys(istmo.Ponderacion_Pct).length, 6);

  assert.equal(p5.datos.Reclasificadas_Tarjeta, periodo.calidad.reclasificadasTarjeta);
  assert.deepEqual(Object.keys(p5.datos.consumo[0].Subactividades), ['Credito personal', 'Automovil', 'Tarjeta']);
});

test('con banco, acota los datos a ese banco pero conserva su posición real', () => {
  const almacen = almacenReal();
  const periodo = almacen.obtener('20260930');
  const v = armarVerificacion(almacen, periodo, '108');
  assert.deepEqual(v.banco, { Codigo_Banco: '108', Banco: 'Banco Capital' });
  const comercio = v.puntos[2].datos.rankings.find((r) => r.Ranking === 'COMERCIO');
  assert.equal(comercio.bancos.length, 1);
  const real = periodo.rankings.find((r) => r.ranking === 'COMERCIO').filas.find((f) => f.codigoBanco === '108');
  assert.equal(comercio.bancos[0].Posicion, real.posicion);
  assert.equal(v.puntos[3].datos.bancos.length, 1);
  assert.equal(v.puntos[4].datos.consumo.length, 1);
  assert.equal(v.todo_ok, true); // los chequeos siguen usando todos los bancos
});

test('los chequeos detectan datos que no cuadran', () => {
  const { catalogos, periodos } = paqueteReal();
  const roto = structuredClone(periodos.at(-1));
  roto.calidad.cascadaCuadra = false;
  roto.reconciliaciones.r2.ok = false;
  roto.rankings[0].filas[0].totalCartera += 1; // denominador distinto en un ranking
  roto.desglose[0].saldo += 1; // subactividades que no suman la actividad
  roto.rankings[1].filas.pop(); // ranking con un banco menos
  const almacen = crearAlmacen(catalogos, [...periodos.slice(0, -1), roto]);
  const v = armarVerificacion(almacen, roto);
  const fallidos = v.puntos.flatMap((p) => p.chequeos.filter((c) => !c.ok).map((c) => `${p.punto}: ${c.nombre}`));
  assert.equal(v.todo_ok, false);
  assert.ok(fallidos.some((f) => f.startsWith('1: Filas leídas')));
  assert.ok(fallidos.some((f) => f.startsWith('2: Cada ranking')));
  assert.ok(fallidos.some((f) => f.startsWith('4: El denominador')));
  assert.ok(fallidos.some((f) => f.startsWith('5: En cada ranking')));
  assert.ok(fallidos.some((f) => f.startsWith('6: Reconciliaciones')));
});

test('GET /api/verificacion: último período por defecto, filtros y errores', async () => {
  const { crearApp } = await import('../src/app.js');
  const { once } = await import('node:events');
  const servidor = crearApp({ almacen: almacenReal(), opcionesIA: { apiKey: '' } }).listen(0);
  await once(servidor, 'listening');
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  try {
    const r = await (await fetch(`${base}/verificacion`)).json(); // perfil Público
    assert.equal(r.periodo, '20260930');
    assert.equal(r.todo_ok, true);
    assert.match(r.aviso, /Datos ficticios/);
    assert.equal(r.puntos.length, 6);

    const filtrado = await (await fetch(`${base}/verificacion?periodo=20260731&banco=104`)).json();
    assert.equal(filtrado.periodo, '20260731');
    assert.equal(filtrado.banco.Codigo_Banco, '104');

    assert.equal((await fetch(`${base}/verificacion?periodo=20261031`)).status, 404);
    assert.equal((await fetch(`${base}/verificacion?banco=999`)).status, 400);
  } finally {
    servidor.close();
  }
});
