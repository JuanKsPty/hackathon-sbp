import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GLOSARIO, entradaDeGlosario } from './glosario.js'

const PEDIDOS = ['ponderacion', 'total_cartera', 'universo', 'cascada', 'e1', 'e2', 'e3', 'e4', 'operaciones', 'sb21']

test('el glosario trae los términos pedidos en #129, con nombre y definición', () => {
  for (const termino of PEDIDOS) {
    const entrada = entradaDeGlosario(termino)
    assert.ok(entrada, termino)
    assert.ok(entrada.nombre.length > 0, termino)
    assert.ok(entrada.definicion.length > 20, termino)
  }
  assert.equal(entradaDeGlosario('no-existe'), null)
})

test('las definiciones no traen cifras (R2): solo los códigos E1–E4, SB21 y la facilidad 07', () => {
  for (const [termino, { nombre, definicion }] of Object.entries(GLOSARIO)) {
    const sinCodigos = `${nombre} ${definicion}`.replace(/E[1-4]|SB21/g, '').replace(/\b07\b/g, '')
    assert.doesNotMatch(sinCodigos, /\d/, termino)
  }
})
