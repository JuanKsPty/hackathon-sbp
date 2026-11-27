// Lógica pura de Comparar (#61). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  alternarOrden,
  nombreDeMotivo,
  ordenarMovimientos,
  ORDEN_INICIAL,
  periodosPorDefecto,
  resolverOpcion,
  tendenciaDeCambio,
  validarRango,
} from './movimientos.js'

const fila = (Banco, Posicion_actual, extra = {}) => ({
  Banco,
  Posicion_anterior: Posicion_actual,
  Posicion_actual,
  Cambio_Posicion: 0,
  Var_Saldo: 0,
  Var_Saldo_Pct: 0,
  Significativo: false,
  Motivos: [],
  ...extra,
})

test('tendenciaDeCambio: sube, baja, se mantiene y sin dato', () => {
  assert.equal(tendenciaDeCambio(2), 'sube')
  assert.equal(tendenciaDeCambio(-1), 'baja')
  assert.equal(tendenciaDeCambio(0), 'igual')
  assert.equal(tendenciaDeCambio(null), 'sin_dato')
  assert.equal(tendenciaDeCambio(undefined), 'sin_dato')
})

test('periodosPorDefecto: el penúltimo y el último, sin importar el orden recibido', () => {
  assert.deepEqual(periodosPorDefecto(['20260930', '20260731', '20260831']), { desde: '20260831', hasta: '20260930' })
  assert.deepEqual(periodosPorDefecto(['20260930']), { desde: null, hasta: '20260930' })
  assert.deepEqual(periodosPorDefecto([]), { desde: null, hasta: null })
})

test('resolverOpcion: respeta la elección mientras siga siendo una opción válida', () => {
  const fechas = ['20260731', '20260831', '20260930']
  assert.equal(resolverOpcion('20260731', fechas, '20260831'), '20260731')
  assert.equal(resolverOpcion('20250101', fechas, '20260831'), '20260831')
  assert.equal(resolverOpcion(null, fechas, '20260831'), '20260831')
})

test('validarRango: desde debe ser anterior a hasta', () => {
  assert.equal(validarRango('20260731', '20260930'), null)
  assert.match(validarRango('20260930', '20260731'), /anterior/)
  assert.match(validarRango('20260831', '20260831'), /anterior/)
  assert.match(validarRango(null, '20260831'), /Elige/)
  assert.match(validarRango('20260731', null), /Elige/)
})

test('nombreDeMotivo: traduce los motivos conocidos y deja pasar los demás', () => {
  assert.equal(nombreDeMotivo('cambio_lider'), 'Cambio de líder')
  assert.equal(nombreDeMotivo('motivo_nuevo'), 'motivo_nuevo')
})

test('ordenarMovimientos: por posición actual por omisión, sin mutar la lista', () => {
  const filas = [fila('C', 3), fila('A', 1), fila('B', 2)]
  assert.deepEqual(ordenarMovimientos(filas, ORDEN_INICIAL).map((f) => f.Banco), ['A', 'B', 'C'])
  assert.deepEqual(filas.map((f) => f.Banco), ['C', 'A', 'B'])
})

test('ordenarMovimientos: ascendente, descendente y texto con tildes', () => {
  const filas = [fila('Banco Ñandú', 1, { Var_Saldo: 5 }), fila('Banco Zeta', 2, { Var_Saldo: -9 }), fila('Banco Álamo', 3, { Var_Saldo: 1 })]
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Var_Saldo', ascendente: true }).map((f) => f.Var_Saldo), [-9, 1, 5])
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Var_Saldo', ascendente: false }).map((f) => f.Var_Saldo), [5, 1, -9])
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Banco', ascendente: true }).map((f) => f.Banco), ['Banco Álamo', 'Banco Ñandú', 'Banco Zeta'])
})

test('ordenarMovimientos: los valores vacíos van al final en los dos sentidos', () => {
  const filas = [fila('A', 1, { Var_Saldo_Pct: null }), fila('B', 2, { Var_Saldo_Pct: 7 }), fila('C', 3, { Var_Saldo_Pct: -3 })]
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Var_Saldo_Pct', ascendente: true }).map((f) => f.Banco), ['C', 'B', 'A'])
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Var_Saldo_Pct', ascendente: false }).map((f) => f.Banco), ['B', 'C', 'A'])
})

test('ordenarMovimientos: significativos y motivos; los empates salen por posición actual', () => {
  const filas = [
    fila('A', 1, { Significativo: false }),
    fila('B', 2, { Significativo: true, Motivos: ['cambio_lider'] }),
    fila('C', 3, { Significativo: true, Motivos: ['cambio_posicion', 'var_saldo_pct'] }),
    fila('D', 4, { Significativo: true, Motivos: ['var_saldo_pct'] }),
  ]
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Significativo', ascendente: false }).map((f) => f.Banco), ['B', 'C', 'D', 'A'])
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Motivos', ascendente: false }).map((f) => f.Banco), ['C', 'B', 'D', 'A'])
})

test('ordenarMovimientos: una clave desconocida cae en la posición actual', () => {
  const filas = [fila('B', 2), fila('A', 1)]
  assert.deepEqual(ordenarMovimientos(filas, { clave: 'Inexistente', ascendente: true }).map((f) => f.Banco), ['A', 'B'])
})

test('alternarOrden: otro clic invierte; una columna nueva empieza ascendente', () => {
  assert.deepEqual(alternarOrden({ clave: 'Banco', ascendente: true }, 'Banco'), { clave: 'Banco', ascendente: false })
  assert.deepEqual(alternarOrden({ clave: 'Banco', ascendente: false }, 'Var_Saldo'), { clave: 'Var_Saldo', ascendente: true })
})
