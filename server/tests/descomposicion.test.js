import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { procesarPeriodo, csvDescomposicion, COLUMNAS } from '../src/engine/index.js';
import { descomponer, evidencia } from '../src/automation/descomposicion.js';
import { compararPeriodos } from '../src/automation/movimientos.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { catalogosReales, filaSintetica, comoFilas, paqueteReal } from './ayuda.js';

const VIVIENDA = 'L.68.681.6810.00000'; // HIPOTECARIO
const MINORISTA = 'G.47.471.4719.47191'; // COMERCIO
const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 15 };

function periodo(fecha, prestamos) {
  const filas = prestamos.map(([numero, banco, saldo, actividad = VIVIENDA]) =>
    filaSintetica({ Fecha: fecha, Numero_Prestamo: numero, Codigo_Banco: banco, Saldo: saldo, Tipo_Actividad: actividad }),
  );
  return procesarPeriodo(comoFilas(filas), catalogosReales());
}

// Julio: 101 = P1 300 + P2 100; 103 = P4 200. Agosto: P1 amortiza 50, P2 sale; P4 amortiza 20 y entra P5 (300).
const julio = () => periodo('20260731', [['P1', '101', '300.00'], ['P2', '101', '100.00'], ['P4', '103', '200.00']]);
const agosto = () => periodo('20260831', [['P1', '101', '250.00'], ['P4', '103', '180.00'], ['P5', '103', '300.00']]);

test('caso calculado a mano: Nuevos + Salen + Amortizacion = Var_Saldo', () => {
  const { piezas, continuidad } = descomponer(julio(), agosto());
  assert.deepEqual(piezas('HIPOTECARIO', '101'), {
    nuevos: { saldo: 0, operaciones: 0 },
    salen: { saldo: -10000, operaciones: 1 }, // P2: -100.00
    amortizacion: { saldo: -5000, operaciones: 1 }, // P1: 300 -> 250
  });
  assert.deepEqual(piezas('HIPOTECARIO', '103'), {
    nuevos: { saldo: 30000, operaciones: 1 }, // P5
    salen: { saldo: 0, operaciones: 0 },
    amortizacion: { saldo: -2000, operaciones: 1 }, // P4: 200 -> 180
  });
  assert.deepEqual(continuidad, { continuan: 2, entran: 1, salen: 1 });
  // Banco sin préstamos en ningún período: piezas en cero.
  assert.deepEqual(piezas('HIPOTECARIO', '110').nuevos, { saldo: 0, operaciones: 0 });
});

test('un préstamo que cambia de ranking sale de uno y entra en el otro', () => {
  const { piezas, continuidad } = descomponer(
    periodo('20260731', [['P9', '106', '50.00', VIVIENDA]]),
    periodo('20260831', [['P9', '106', '40.00', MINORISTA]]),
  );
  assert.deepEqual(piezas('HIPOTECARIO', '106').salen, { saldo: -5000, operaciones: 1 });
  assert.deepEqual(piezas('COMERCIO', '106').nuevos, { saldo: 4000, operaciones: 1 });
  assert.deepEqual(continuidad, { continuan: 1, entran: 0, salen: 0 }); // el préstamo sigue vigente
});

test('la evidencia lista los préstamos de cada pieza y suma lo mismo', () => {
  const ev = evidencia(julio(), agosto(), 'HIPOTECARIO', '103');
  assert.deepEqual(ev.nuevos, [{ numeroPrestamo: 'P5', saldo: 30000 }]);
  assert.deepEqual(ev.salen, []);
  assert.deepEqual(ev.continuan, [{ numeroPrestamo: 'P4', saldoAnterior: 20000, saldoActual: 18000, diferencia: -2000 }]);
});

// ---- Datos reales: cifras de control propias (solo en pruebas, no son la clave oficial) ----

const periodosReales = () => paqueteReal().periodos;
const pares = () => [[0, 1], [1, 2], [0, 2]].map(([a, b]) => [periodosReales()[a], periodosReales()[b]]);

