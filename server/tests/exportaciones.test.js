import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { csvRankings, csvDesglose, csvCalidad, csvExcluidas, COLUMNAS } from '../src/engine/index.js';
import { crearApp } from '../src/app.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import { paqueteReal, CARPETA_REFERENCIA } from './ayuda.js';

const leer = (texto) => parse(texto, { columns: true });
const leerReferencia = (archivo) => leer(fs.readFileSync(path.join(CARPETA_REFERENCIA, archivo), 'utf8'));
const indexar = (filas, campos) => new Map(filas.map((f) => [campos.map((c) => f[c]).join('|'), f]));

// Compara cada renglón de la referencia con el exportado, columna por columna (como texto).
function compararContraReferencia(exportado, referencia, llave) {
  const obtenidos = indexar(leer(exportado), llave);
  assert.equal(obtenidos.size, referencia.length);
  for (const esperado of referencia) {
    const clave = llave.map((c) => esperado[c]).join('|');
    const obtenido = obtenidos.get(clave);
    assert.ok(obtenido, `falta ${clave}`);
    for (const columna of Object.keys(esperado)) {
      assert.equal(obtenido[columna], esperado[columna], `${clave} ${columna}`);
    }
  }
}

test('entregable 2: rankings exportados iguales a la referencia', () => {
  const texto = csvRankings(paqueteReal().periodos);
  assert.equal(texto.split('\n')[0], COLUMNAS.rankings.join(','));
  compararContraReferencia(texto, leerReferencia('referencia_rankings.csv'), ['Fecha', 'Ranking', 'Posicion']);
});

test('entregable 3: desglose por subactividad exportado igual a la referencia', () => {
  const texto = csvDesglose(paqueteReal().periodos);
  assert.equal(texto.split('\n')[0], 'Fecha,Ranking,Subactividad,Codigo_Banco,Saldo');
  assert.match(texto, /,"Alimentos, bebidas y tabaco",/); // la coma interna va entre comillas
  compararContraReferencia(texto, leerReferencia('referencia_subactividades.csv'), ['Fecha', 'Ranking', 'Subactividad', 'Codigo_Banco']);
});

test('entregable 4: reporte de calidad exportado igual a la referencia', () => {
  const texto = csvCalidad(paqueteReal().periodos);
  compararContraReferencia(texto, leerReferencia('referencia_calidad.csv'), ['Fecha']);
  for (const fila of leer(texto)) {
    assert.equal(fila.Cascada_Cuadra, 'SI');
    for (const control of ['Reconciliacion_1', 'Reconciliacion_2', 'Reconciliacion_3', 'Unicidad_Prestamos']) {
      assert.equal(fila[control], 'OK', `${fila.Fecha} ${control}`);
    }
  }
});

test('lista de excluidas: un renglón por fila excluida con su motivo', () => {
  const filas = leer(csvExcluidas(paqueteReal().periodos));
  const totalExcluidas = paqueteReal().periodos.reduce((n, p) => n + p.excluidas.length, 0);
  assert.equal(filas.length, totalExcluidas);
  assert.deepEqual([...new Set(filas.map((f) => f.Motivo))].sort(), ['E1', 'E2', 'E3', 'E4']);
});

test('el script de consola procesa data/ y escribe las exportaciones', () => {
  const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-salidas-'));
  try {
    const script = fileURLToPath(new URL('../scripts/procesar.js', import.meta.url));
    const consola = execFileSync(process.execPath, [script, '--salida', salida], { encoding: 'utf8' });
    assert.match(consola, /20260930/);
    for (const archivo of ['rankings.csv', 'desglose_subactividades.csv', 'calidad.csv', 'excluidas.csv', 'alertas.csv']) {
      assert.ok(fs.existsSync(path.join(salida, archivo)), archivo);
    }
    assert.equal(leer(fs.readFileSync(path.join(salida, 'rankings.csv'), 'utf8')).length, 216);
  } finally {
    fs.rmSync(salida, { recursive: true, force: true });
  }
});

// Levanta la API con los tres períodos reales, ejecuta `prueba(base)` y la apaga.
async function conServidor(prueba) {
  const { catalogos, periodos } = paqueteReal();
  const servidor = crearApp({ almacen: crearAlmacen(catalogos, periodos), opcionesIA: { apiKey: '' } }).listen(0);
  await once(servidor, 'listening');
  try {
    await prueba(`http://127.0.0.1:${servidor.address().port}/api`);
  } finally {
    servidor.close();
  }
}

test('reporte personalizado: Público recibe 403', async () => {
  await conServidor(async (base) => {
    const respuesta = await fetch(`${base}/exportar/personalizado.csv`, { headers: { 'X-Perfil': 'publico' } });
    assert.equal(respuesta.status, 403);
    assert.equal((await respuesta.json()).error.codigo, 'PERFIL_NO_AUTORIZADO');
  });
});

test('reporte personalizado: el Analista filtra por ranking y banco con las columnas del entregable 2', async () => {
  const { catalogos } = paqueteReal();
  const ranking = catalogos.macroactividades[0];
  const banco = [...catalogos.bancos.keys()][0];
  await conServidor(async (base) => {
    const query = new URLSearchParams({ rankings: ranking, bancos: banco });
    const respuesta = await fetch(`${base}/exportar/personalizado.csv?${query}`, { headers: { 'X-Perfil': 'analista' } });
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get('content-disposition'), /reporte_personalizado\.csv/);
    const texto = await respuesta.text();
    assert.equal(texto.split('\n')[0], COLUMNAS.rankings.join(','));
    const filas = leer(texto);
    assert.ok(filas.length > 0);
    for (const fila of filas) {
      assert.equal(fila.Ranking, ranking);
      assert.equal(fila.Codigo_Banco, banco);
    }
  });
});

test('reporte personalizado: un banco fuera del catálogo responde 400', async () => {
  await conServidor(async (base) => {
    const respuesta = await fetch(`${base}/exportar/personalizado.csv?bancos=XYZ`, { headers: { 'X-Perfil': 'analista' } });
    assert.equal(respuesta.status, 400);
    assert.equal((await respuesta.json()).error.codigo, 'PARAMETRO_INVALIDO');
  });
});
