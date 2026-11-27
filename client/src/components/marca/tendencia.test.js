import assert from 'node:assert/strict'
import { test } from 'node:test'

import { tendenciaDe } from './tendencia.js'

test('sin variación no hay insignia', () => {
  assert.equal(tendenciaDe(undefined), null)
  assert.equal(tendenciaDe(null), null)
  assert.equal(tendenciaDe(Number.NaN), null)
  assert.equal(tendenciaDe({ tendencia: 'otra', texto: 'x' }), null)
})

test('un número toma la tendencia de su signo', () => {
  assert.equal(tendenciaDe(2).tendencia, 'sube')
  assert.equal(tendenciaDe(-0.5).tendencia, 'baja')
  assert.equal(tendenciaDe(0).tendencia, 'igual')
  assert.match(tendenciaDe(2).texto, /^\+2$/)
  assert.equal(tendenciaDe(0).texto, '0')
})

test('el objeto pasa tal cual', () => {
  assert.deepEqual(tendenciaDe({ tendencia: 'baja', texto: '−1 puesto' }), { tendencia: 'baja', texto: '−1 puesto' })
})
