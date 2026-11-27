// Lectura de datos desde disco y casos de error poco frecuentes (#85): CSV ilegible, catálogo
// sin columnas, carpeta de datos con períodos repetidos, bitácora sin disco y script con datos faltantes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { leerCsv, exigirColumnas, ErrorDeDatos } from '../src/engine/csv.js';
import { almacenDesdeCarpeta } from '../src/datos/almacen.js';
import { ARCHIVOS_CATALOGO } from '../src/datos/paquete.js';
import { registrarOperacion } from '../src/datos/bitacora.js';
import { carpetaStorage } from '../src/datos/storage.js';
import { CARPETA_DATOS, catalogosReales, filaSintetica, textoCsv } from './ayuda.js';

const correr = promisify(execFile);
const carpetaTemporal = (prefijo) => fs.mkdtempSync(path.join(os.tmpdir(), prefijo));

// Cambia variables de entorno solo durante `accion` y las deja como estaban.
function conEntorno(cambios, accion) {
  const antes = Object.fromEntries(Object.keys(cambios).map((clave) => [clave, process.env[clave]]));
  const poner = (valores) => {
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  };
  poner(cambios);
  try {
    return accion();
  } finally {
    poner(antes);
  }
}

test('un CSV ilegible lanza ErrorDeDatos con el motivo del lector', () => {
  assert.throws(
    () => leerCsv('a,b\n1,2,3\n', 'roto.csv'),
    (error) => error instanceof ErrorDeDatos && /roto\.csv/.test(error.message) && error.detalles.length === 1,
  );
});

test('un catálogo sin las columnas requeridas lanza ErrorDeDatos con las que faltan', () => {
  assert.throws(
    () => exigirColumnas(['Codigo_Banco'], ['Codigo_Banco', 'Nombre_Banco'], 'Bancos.csv'),
    (error) => error instanceof ErrorDeDatos && /Nombre_Banco/.test(error.message),
  );
  assert.doesNotThrow(() => exigirColumnas(['a', 'b'], ['a'], 'x.csv'));
});

test('almacenDesdeCarpeta procesa la carpeta; si dos archivos traen la misma Fecha, gana el último y avisa', () => {
  const carpeta = carpetaTemporal('sbp-carpeta-');
  for (const archivo of Object.values(ARCHIVOS_CATALOGO)) {
    fs.copyFileSync(path.join(CARPETA_DATOS, archivo), path.join(carpeta, archivo));
  }
  const campos = catalogosReales().campos.map((c) => c.campo);
  const at03 = (saldo) => textoCsv(campos, [filaSintetica({ Fecha: '20261031', Numero_Prestamo: 'P1', Saldo: saldo })]);
  fs.writeFileSync(path.join(carpeta, 'AT03_a.csv'), at03('100.00'));
  fs.writeFileSync(path.join(carpeta, 'AT03_b.csv'), at03('250.00'));

  const avisos = [];
  const avisoOriginal = console.warn;
  console.warn = (texto) => avisos.push(texto);
  try {
    const almacen = almacenDesdeCarpeta(carpeta);
    assert.deepEqual(almacen.fechas(), ['20261031']);
    assert.equal(almacen.obtener('20261031').nombreArchivo, 'AT03_b.csv');
    assert.equal(almacen.obtener('20261031').calidad.saldoTotalValido, 25000); // centavos
  } finally {
    console.warn = avisoOriginal;
  }
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /AT03_b\.csv reemplaza al de AT03_a\.csv/);
});

test('si la bitácora no se puede escribir, la operación sigue y solo se avisa en consola', () => {
  const archivo = path.join(carpetaTemporal('sbp-sin-disco-'), 'soy-un-archivo');
  fs.writeFileSync(archivo, 'no es una carpeta');
  const errores = [];
  const errorOriginal = console.error;
  console.error = (texto) => errores.push(texto);
  try {
    const registro = conEntorno({ STORAGE_DIR: path.join(archivo, 'storage') }, () =>
      registrarOperacion({ operacion: 'carga_periodo', perfil: 'admin', resultado: 'exito' }),
    );
    assert.equal(registro.operacion, 'carga_periodo');
  } finally {
    console.error = errorOriginal;
  }
  assert.match(errores[0], /No se pudo escribir la bitácora/);
});

test('fuera de las pruebas y sin STORAGE_DIR, storage/ queda en la raíz del repo', () => {
  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const carpeta = conEntorno({ STORAGE_DIR: undefined, NODE_TEST_CONTEXT: undefined }, () => carpetaStorage());
  assert.equal(path.resolve(carpeta), path.resolve(raiz, 'storage'));
});

test('npm run procesar con una carpeta sin datos informa el error y sale con código 1', async () => {
  const script = fileURLToPath(new URL('../scripts/procesar.js', import.meta.url));
  const vacia = carpetaTemporal('sbp-vacia-');
  await assert.rejects(
    correr(process.execPath, [script, '--datos', vacia, '--salida', path.join(vacia, 'salidas')]),
    (error) => error.code === 1 && /Error:/.test(error.stderr),
  );
});
