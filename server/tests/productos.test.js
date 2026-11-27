// Totales por producto de crédito (engine/productos.js y GET /api/productos).
// Las cifras se comparan con el desglose del motor y con los CSV de control de tests/referencia,
// nunca con números escritos a mano (R2).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { calcularProductos, procesarPeriodo, TODOS } from '../src/engine/index.js';
import { REGLA_CONSUMO } from '../src/engine/clasificacion.js';
import { aCentavos, ponderacionE4 } from '../src/engine/montos.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { paqueteReal, catalogosReales, leerReferencia, filaSintetica, comoFilas } from './ayuda.js';

const suma = (lista, campo) => lista.reduce((total, x) => total + x[campo], 0);
const centavos = (numero) => Math.round(numero * 100);

// ---- Motor, con los datos reales ----

test('22 productos en el orden del catálogo, cada uno con los 12 bancos ordenados por código', () => {
  const catalogos = catalogosReales();
  const orden = catalogos.macroactividades.flatMap((macro) => catalogos.subactividadesPorMacro.get(macro).map((sub) => `${macro}/${sub}`));
  for (const periodo of paqueteReal().periodos) {
    const { productos, bancos } = calcularProductos(periodo, catalogos);
    assert.deepEqual(productos.map((p) => `${p.ranking}/${p.subactividad}`), orden);
    assert.deepEqual(bancos.map((b) => b.codigoBanco), [...catalogos.bancos.keys()].sort());
    for (const p of productos) assert.deepEqual(p.bancos.map((b) => b.codigoBanco), bancos.map((b) => b.codigoBanco));
  }
});

test('la suma de los bancos es el saldo del producto y coincide con el CSV de control de subactividades', () => {
  const control = new Map();
  for (const f of leerReferencia('referencia_subactividades.csv')) {
    const clave = `${f.Fecha}|${f.Ranking}|${f.Subactividad}`;
    control.set(clave, (control.get(clave) ?? 0) + aCentavos(f.Saldo));
  }
  for (const periodo of paqueteReal().periodos) {
    for (const p of calcularProductos(periodo, catalogosReales()).productos) {
      assert.equal(suma(p.bancos, 'saldo'), p.saldo, `${periodo.fecha} ${p.subactividad}`);
      assert.equal(p.saldo, control.get(`${periodo.fecha}|${p.ranking}|${p.subactividad}`), `${periodo.fecha} ${p.subactividad}`);
    }
  }
});

test('los productos de cada ranking suman el total del ranking, y todos suman el saldo total válido', () => {
  const controlRankings = leerReferencia('referencia_rankings.csv');
  const controlCalidad = leerReferencia('referencia_calidad.csv');
  for (const periodo of paqueteReal().periodos) {
    const { productos, rankings, saldoTotal } = calcularProductos(periodo, catalogosReales());
    for (const r of rankings) {
      const control = controlRankings.filter((f) => f.Fecha === periodo.fecha && f.Ranking === r.ranking);
      const totalControl = control.reduce((total, f) => total + aCentavos(f.Saldo_Actividad), 0);
      assert.equal(suma(productos.filter((p) => p.ranking === r.ranking), 'saldo'), totalControl, `${periodo.fecha} ${r.ranking}`);
      assert.equal(r.saldo, totalControl);
    }
    const totalControl = aCentavos(controlCalidad.find((f) => f.Fecha === periodo.fecha).Saldo_Total_Valido);
    assert.equal(suma(productos, 'saldo'), totalControl, periodo.fecha);
    assert.equal(saldoTotal, totalControl, periodo.fecha);
  }
});

test('Tarjeta incluye la reclasificación SB21: es el desglose de CONSUMO/Tarjeta', () => {
  const tarjeta = catalogosReales().cinu.get(REGLA_CONSUMO.cinuTarjeta);
  for (const periodo of paqueteReal().periodos) {
    const producto = calcularProductos(periodo, catalogosReales()).productos.find((p) => p.ranking === tarjeta.macro && p.subactividad === tarjeta.sub);
    const desglose = periodo.desglose.filter((d) => d.ranking === tarjeta.macro && d.subactividad === tarjeta.sub);
    assert.equal(producto.saldo, suma(desglose, 'saldo'), periodo.fecha);
    // Saldo = préstamos con CINU de Tarjeta + créditos personales con facilidad 07 (reclasificados).
    const deTarjeta = periodo.operaciones.filter((op) => op.tipoActividad === REGLA_CONSUMO.cinuTarjeta);
    const reclasificadas = periodo.operaciones.filter((op) => op.reclasificada);
    assert.ok(reclasificadas.length > 0);
    assert.equal(producto.saldo, suma(deTarjeta, 'saldo') + suma(reclasificadas, 'saldo'), periodo.fecha);
    assert.equal(producto.operaciones, deTarjeta.length + reclasificadas.length, periodo.fecha);
  }
});

