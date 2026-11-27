// Acciones de pantalla por reglas (#121).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoDe, columnaDe, ordenDe, bancoArriba } from '../../src/ai/pantallaReglas.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { paqueteReal } from '../ayuda.js';

test('modoDe: cómo o dónde demuestra; lo demás ejecuta', () => {
  assert.equal(modoDe('¿Cómo veo el banco con más operaciones?'), 'demostrar');
  assert.equal(modoDe('¿Dónde está la tabla de calidad?'), 'demostrar');
  assert.equal(modoDe('¿Cuál es el banco con más operaciones?'), 'ejecutar');
  assert.equal(modoDe('Banco con más saldo en COMERCIO'), 'ejecutar');
});

test('columnaDe reconoce la columna de la pregunta', () => {
  assert.equal(columnaDe('¿Cuál es el banco con más operaciones?'), 'Operaciones_Validas');
  assert.equal(columnaDe('el de mayor ponderación'), 'Ponderacion_Pct');
  assert.equal(columnaDe('mayor cartera total'), 'Total_Cartera_Local_Valida');
  assert.equal(columnaDe('el que tiene más saldo'), 'Saldo_Actividad');
  assert.equal(columnaDe('¿quién lidera?'), 'Posicion');
  assert.equal(columnaDe('hola'), null);
});

test('ordenDe deja arriba lo que se pregunta', () => {
  assert.equal(ordenDe('más operaciones', 'Operaciones_Validas'), 'desc');
  assert.equal(ordenDe('menos operaciones', 'Operaciones_Validas'), 'asc');
  assert.equal(ordenDe('el mejor', 'Posicion'), 'asc');
  assert.equal(ordenDe('el último', 'Posicion'), 'desc');
});

test('bancoArriba ordena las filas del motor como la tabla', () => {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const filas = almacen.obtener('20260930').rankings.find((r) => r.ranking === 'COMERCIO').filas;
  const maxOperaciones = Math.max(...filas.map((f) => f.operacionesValidas));
  const conMas = bancoArriba(almacen, '20260930', 'COMERCIO', 'Operaciones_Validas', 'desc');
  assert.equal(filas.find((f) => f.codigoBanco === conMas).operacionesValidas, maxOperaciones);
  // El mejor por posición es el líder.
  assert.equal(bancoArriba(almacen, '20260930', 'COMERCIO', 'Posicion', 'asc'), filas.find((f) => f.posicion === 1).codigoBanco);
  // El de menos saldo es el último del ranking (ordenado por saldo).
  assert.equal(bancoArriba(almacen, '20260930', 'COMERCIO', 'Saldo_Actividad', 'asc'), filas.find((f) => f.posicion === filas.length).codigoBanco);
  assert.equal(bancoArriba(almacen, '20261031', 'COMERCIO', 'Posicion', 'asc'), null);
});