// Continuidad esperada, contada aparte con conjuntos de Numero_Prestamo (sin cifras a mano, R2).
function continuidadEsperada(anterior, actual) {
  const antes = new Set(anterior.operaciones.map((op) => op.numeroPrestamo));
  const despues = new Set(actual.operaciones.map((op) => op.numeroPrestamo));
  const continuan = [...despues].filter((p) => antes.has(p)).length;
  return { continuan, entran: despues.size - continuan, salen: antes.size - continuan };
}

test('datos reales: continuidad de préstamos entre meses', () => {
  for (const [anterior, actual] of pares()) {
    const esperada = continuidadEsperada(anterior, actual);
    assert.ok(esperada.continuan > 0 && esperada.entran > 0 && esperada.salen > 0);
    assert.deepEqual(descomponer(anterior, actual).continuidad, esperada);
  }
});

test('datos reales: las tres piezas suman Var_Saldo de /api/movimientos al centavo (3 x 72)', () => {
  for (const [anterior, actual] of pares()) {
    const { piezas } = descomponer(anterior, actual);
    for (const r of compararPeriodos(anterior, actual, REGLA)) {
      const filasAnt = anterior.rankings.find((x) => x.ranking === r.ranking).filas;
      const filasAct = actual.rankings.find((x) => x.ranking === r.ranking).filas;
      for (const m of r.movimientos) {
        const p = piezas(r.ranking, m.codigoBanco);
        assert.equal(p.nuevos.saldo + p.salen.saldo + p.amortizacion.saldo, m.varSaldo, `${actual.fecha} ${r.ranking} ${m.codigoBanco}`);
        // Las operaciones también cuadran con Operaciones_Validas de cada período.
        assert.equal(p.nuevos.operaciones + p.amortizacion.operaciones, filasAct.find((f) => f.codigoBanco === m.codigoBanco).operacionesValidas);
        assert.equal(p.salen.operaciones + p.amortizacion.operaciones, filasAnt.find((f) => f.codigoBanco === m.codigoBanco).operacionesValidas);
      }
    }
  }
});

// ---- Endpoint GET /api/movimientos/descomposicion ----

let servidor;
let base;
let storagePrueba;
before(async () => {
  // Los accesos rechazados quedan en la bitácora: que se escriban en una carpeta temporal.
  storagePrueba = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-storage-'));
  process.env.STORAGE_DIR = storagePrueba;
  const { catalogos, periodos } = paqueteReal();
  servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos) }).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});
after(() => {
  servidor.close();
  delete process.env.STORAGE_DIR;
  fs.rmSync(storagePrueba, { recursive: true, force: true });
});