test('operaciones, porcentajes y líder salen del motor', () => {
  for (const periodo of paqueteReal().periodos) {
    const { productos, bancos, rankings, universo, saldoTotal } = calcularProductos(periodo, catalogosReales());
    assert.equal(suma(productos, 'operaciones'), universo);
    assert.equal(suma(bancos, 'operacionesValidas'), universo);
    assert.equal(suma(bancos, 'totalCartera'), saldoTotal);
    for (const p of productos) {
      const totalRanking = rankings.find((r) => r.ranking === p.ranking).saldo;
      assert.equal(p.pctRankingE4, ponderacionE4(p.saldo, totalRanking));
      assert.equal(p.pctTotalE4, ponderacionE4(p.saldo, saldoTotal));
      assert.equal(p.lider.saldo, Math.max(...p.bancos.map((b) => b.saldo)));
      assert.equal(p.lider.codigoBanco, p.bancos.find((b) => b.saldo === p.lider.saldo).codigoBanco);
    }
  }
});

// ---- Motor, con un caso sintético ----

const VIVIENDA = 'L.68.681.6810.00000';

test('en empate gana el código menor; sin saldo no hay líder; sin operaciones los conteos son null', () => {
  const periodo = procesarPeriodo(
    comoFilas([
      filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '103', Tipo_Actividad: VIVIENDA, Saldo: '50.00' }),
      filaSintetica({ Numero_Prestamo: 'B', Codigo_Banco: '102', Tipo_Actividad: VIVIENDA, Saldo: '50.00' }),
    ]),
    catalogosReales(),
  );
  const { productos } = calcularProductos(periodo, catalogosReales());
  const vivienda = productos.find((p) => p.subactividad === 'Vivienda propia');
  assert.equal(vivienda.lider.codigoBanco, '102');
  assert.equal(vivienda.operaciones, 2);
  assert.equal(productos.find((p) => p.ranking === 'CONSUMO').lider, null);

  const sinOperaciones = calcularProductos({ ...periodo, operaciones: undefined }, catalogosReales());
  assert.equal(sinOperaciones.productos[0].operaciones, null);
  assert.equal(sinOperaciones.productos[0].bancos[0].operaciones, null);
  assert.equal(sinOperaciones.bancos.find((b) => b.codigoBanco === '102').operacionesValidas, 1); // sale de los rankings

  // Detalle de banco: en el empate de Vivienda propia, 102 va primero y 103 segundo.
  const detalle = (codigo, p = periodo) => calcularProductos(p, catalogosReales(), { banco: codigo }).banco;
  assert.equal(detalle('102').productos.find((p) => p.subactividad === 'Vivienda propia').posicion, 1);
  assert.equal(detalle('103').productos.find((p) => p.subactividad === 'Vivienda propia').posicion, 2);
  assert.equal(detalle('102').posicionCartera, 1);
  assert.equal(detalle('102', { ...periodo, operaciones: undefined }).productos[0].operaciones, null);
});

// ---- API ----

let servidor;
let base;

