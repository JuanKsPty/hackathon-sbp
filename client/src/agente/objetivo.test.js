// Objetivo del cursor en la demostración (#123). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { objetivoDe } from './objetivo.js'

test('objetivoDe: menú, columna, fila y control', () => {
  assert.equal(objetivoDe({ tipo: 'ir', ruta: '/rankings' }), '[data-guia="global.menu-rankings"]')
  assert.equal(objetivoDe({ tipo: 'ir', ruta: '/' }), '[data-guia="global.menu-panel"]')
  assert.equal(objetivoDe({ tipo: 'ir', ruta: '/otra' }), null)
  assert.equal(
    objetivoDe({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Operaciones_Validas' }),
    '[data-guia="rankings.tabla"] [data-guia-columna="Operaciones_Validas"]',
  )
  assert.equal(
    objetivoDe({ tipo: 'resaltar', control: 'rankings.tabla', fila: '104' }),
    '[data-guia="rankings.tabla"] [data-fila-banco="104"]',
  )
  assert.equal(objetivoDe({ tipo: 'elegir', control: 'rankings.selector-ranking' }), '[data-guia="rankings.selector-ranking"]')
  assert.equal(objetivoDe({ tipo: 'señalar', control: 'rankings.grafico' }), '[data-guia="rankings.grafico"]')
  assert.equal(objetivoDe({ tipo: 'volar' }), null)
})

test('objetivosDe: al elegir, primero la opción y después el control', async () => {
  const { objetivosDe } = await import('./objetivo.js')
  assert.deepEqual(objetivosDe({ tipo: 'elegir', control: 'rankings.selector-ranking', valor: 'COMERCIO' }), [
    '[data-guia="rankings.selector-ranking"] [data-guia-opcion="COMERCIO"]',
    '[data-guia="rankings.selector-ranking"]',
  ])
  assert.deepEqual(objetivosDe({ tipo: 'ordenar', control: 'rankings.tabla', columna: 'Banco' }), ['[data-guia="rankings.tabla"] [data-guia-columna="Banco"]'])
  assert.deepEqual(objetivosDe({ tipo: 'ir', ruta: '/otra' }), [])
})