// Comparar períodos es de Analista y Administrador: por defecto se pide como analista.
async function pedir(ruta, perfil = 'analista') {
  const headers = perfil ? { 'X-Perfil': perfil } : {};
  const respuesta = await fetch(base + ruta, { headers });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

test('acceso por perfil: público recibe 403; analista y administrador, 200', async () => {
  const publico = await pedir('/movimientos/descomposicion', null);
  assert.equal(publico.status, 403);
  assert.equal(publico.cuerpo.error.codigo, 'PERFIL_NO_AUTORIZADO');
  assert.equal((await pedir('/movimientos/descomposicion', 'publico')).status, 403);
  assert.equal((await pedir('/movimientos/descomposicion?ranking=COMERCIO&banco=108&evidencia=true', 'publico')).status, 403);
  assert.equal((await pedir('/movimientos/descomposicion', 'analista')).status, 200);
  assert.equal((await pedir('/movimientos/descomposicion', 'admin')).status, 200);
});

test('GET /api/movimientos/descomposicion sin parámetros: último período contra el anterior', async () => {
  const { status, cuerpo } = await pedir('/movimientos/descomposicion');
  assert.equal(status, 200);
  assert.deepEqual([cuerpo.periodo_anterior, cuerpo.periodo_actual], ['20260831', '20260930']);
  assert.match(cuerpo.aviso, /Datos ficticios/);
  const [, agosto, septiembre] = periodosReales();
  const { continuan, entran, salen } = continuidadEsperada(agosto, septiembre);
  assert.deepEqual(cuerpo.Continuidad, { Continuan: continuan, Entran: entran, Salen: salen });
  assert.equal(cuerpo.descomposicion.length, 6 * 12);
  const centavos = (n) => Math.round(n * 100);
  for (const d of cuerpo.descomposicion) {
    assert.equal(centavos(d.Nuevos.Saldo) + centavos(d.Salen.Saldo) + centavos(d.Amortizacion.Saldo), centavos(d.Var_Saldo));
  }
  assert.equal(cuerpo.evidencia, undefined); // la evidencia solo se envía si se pide
});

test('evidencia de un ranking y banco: la tabla de respaldo suma lo mismo que las piezas', async () => {
  const { cuerpo } = await pedir('/movimientos/descomposicion?desde=20260831&hasta=20260930&ranking=COMERCIO&banco=108&evidencia=true');
  assert.equal(cuerpo.descomposicion.length, 1);
  const [d] = cuerpo.descomposicion;
  const suma = (lista, campo) => lista.reduce((s, e) => s + Math.round(e[campo] * 100), 0);
  assert.equal(cuerpo.evidencia.Nuevos.length, d.Nuevos.Operaciones);
  assert.equal(suma(cuerpo.evidencia.Nuevos, 'Saldo'), Math.round(d.Nuevos.Saldo * 100));
  assert.equal(suma(cuerpo.evidencia.Salen, 'Saldo'), Math.round(d.Salen.Saldo * 100));
  assert.equal(suma(cuerpo.evidencia.Continuan, 'Diferencia'), Math.round(d.Amortizacion.Saldo * 100));
  assert.equal(typeof cuerpo.evidencia.Nuevos[0].Numero_Prestamo, 'string');
});

test('errores con el formato común', async () => {
  const casos = [
    ['/movimientos/descomposicion?evidencia=true&ranking=COMERCIO', 400, 'PARAMETRO_INVALIDO'], // falta banco
    ['/movimientos/descomposicion?evidencia=si', 400, 'PARAMETRO_INVALIDO'],
    ['/movimientos/descomposicion?banco=999', 400, 'PARAMETRO_INVALIDO'],
    ['/movimientos/descomposicion?hasta=20260731', 404, 'PERIODO_SIN_DATOS'],
    ['/movimientos/descomposicion?desde=20260930&hasta=20260831', 422, 'PERIODOS_INVALIDOS'],
  ];
  for (const [ruta, status, codigo] of casos) {
    const { status: obtenido, cuerpo } = await pedir(ruta);
    assert.equal(obtenido, status, ruta);
    assert.equal(cuerpo.error.codigo, codigo, ruta);
  }
});

test('CSV de la descomposición y script de consola con el entregable 5', async () => {
  const { cuerpo } = await pedir('/movimientos/descomposicion?desde=20260731&hasta=20260831');
  const texto = csvDescomposicion(cuerpo);
  assert.equal(texto.split('\n')[0], COLUMNAS.descomposicion.join(','));
  assert.equal(parse(texto, { columns: true }).length, 72);

  const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-salidas-'));
  try {
    const script = fileURLToPath(new URL('../scripts/procesar.js', import.meta.url));
    execFileSync(process.execPath, [script, '--salida', salida], { encoding: 'utf8' });
    const movimientos = parse(fs.readFileSync(path.join(salida, 'movimientos.csv'), 'utf8'), { columns: true });
    assert.equal(movimientos.length, 2 * 6 * 12); // jul -> ago y ago -> sep
    assert.deepEqual([...new Set(movimientos.map((m) => `${m.Periodo_Anterior}->${m.Periodo_Actual}`))], ['20260731->20260831', '20260831->20260930']);
    const com108 = movimientos.find((m) => m.Periodo_Actual === '20260930' && m.Ranking === 'COMERCIO' && m.Codigo_Banco === '108');
    assert.equal(com108.Cambio_Posicion, '4');
    const descomposicion = parse(fs.readFileSync(path.join(salida, 'descomposicion_movimientos.csv'), 'utf8'), { columns: true });
    assert.equal(descomposicion.length, 2 * 6 * 12);
  } finally {
    fs.rmSync(salida, { recursive: true, force: true });
  }
});
