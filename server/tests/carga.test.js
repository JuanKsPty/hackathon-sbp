// Núcleo de la carga de un período nuevo (#29): validar, procesar, guardar la copia y recargar al arrancar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ErrorDeDatos } from '../src/engine/index.js';
import { crearAlmacen } from '../src/datos/almacen.js';
import {
  cargarPeriodo,
  recargarPeriodosGuardados,
  limpiarNombreArchivo,
  carpetaDePeriodos,
  nombreOriginal,
  periodoAnterior,
} from '../src/datos/cargaPeriodo.js';
import { avisarPublicacion } from '../src/automation/publicacion.js';
import { catalogosReales, filaSintetica, textoCsv } from './ayuda.js';

const campos = () => catalogosReales().campos.map((c) => c.campo);
const storageTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sbp-carga-'));
const copiasGuardadas = (storage) =>
  fs.existsSync(carpetaDePeriodos(storage)) ? fs.readdirSync(carpetaDePeriodos(storage)) : [];

// AT03 mínimo y válido: dos préstamos del mismo período.
function at03Valido(fecha = '20261031', saldo = '100.00') {
  return textoCsv(campos(), [
    filaSintetica({ Fecha: fecha, Numero_Prestamo: 'P1', Saldo: saldo }),
    filaSintetica({ Fecha: fecha, Numero_Prestamo: 'P2', Codigo_Banco: '102', Saldo: '50.00' }),
  ]);
}

test('un archivo válido se procesa, se guarda en storage/periodos y se publica como NUEVO', () => {
  const storage = storageTemporal();
  const almacen = crearAlmacen(catalogosReales());
  const resultado = cargarPeriodo(almacen, at03Valido(), 'AT03_octubre.csv', { carpetaStorage: storage });

  assert.equal(resultado.archivo, 'AT03_octubre.csv');
  assert.equal(resultado.periodos.length, 1);
  assert.equal(resultado.periodos[0].accion, 'NUEVO');
  assert.equal(resultado.periodos[0].anterior, null);
  assert.deepEqual(almacen.fechas(), ['20261031']);
  assert.equal(almacen.obtener('20261031').calidad.universoValido, 2);
  assert.equal(almacen.obtener('20261031').nombreArchivo, 'AT03_octubre.csv');

  const copias = copiasGuardadas(storage);
  assert.deepEqual(copias, [resultado.copia]);
  assert.equal(nombreOriginal(resultado.copia), 'AT03_octubre.csv');
  assert.equal(fs.readFileSync(path.join(carpetaDePeriodos(storage), resultado.copia), 'utf8'), at03Valido());
});

test('un período con una Fecha ya cargada la reemplaza y se informa como ACTUALIZACION', () => {
  const storage = storageTemporal();
  const almacen = crearAlmacen(catalogosReales());
  cargarPeriodo(almacen, at03Valido('20261031', '100.00'), 'AT03_octubre.csv', { carpetaStorage: storage });
  const segunda = cargarPeriodo(almacen, at03Valido('20261031', '300.00'), 'AT03_octubre_v2.csv', {
    carpetaStorage: storage,
  });

  assert.equal(segunda.periodos[0].accion, 'ACTUALIZACION');
  assert.deepEqual(almacen.fechas(), ['20261031']);
  assert.equal(almacen.obtener('20261031').nombreArchivo, 'AT03_octubre_v2.csv');
  assert.equal(almacen.obtener('20261031').calidad.saldoTotalValido, 30000 + 5000); // centavos
});

test('el período anterior para comparar es la Fecha cargada justo antes', () => {
  const storage = storageTemporal();
  const almacen = crearAlmacen(catalogosReales());
  cargarPeriodo(almacen, at03Valido('20260831'), 'AT03_agosto.csv', { carpetaStorage: storage });
  cargarPeriodo(almacen, at03Valido('20261031'), 'AT03_octubre.csv', { carpetaStorage: storage });
  const septiembre = cargarPeriodo(almacen, at03Valido('20260930'), 'AT03_septiembre.csv', { carpetaStorage: storage });

  assert.equal(septiembre.periodos[0].anterior.fecha, '20260831');
  assert.equal(periodoAnterior(almacen, '20261031').fecha, '20260930');
  assert.equal(periodoAnterior(almacen, '20260831'), null);
});

test('al arrancar se recargan las copias en orden de carga: la más reciente de una Fecha gana', () => {
  const storage = storageTemporal();
  const primero = crearAlmacen(catalogosReales());
  cargarPeriodo(primero, at03Valido('20261031', '100.00'), 'AT03_octubre.csv', { carpetaStorage: storage });
  cargarPeriodo(primero, at03Valido('20261031', '300.00'), 'AT03_octubre_v2.csv', { carpetaStorage: storage });
  cargarPeriodo(primero, at03Valido('20261130'), 'AT03_noviembre.csv', { carpetaStorage: storage });

  const reiniciado = crearAlmacen(catalogosReales());
  const { recargados, avisos } = recargarPeriodosGuardados(reiniciado, storage);
  assert.deepEqual(avisos, []);
  assert.deepEqual(recargados, ['20261031', '20261031', '20261130']);
  assert.deepEqual(reiniciado.fechas(), ['20261031', '20261130']);
  assert.equal(reiniciado.obtener('20261031').nombreArchivo, 'AT03_octubre_v2.csv');
  assert.equal(reiniciado.obtener('20261031').calidad.saldoTotalValido, 35000);
});

