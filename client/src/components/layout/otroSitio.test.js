import assert from 'node:assert/strict'
import { test } from 'node:test'

import { urlOtroSitio } from './otroSitio.js'

const en = (href) => ({ href, origin: new URL(href).origin })

test('producción: público e interno por subdominio', () => {
  assert.equal(urlOtroSitio({ interno: false, ubicacion: en('https://sbp.juank.tech/rankings') }), 'https://interno.sbp.juank.tech/')
  assert.equal(urlOtroSitio({ interno: true, ubicacion: en('https://interno.sbp.juank.tech/admin') }), 'https://sbp.juank.tech/')
})

test('local: cada sitio en su puerto', () => {
  assert.equal(urlOtroSitio({ interno: false, ubicacion: en('http://localhost:5173/') }), 'http://localhost:5174/')
  assert.equal(urlOtroSitio({ interno: true, ubicacion: en('http://localhost:5174/') }), 'http://localhost:5173/')
  assert.equal(urlOtroSitio({ interno: false, ubicacion: en('http://localhost:8080/') }), 'http://localhost:8081/')
  assert.equal(urlOtroSitio({ interno: true, ubicacion: en('http://127.0.0.1:4174/') }), 'http://127.0.0.1:4173/')
  assert.equal(urlOtroSitio({ interno: false, ubicacion: en('http://localhost:5273/') }), 'http://localhost:5274/')
})

test('las variables de entorno mandan', () => {
  const env = { VITE_URL_PUBLICO: 'https://a.test/', VITE_URL_INTERNO: 'https://b.test/' }
  assert.equal(urlOtroSitio({ interno: false, ubicacion: en('http://localhost:5173/'), env }), 'https://b.test/')
  assert.equal(urlOtroSitio({ interno: true, ubicacion: en('http://localhost:5174/'), env }), 'https://a.test/')
})
