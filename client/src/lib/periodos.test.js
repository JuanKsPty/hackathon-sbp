import assert from 'node:assert/strict'
import { test } from 'node:test'
import { periodoAnterior } from './periodos.js'

const periodos = [{ Fecha: '20260930' }, { Fecha: '20260731' }, { Fecha: '20260831' }]

test('periodoAnterior devuelve el período cargado inmediatamente anterior', () => {
  assert.equal(periodoAnterior(periodos, '20260930'), '20260831')
  assert.equal(periodoAnterior(periodos, '20260831'), '20260731')
})

test('periodoAnterior devuelve null si es el primero, no existe o no hay períodos', () => {
  assert.equal(periodoAnterior(periodos, '20260731'), null)
  assert.equal(periodoAnterior(periodos, '20250101'), null)
  assert.equal(periodoAnterior([], '20260930'), null)
  assert.equal(periodoAnterior(undefined, '20260930'), null)
})
