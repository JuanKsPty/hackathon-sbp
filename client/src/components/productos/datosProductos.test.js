import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  apiladoPorBanco,
  barrasDeCartera,
  barrasDeProducto,
  buscarProducto,
  evolucionDeProducto,
  opcionesProducto,
  PRODUCTO_INICIAL,
  productoDelBanco,
} from './datosProductos.js'

// Respuesta de prueba con la forma de GET /api/productos. Valores ilustrativos, no del motor.
const banco = (codigo, nombre, saldo, operaciones = 1) => ({ Codigo_Banco: codigo, Banco: nombre, Saldo: saldo, Operaciones: operaciones })
const DATOS = {
  periodo: '20260930',
  productos: [
    { Ranking: 'HIPOTECARIO', Subactividad: 'Vivienda propia', Saldo: 30, Bancos: [banco('101', 'A', 10), banco('102', 'B', 20)] },
    { Ranking: 'CONSUMO', Subactividad: 'Credito personal', Saldo: 9, Bancos: [banco('101', 'A', 4), banco('102', 'B', 5)] },
    { Ranking: 'CONSUMO', Subactividad: 'Tarjeta', Saldo: 7, Bancos: [banco('101', 'A', 5), banco('102', 'B', 2)] },
  ],
  bancos: [
    { Codigo_Banco: '101', Banco: 'A', Total_Cartera_Local_Valida: 19, Operaciones_Validas: 3 },
    { Codigo_Banco: '102', Banco: 'B', Total_Cartera_Local_Valida: 27, Operaciones_Validas: 4 },
  ],
}

test('el producto inicial es Tarjeta de CONSUMO y se encuentra por su clave', () => {
  assert.equal(PRODUCTO_INICIAL, 'CONSUMO|Tarjeta')
  assert.equal(buscarProducto(DATOS, PRODUCTO_INICIAL).Saldo, 7)
  assert.equal(buscarProducto(DATOS, 'CONSUMO|No existe'), null)
  assert.equal(buscarProducto(null, PRODUCTO_INICIAL), null)
})

test('las opciones siguen el orden del API', () => {
  assert.deepEqual(opcionesProducto(DATOS).map((o) => o.etiqueta), ['HIPOTECARIO · Vivienda propia', 'CONSUMO · Credito personal', 'CONSUMO · Tarjeta'])
})

test('las barras van de mayor a menor saldo y no cambian los valores', () => {
  assert.deepEqual(barrasDeProducto(buscarProducto(DATOS, PRODUCTO_INICIAL)).map((b) => [b.codigo, b.saldo]), [['101', 5], ['102', 2]])
  assert.deepEqual(barrasDeCartera(DATOS).map((b) => [b.codigo, b.saldo]), [['102', 27], ['101', 19]])
})

test('el apilado de CONSUMO tiene una fila por banco y una serie por producto', () => {
  const { filas, series } = apiladoPorBanco(DATOS, 'CONSUMO')
  assert.deepEqual(series, ['Credito personal', 'Tarjeta'])
  assert.deepEqual(filas, [
    { codigo: '101', nombre: 'A', 'Credito personal': 4, Tarjeta: 5 },
    { codigo: '102', nombre: 'B', 'Credito personal': 5, Tarjeta: 2 },
  ])
})

test('con banco, el producto y la evolución salen del bloque banco', () => {
  const conBanco = (periodo, saldo) => ({ periodo, productos: [], banco: { productos: [{ Ranking: 'CONSUMO', Subactividad: 'Tarjeta', Saldo: saldo }] } })
  assert.equal(productoDelBanco(conBanco('20260930', 3), PRODUCTO_INICIAL).Saldo, 3)
  assert.equal(productoDelBanco(DATOS, PRODUCTO_INICIAL), null)
  assert.deepEqual(evolucionDeProducto([conBanco('20260930', 3), conBanco('20260831', 2)], PRODUCTO_INICIAL, true), [
    { periodo: '20260831', saldo: 2 },
    { periodo: '20260930', saldo: 3 },
  ])
})

test('la evolución ordena los cortes y omite los que no traen el producto', () => {
  const respuestas = [{ ...DATOS, periodo: '20260930' }, { periodo: '20260831', productos: [] }, { ...DATOS, periodo: '20260731' }]
  assert.deepEqual(evolucionDeProducto(respuestas, PRODUCTO_INICIAL), [
    { periodo: '20260731', saldo: 7 },
    { periodo: '20260930', saldo: 7 },
  ])
})
