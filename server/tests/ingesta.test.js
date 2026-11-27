import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leerAT03, procesarPeriodo, ErrorDeDatos } from '../src/engine/index.js';
import { CARPETA_DATOS, catalogosReales, filaSintetica, comoFilas, textoCsv, paqueteReal } from './ayuda.js';

const campos = () => catalogosReales().campos.map((c) => c.campo);

test('los catálogos se leen quitando el BOM y conservando los ceros', () => {
  const c = catalogosReales();
  assert.equal(c.campos.length, 61);
  assert.equal(c.campos[0].campo, 'Fecha'); // sin BOM delante
  assert.equal(c.bancos.size, 12);
  assert.equal(c.bancos.has('101'), true);
  assert.equal(c.cinu.size, 22);
  assert.equal(c.cinu.get('K.64.649.6492.64921').sub, 'Credito personal');
  assert.deepEqual(c.macroactividades, ['HIPOTECARIO', 'CONSTRUCCION', 'INDUSTRIA', 'AGROPECUARIO', 'COMERCIO', 'CONSUMO']);
  const totalSubs = c.macroactividades.reduce((n, m) => n + c.subactividadesPorMacro.get(m).length, 0);
  assert.equal(totalSubs, 22);
  assert.equal(c.facilidades.has('07'), true);
  assert.equal(c.facilidades.has('7'), false);
});

test('un AT03 real se lee con 61 columnas, como texto y separado por Fecha', () => {
  const texto = fs.readFileSync(path.join(CARPETA_DATOS, 'AT03_sintetico_202607.csv'), 'utf8');
  const periodos = leerAT03(texto, catalogosReales(), 'AT03_sintetico_202607.csv');
  assert.equal(periodos.length, 1);
  assert.equal(periodos[0].fecha, '20260731');
  assert.equal(periodos[0].filas.length, 25000);
  const primera = periodos[0].filas[0];
  assert.equal(primera.numeroFila, 2);
  assert.equal(primera.datos.Facilidad_Crediticia, '04'); // no 4
  assert.equal(primera.datos.Codigo_Region, '010'); // no 10
  assert.equal(primera.datos.Codigo_Subsidiaria, 'NA'); // texto literal
});

test('el período se toma de Fecha, no del nombre del archivo', () => {
  const datos = [filaSintetica({ Fecha: '20260831', Numero_Prestamo: 'A' }), filaSintetica({ Fecha: '20260731', Numero_Prestamo: 'B' })];
  const periodos = leerAT03(textoCsv(campos(), datos), catalogosReales(), 'AT03_julio.csv');
  assert.deepEqual(periodos.map((p) => p.fecha), ['20260731', '20260831']);
});

test('acepta un AT03 con BOM', () => {
  const texto = '﻿' + textoCsv(campos(), [filaSintetica({ Numero_Prestamo: 'A' })]);
  assert.equal(leerAT03(texto, catalogosReales())[0].filas.length, 1);
});

test('rechaza un archivo con columnas faltantes o en otro orden', () => {
  const sinSaldo = campos().filter((c) => c !== 'Saldo');
  assert.throws(() => leerAT03(textoCsv(sinSaldo, [filaSintetica()]), catalogosReales()), ErrorDeDatos);

  const desordenado = [...campos()];
  [desordenado[0], desordenado[1]] = [desordenado[1], desordenado[0]];
  assert.throws(
    () => leerAT03(textoCsv(desordenado, [filaSintetica()]), catalogosReales()),
    (e) => e instanceof ErrorDeDatos && e.detalles.some((d) => d.includes('Columna 1')),
  );
});

test('rechaza un archivo sin filas o con una fila de largo distinto', () => {
  assert.throws(() => leerAT03(campos().join(',') + '\r\n', catalogosReales()), ErrorDeDatos);
  const roto = textoCsv(campos(), [filaSintetica()]) + '20260731,101\r\n';
  assert.throws(() => leerAT03(roto, catalogosReales()), ErrorDeDatos);
});

test('rechaza Saldo o Fecha inválidos indicando la fila', () => {
  const conSaldoMalo = comoFilas([filaSintetica({ Numero_Prestamo: 'A' }), filaSintetica({ Numero_Prestamo: 'B', Saldo: '12,50' })]);
  assert.throws(
    () => procesarPeriodo(conSaldoMalo, catalogosReales()),
    (e) => e instanceof ErrorDeDatos && e.detalles[0].startsWith('Fila 3'),
  );
  const conFechaMala = comoFilas([filaSintetica({ Fecha: '2026-07-31' })]);
  assert.throws(() => procesarPeriodo(conFechaMala, catalogosReales()), ErrorDeDatos);
});

test('procesarPeriodo exige una sola Fecha', () => {
  const mezcla = comoFilas([filaSintetica({ Numero_Prestamo: 'A' }), filaSintetica({ Numero_Prestamo: 'B', Fecha: '20260831' })]);
  assert.throws(() => procesarPeriodo(mezcla, catalogosReales()), ErrorDeDatos);
});

test('banco o facilidad fuera de catálogo generan alerta, no error', () => {
  const filas = comoFilas([
    filaSintetica({ Numero_Prestamo: 'A', Codigo_Banco: '999' }),
    filaSintetica({ Numero_Prestamo: 'B', Facilidad_Crediticia: '7' }),
  ]);
  const resultado = procesarPeriodo(filas, catalogosReales());
  assert.equal(resultado.calidad.alertasBancoFueraDeCatalogo, 1);
  assert.equal(resultado.calidad.alertasFacilidadFueraDeCatalogo, 1);
  assert.equal(resultado.alertas.find((a) => a.tipo === 'BANCO_FUERA_DE_CATALOGO').fila, 2);
});

test('los 3 períodos reales se leen sin alertas de tipo ni de integridad', () => {
  const { periodos } = paqueteReal();
  assert.deepEqual(periodos.map((p) => p.fecha), ['20260731', '20260831', '20260930']);
  assert.deepEqual(periodos.map((p) => p.calidad.filasLeidas), [25000, 27500, 30000]);
  for (const p of periodos) {
    assert.equal(p.calidad.alertasTipoDeDato, 0, `${p.fecha}: ${JSON.stringify(p.alertas.slice(0, 3))}`);
    assert.equal(p.calidad.alertasBancoFueraDeCatalogo, 0);
    assert.equal(p.calidad.alertasFacilidadFueraDeCatalogo, 0);
  }
});
