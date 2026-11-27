import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GLOSARIO, definicion } from './glosario.js'

test('cada término del glosario tiene nombre y una definición corta', () => {
  for (const [clave, { termino, definicion: texto }] of Object.entries(GLOSARIO)) {
    assert.ok(termino?.length > 0, clave)
    assert.ok(texto?.length > 20 && texto.length <= 220, `${clave}: ${texto?.length} caracteres`)
  }
})

test('las definiciones no traen montos ni porcentajes (R2)', () => {
  for (const [clave, { definicion: texto }] of Object.entries(GLOSARIO)) {
    // Se permiten números de reglas (E1, 07, 6 actividades, 4 decimales, 100), no cifras de resultados.
    assert.doesNotMatch(texto, /\d[\d,]*\.\d{2}\b|\d+(\.\d+)?\s?%/, clave)
  }
})

test('están los términos que usan Rankings y Calidad', () => {
  for (const clave of ['posicion', 'saldo_actividad', 'total_cartera', 'ponderacion', 'operaciones', 'subactividad', 'regla_sb21', 'universo', 'filas_leidas', 'E1', 'E2', 'E3', 'E4', 'cascada']) {
    assert.ok(definicion(clave), clave)
  }
  assert.equal(definicion('no-existe'), null)
})
