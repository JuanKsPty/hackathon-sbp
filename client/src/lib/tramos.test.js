import assert from 'node:assert/strict'
import { test } from 'node:test'
import { etiquetaTramo, tramosParaGrafico } from './tramos.js'

test('etiquetaTramo traduce los campos del diccionario AT03', () => {
  assert.equal(etiquetaTramo('Monto_por_Vencer_30_dias'), '30 días')
  assert.equal(etiquetaTramo('Monto_por_Vencer_1_ano'), '1 año')
  assert.equal(etiquetaTramo('Monto_por_Vencer_1_a_5_anos'), '1 a 5 años')
  assert.equal(etiquetaTramo('Monto_por_Vencer_mas_10_anos'), 'Más de 10 años')
  assert.equal(etiquetaTramo('Monto_Vencido_180_dias'), '180 días')
  assert.equal(etiquetaTramo('Monto_Vencido_mas_1_ano'), 'Más de 1 año')
})

test('etiquetaTramo no falla con claves inesperadas', () => {
  assert.equal(etiquetaTramo(undefined), '')
  assert.equal(etiquetaTramo('otro_campo'), 'Otro campo')
})

test('tramosParaGrafico conserva el orden del API', () => {
  const filas = tramosParaGrafico({ Monto_Vencido_30_dias: 10, Monto_Vencido_60_dias: 5 })
  assert.deepEqual(filas, [
    { clave: 'Monto_Vencido_30_dias', tramo: '30 días', monto: 10 },
    { clave: 'Monto_Vencido_60_dias', tramo: '60 días', monto: 5 },
  ])
  assert.deepEqual(tramosParaGrafico(null), [])
})
