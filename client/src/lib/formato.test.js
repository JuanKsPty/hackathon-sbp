import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatearCorte, formatearMes, formatearPeriodo } from './formato.js'

test('formatearMes muestra el período como mes y año', () => {
  assert.equal(formatearMes('20260930'), 'Septiembre 2026')
  assert.equal(formatearMes('20260731'), 'Julio 2026')
  assert.equal(formatearMes('20261231'), 'Diciembre 2026')
  assert.equal(formatearMes('20270131'), 'Enero 2027')
})

test('formatearMes devuelve tal cual lo que no es AAAAMMDD', () => {
  assert.equal(formatearMes('septiembre'), 'septiembre')
  assert.equal(formatearMes('20261330'), '20261330')
  assert.equal(formatearMes(null), '')
  assert.equal(formatearMes(undefined), '')
})

test('formatearCorte da la fecha de corte corta, y vacío si no es AAAAMMDD', () => {
  assert.equal(formatearCorte('20260930'), 'corte al 30 sep')
  assert.equal(formatearCorte('20260831'), 'corte al 31 ago')
  assert.equal(formatearCorte('x'), '')
})

test('formatearPeriodo no cambia: sigue dando la fecha de corte completa', () => {
  assert.equal(formatearPeriodo('20260930'), '30 sep 2026')
})
