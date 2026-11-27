import assert from 'node:assert/strict'
import { test } from 'node:test'

import { nombreCorto } from './nombres.js'

test('nombre corto: el propio, el de la tabla o el completo', () => {
  assert.equal(nombreCorto({ ruta: '/x', nombre: 'Largo', corto: 'Corto' }), 'Corto')
  assert.equal(nombreCorto({ ruta: '/calidad', nombre: 'Calidad de datos' }), 'Calidad')
  assert.equal(nombreCorto({ ruta: '/rankings', nombre: 'Rankings' }), 'Rankings')
})
