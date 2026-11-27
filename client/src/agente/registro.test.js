// Registro de controles (#122). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearRegistro } from './registro.js'

test('registrar, obtener y quitar un control', () => {
  const registro = crearRegistro()
  const handlers = { elegir: () => {} }
  const quitar = registro.registrar('rankings.selector-ranking', handlers)
  assert.equal(registro.obtener('rankings.selector-ranking'), handlers)
  quitar()
  assert.equal(registro.obtener('rankings.selector-ranking'), null)
})

test('quitar no borra un registro más nuevo del mismo control', () => {
  const registro = crearRegistro()
  const viejo = registro.registrar('rankings.tabla', { a: 1 })
  const nuevo = { b: 2 }
  registro.registrar('rankings.tabla', nuevo)
  viejo()
  assert.equal(registro.obtener('rankings.tabla'), nuevo)
})

test('esperar resuelve cuando el control se registra (después de navegar)', async () => {
  const registro = crearRegistro()
  const promesa = registro.esperar('rankings.tabla', { timeout: 1000 })
  const handlers = { ordenar: () => {} }
  setTimeout(() => registro.registrar('rankings.tabla', handlers), 10)
  assert.equal(await promesa, handlers)
})

test('esperar devuelve null si no aparece o si se cancela', async () => {
  const registro = crearRegistro()
  assert.equal(await registro.esperar('no.existe', { timeout: 20 }), null)
  const control = new AbortController()
  const promesa = registro.esperar('rankings.tabla', { timeout: 1000, signal: control.signal })
  control.abort()
  assert.equal(await promesa, null)
})