test('sin carpeta storage/periodos no se recarga nada', () => {
  const almacen = crearAlmacen(catalogosReales());
  assert.deepEqual(recargarPeriodosGuardados(almacen, storageTemporal()), { recargados: [], avisos: [] });
});

test('una copia que ya no se puede procesar no detiene el arranque: queda como aviso', () => {
  const storage = storageTemporal();
  fs.mkdirSync(carpetaDePeriodos(storage), { recursive: true });
  fs.writeFileSync(path.join(carpetaDePeriodos(storage), '1795793400000__roto.csv'), 'a,b\n1,2\n');
  const almacen = crearAlmacen(catalogosReales());
  const { recargados, avisos } = recargarPeriodosGuardados(almacen, storage);
  assert.deepEqual(recargados, []);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /roto\.csv/);
});

// Un archivo inválido lanza ErrorDeDatos, no se guarda y no cambia lo que ya estaba cargado.
function rechaza(texto, nombre, validarError) {
  const storage = storageTemporal();
  const almacen = crearAlmacen(catalogosReales());
  cargarPeriodo(almacen, at03Valido('20260930'), 'AT03_septiembre.csv', { carpetaStorage: storage });
  assert.throws(() => cargarPeriodo(almacen, texto, nombre, { carpetaStorage: storage }), (error) => {
    assert.ok(error instanceof ErrorDeDatos, `se esperaba ErrorDeDatos y llegó ${error}`);
    validarError(error);
    return true;
  });
  assert.equal(copiasGuardadas(storage).length, 1);
  assert.deepEqual(almacen.fechas(), ['20260930']);
  assert.equal(almacen.obtener('20260930').nombreArchivo, 'AT03_septiembre.csv');
}

test('rechaza un archivo con columnas faltantes, con detalles claros', () => {
  const sinSaldo = campos().filter((c) => c !== 'Saldo');
  rechaza(textoCsv(sinSaldo, [filaSintetica({ Fecha: '20260930' })]), 'AT03_malo.csv', (error) => {
    assert.match(error.message, /AT03_malo\.csv/);
    assert.ok(error.detalles.length > 0);
  });
});

test('rechaza un archivo con un Saldo inválido e indica la fila', () => {
  const texto = textoCsv(campos(), [
    filaSintetica({ Fecha: '20260930', Numero_Prestamo: 'P1' }),
    filaSintetica({ Fecha: '20260930', Numero_Prestamo: 'P2', Saldo: 'mil' }),
  ]);
  rechaza(texto, 'AT03_saldo_malo.csv', (error) => {
    assert.match(error.message, /Saldo/);
    assert.ok(error.detalles.some((d) => d.includes('3')), 'los detalles deben indicar la fila 3');
  });
});

test('rechaza un archivo vacío o con solo encabezados', () => {
  rechaza('', 'AT03_vacio.csv', (error) => assert.match(error.message, /vacío/));
  rechaza(textoCsv(campos(), []), 'AT03_sin_filas.csv', (error) => assert.match(error.message, /no tiene filas/));
});

test('rechaza un archivo que no es .csv o sin nombre', () => {
  rechaza(at03Valido('20260930'), 'AT03.xlsx', (error) => assert.match(error.message, /no es un archivo \.csv/));
  rechaza(at03Valido('20260930'), '', (error) => assert.match(error.message, /Falta el nombre/));
});

test('el nombre del archivo se limpia: sin carpetas ni caracteres raros', () => {
  assert.equal(limpiarNombreArchivo('../../etc/AT03 sept.csv'), 'AT03_sept.csv');
  assert.equal(limpiarNombreArchivo('C:\\datos\\AT03_202609.CSV'.replaceAll('\\', '/')), 'AT03_202609.CSV');
  assert.equal(limpiarNombreArchivo('AT03_señal.csv'), 'AT03_se_al.csv');
});

test('el gancho de publicación (#7) se llama con el resultado y, si falla, no rompe la carga', async () => {
  let recibido = null;
  await avisarPublicacion({ archivo: 'x.csv' }, (resultado) => {
    recibido = resultado;
  });
  assert.deepEqual(recibido, { archivo: 'x.csv' });

  const errorOriginal = console.error;
  console.error = () => {};
  try {
    await avisarPublicacion({}, () => {
      throw new Error('sin correo');
    });
  } finally {
    console.error = errorOriginal;
  }
});