before(async () => {
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(() => servidor.close());

const pedir = async (ruta, headers = {}) => {
  const respuesta = await fetch(base + ruta, { headers });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
};

test('GET /api/productos responde 200 a los 3 perfiles y al sitio público', async () => {
  for (const headers of [{ 'X-Perfil': 'publico' }, { 'X-Perfil': 'analista' }, { 'X-Perfil': 'admin' }, { 'X-Sitio': 'publico' }]) {
    const { status, cuerpo } = await pedir('/productos', headers);
    assert.equal(status, 200, JSON.stringify(headers));
    assert.equal(cuerpo.periodo, paqueteReal().periodos.at(-1).fecha);
  }
});

test('GET /api/productos: forma, encabezado y totales que cuadran en centavos', async () => {
  const { cuerpo } = await pedir('/productos?periodo=20260930');
  assert.match(cuerpo.aviso, /Datos ficticios/);
  assert.ok(cuerpo.fuente && cuerpo.archivo);
  const control = leerReferencia('referencia_calidad.csv').find((f) => f.Fecha === '20260930');
  assert.equal(cuerpo.Saldo_Total_Valido, Number(control.Saldo_Total_Valido));
  assert.equal(cuerpo.Universo_Local_Valido, Number(control.Universo_Local_Valido));
  assert.equal(cuerpo.Reclasificadas_Tarjeta, paqueteReal().periodos.at(-1).calidad.reclasificadasTarjeta);
  assert.equal(cuerpo.productos.length, 22);
  assert.equal(cuerpo.bancos.length, 12);
  assert.equal(typeof cuerpo.bancos[0].Codigo_Banco, 'string');

  for (const p of cuerpo.productos) {
    assert.deepEqual(Object.keys(p), ['Ranking', 'Subactividad', 'Saldo', 'Operaciones', 'Pct_Del_Ranking', 'Pct_Del_Total', 'Lider', 'Bancos']);
    assert.equal(p.Bancos.reduce((total, b) => total + centavos(b.Saldo), 0), centavos(p.Saldo), p.Subactividad);
    assert.equal(p.Bancos.length, 12);
  }
  const totalProductos = cuerpo.productos.reduce((total, p) => total + centavos(p.Saldo), 0);
  assert.equal(totalProductos, centavos(cuerpo.Saldo_Total_Valido));
  const totalBancos = cuerpo.bancos.reduce((total, b) => total + centavos(b.Total_Cartera_Local_Valida), 0);
  assert.equal(totalBancos, centavos(cuerpo.Saldo_Total_Valido));
});

test('GET /api/productos acepta "todos" y responde errores con el formato común', async () => {
  const todos = await pedir(`/productos?periodo=${TODOS}`);
  assert.equal(todos.status, 200);
  assert.equal(todos.cuerpo.periodo, TODOS);
  const suma3 = leerReferencia('referencia_calidad.csv').reduce((total, f) => total + aCentavos(f.Saldo_Total_Valido), 0);
  assert.equal(centavos(todos.cuerpo.Saldo_Total_Valido), suma3);

  const invalido = await pedir('/productos?periodo=2026');
  assert.equal(invalido.status, 400);
  assert.equal(invalido.cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
  const sinDatos = await pedir('/productos?periodo=20261231');
  assert.equal(sinDatos.status, 404);
  assert.equal(sinDatos.cuerpo.error.codigo, 'PERIODO_SIN_DATOS');
});

// ---- Detalle de un banco (?banco=, issue #204) ----

test('detalle de banco: sus productos suman su saldo en cada ranking; posición, ponderación y lugares salen de los rankings', () => {
  const { catalogos, periodos } = paqueteReal();
  const acumulado = crearAlmacen(catalogos, periodos).acumulado();
  for (const periodo of [...periodos, acumulado]) {
    for (const codigo of catalogos.bancos.keys()) {
      const { banco, bancos, saldoTotal } = calcularProductos(periodo, catalogos, { banco: codigo });
      assert.equal(banco.codigoBanco, codigo);
      assert.equal(banco.participacionE4, ponderacionE4(banco.totalCartera, saldoTotal));
      for (const r of banco.rankings) {
        const fila = periodo.rankings.find((x) => x.ranking === r.ranking).filas.find((f) => f.codigoBanco === codigo);
        const productos = banco.productos.filter((p) => p.ranking === r.ranking);
        assert.equal(suma(productos, 'saldo'), r.saldoActividad, `${periodo.fecha} ${codigo} ${r.ranking}`);
        assert.equal(suma(productos, 'operaciones'), r.operacionesValidas, `${periodo.fecha} ${codigo} ${r.ranking}`);
        assert.deepEqual([r.posicion, r.saldoActividad, r.ponderacionE4], [fila.posicion, fila.saldoActividad, fila.ponderacionE4]);
      }
      assert.equal(banco.rankingsLiderados, periodo.rankings.filter((r) => r.filas[0].codigoBanco === codigo).length);
      // Lugar por cartera: bancos con más cartera (o igual y código menor), más 1.
      const delante = bancos.filter((b) => b.totalCartera > banco.totalCartera || (b.totalCartera === banco.totalCartera && b.codigoBanco < codigo));
      assert.equal(banco.posicionCartera, delante.length + 1);
    }
  }
});

test('detalle de banco: la posición en cada producto sigue saldo descendente y código menor', () => {
  const periodo = septiembre();
  for (const codigo of catalogosReales().bancos.keys()) {
    const { banco, productos } = calcularProductos(periodo, catalogosReales(), { banco: codigo });
    banco.productos.forEach((p, i) => {
      const ordenados = [...productos[i].bancos].sort((a, b) => b.saldo - a.saldo || (a.codigoBanco < b.codigoBanco ? -1 : 1));
      assert.equal(ordenados[p.posicion - 1].codigoBanco, codigo, `${codigo} ${p.subactividad}`);
      assert.equal(p.participacionE4, ponderacionE4(p.saldo, productos[i].saldo));
    });
  }
});

const septiembre = () => paqueteReal().periodos.find((p) => p.fecha === '20260930');

test('GET /api/productos sin banco: trae la composición por ranking y no trae la clave banco', async () => {
  const { cuerpo } = await pedir('/productos?periodo=20260930');
  assert.ok(!('banco' in cuerpo));
  assert.deepEqual(cuerpo.rankings.map((r) => r.Ranking), catalogosReales().macroactividades);
  assert.deepEqual(Object.keys(cuerpo.rankings[0]), ['Ranking', 'Saldo', 'Pct_Del_Total']);
  assert.equal(cuerpo.rankings.reduce((total, r) => total + centavos(r.Saldo), 0), centavos(cuerpo.Saldo_Total_Valido));
  const pct = cuerpo.rankings.reduce((total, r) => total + Math.round(r.Pct_Del_Total * 10000), 0);
  assert.ok(Math.abs(pct - 1_000_000) <= 3, `la composición suma ${pct / 10000} %`); // 6 redondeos de ±0.00005
});

test('GET /api/productos?banco= coincide con /api/rankings?banco= y responde a los 3 perfiles', async () => {
  for (const headers of [{ 'X-Perfil': 'publico' }, { 'X-Perfil': 'analista' }, { 'X-Perfil': 'admin' }, { 'X-Sitio': 'publico' }]) {
    const { status, cuerpo } = await pedir('/productos?periodo=20260930&banco=108', headers);
    assert.equal(status, 200, JSON.stringify(headers));
    assert.equal(cuerpo.banco.Codigo_Banco, '108');
  }
  const { cuerpo } = await pedir('/productos?periodo=20260930&banco=108');
  const rankings = (await pedir('/rankings?periodo=20260930&banco=108')).cuerpo.rankings;
  assert.equal(cuerpo.banco.Banco, catalogosReales().bancos.get('108'));
  assert.equal(cuerpo.banco.rankings.length, 6);
  for (const r of cuerpo.banco.rankings) {
    const [fila] = rankings.find((x) => x.Ranking === r.Ranking).bancos;
    assert.equal(r.Saldo_Actividad, fila.Saldo_Actividad, r.Ranking);
    assert.equal(r.Posicion, fila.Posicion, r.Ranking);
    assert.equal(r.Ponderacion_Pct, fila.Ponderacion_Pct, r.Ranking);
    assert.equal(r.Operaciones_Validas, fila.Operaciones_Validas, r.Ranking);
    assert.equal(cuerpo.banco.Total_Cartera_Local_Valida, fila.Total_Cartera_Local_Valida);
    const productos = cuerpo.banco.productos.filter((p) => p.Ranking === r.Ranking);
    assert.equal(productos.reduce((total, p) => total + centavos(p.Saldo), 0), centavos(r.Saldo_Actividad), r.Ranking);
  }
  assert.equal(cuerpo.banco.productos.length, 22);
  assert.equal(cuerpo.banco.Rankings_Liderados, cuerpo.banco.rankings.filter((r) => r.Posicion === 1).length);
});

test('GET /api/productos?banco=: las participaciones de los 12 bancos en cada producto suman cerca de 100', async () => {
  const codigos = [...catalogosReales().bancos.keys()];
  const respuestas = await Promise.all(codigos.map((codigo) => pedir(`/productos?periodo=20260930&banco=${codigo}`)));
  for (let i = 0; i < 22; i++) {
    const total = respuestas.reduce((s, { cuerpo }) => s + Math.round(cuerpo.banco.productos[i].Participacion_Pct * 10000), 0);
    assert.ok(Math.abs(total - 1_000_000) <= 6, `${respuestas[0].cuerpo.banco.productos[i].Subactividad}: ${total / 10000} %`); // 12 redondeos
  }
  const cartera = respuestas.reduce((s, { cuerpo }) => s + Math.round(cuerpo.banco.Participacion_Pct * 10000), 0);
  assert.ok(Math.abs(cartera - 1_000_000) <= 6);
  assert.deepEqual(respuestas.map(({ cuerpo }) => cuerpo.banco.Posicion_Cartera).sort((a, b) => a - b), codigos.map((_, i) => i + 1));
});

test('GET /api/productos?banco=: inválido da 400 y funciona con el acumulado', async () => {
  const invalido = await pedir('/productos?banco=999');
  assert.equal(invalido.status, 400);
  assert.equal(invalido.cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
  const todos = await pedir(`/productos?periodo=${TODOS}&banco=108`);
  assert.equal(todos.status, 200);
  assert.equal(todos.cuerpo.periodo, TODOS);
  assert.equal(todos.cuerpo.banco.productos.length, 22);
  const total = todos.cuerpo.bancos.find((b) => b.Codigo_Banco === '108').Total_Cartera_Local_Valida;
  assert.equal(todos.cuerpo.banco.Total_Cartera_Local_Valida, total);
});
