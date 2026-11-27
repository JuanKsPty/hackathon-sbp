// Motor del cursor guía (#72). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ESTADO_INICIAL, normalizarPasos, reductorGuia, pasoActual, necesitaNavegar, selectorDe, posicionGlobo } from './motor.js'

const PASOS = [
  { ruta: null, guia: 'global.menu-rankings', texto: 'Entra a Rankings.' },
  { ruta: '/rankings', guia: 'rankings.selector-ranking', texto: 'Elige COMERCIO.' },
  { ruta: '/rankings', guia: 'rankings.tabla', texto: 'Aquí ves la posición.' },
]
const rect = { top: 100, left: 100, width: 200, height: 40 }

test('normalizarPasos descarta pasos incompletos', () => {
  assert.deepEqual(normalizarPasos({ pasos: [...PASOS, { guia: 'x.y' }, { texto: 'sin guía' }, null] }), PASOS)
  assert.deepEqual(normalizarPasos(null), [])
})

test('recorre los pasos: navegar, buscar, mostrar, siguiente y fin', () => {
  let e = reductorGuia(ESTADO_INICIAL, { tipo: 'iniciar', pasos: PASOS })
  assert.equal(e.fase, 'navegando')
  assert.equal(pasoActual(e).guia, 'global.menu-rankings')
  e = reductorGuia(e, { tipo: 'navegado' })
  assert.equal(e.fase, 'buscando')
  e = reductorGuia(e, { tipo: 'encontrado', rect })
  assert.equal(e.fase, 'mostrando')
  assert.deepEqual(e.rect, rect)
  e = reductorGuia(e, { tipo: 'mover', rect: { ...rect, top: 50 } })
  assert.equal(e.rect.top, 50)
  e = reductorGuia(e, { tipo: 'siguiente' })
  assert.deepEqual([e.indice, e.fase, e.rect], [1, 'navegando', null])
  e = reductorGuia(e, { tipo: 'anterior' })
  assert.equal(e.indice, 0)
  e = reductorGuia(reductorGuia(e, { tipo: 'siguiente' }), { tipo: 'siguiente' })
  assert.equal(e.indice, 2)
  assert.deepEqual(reductorGuia(e, { tipo: 'siguiente' }), ESTADO_INICIAL) // después del último, termina
})

test('casos borde: sin pasos, no encontrado, anterior en el primero y acciones sin guía activa', () => {
  assert.deepEqual(reductorGuia(ESTADO_INICIAL, { tipo: 'iniciar', pasos: [] }), ESTADO_INICIAL)
  let e = reductorGuia(ESTADO_INICIAL, { tipo: 'iniciar', pasos: PASOS })
  assert.equal(reductorGuia(e, { tipo: 'anterior' }), e)
  e = reductorGuia(reductorGuia(e, { tipo: 'navegado' }), { tipo: 'no-encontrado' })
  assert.deepEqual([e.fase, e.rect], ['no-encontrado', null])
  assert.equal(reductorGuia(e, { tipo: 'mover', rect }), e) // no mueve si no se está mostrando
  assert.deepEqual(reductorGuia(e, { tipo: 'terminar' }), ESTADO_INICIAL)
  assert.equal(reductorGuia(ESTADO_INICIAL, { tipo: 'encontrado', rect }), ESTADO_INICIAL)
})

test('necesitaNavegar compara rutas y respeta los elementos globales', () => {
  assert.equal(necesitaNavegar(PASOS[0], '/calidad'), false) // ruta null: está en todas las páginas
  assert.equal(necesitaNavegar(PASOS[1], '/rankings'), false)
  assert.equal(necesitaNavegar(PASOS[1], '/rankings/'), false)
  assert.equal(necesitaNavegar(PASOS[1], '/'), true)
  assert.equal(necesitaNavegar({ ruta: '/', guia: 'panel.lideres', texto: 'x' }, '/'), false)
})

test('selectorDe arma el selector y rechaza identificadores raros', () => {
  assert.equal(selectorDe('rankings.tabla'), '[data-guia="rankings.tabla"]')
  assert.throws(() => selectorDe('x"] , body [a="'))
})

test('posicionGlobo elige un lado que entre en pantalla', () => {
  const pantalla = { ancho: 1000, alto: 800 }
  const globo = { ancho: 240, alto: 100 }
  assert.equal(posicionGlobo(rect, pantalla, globo).lado, 'abajo')
  // Elemento pegado abajo: va arriba.
  assert.equal(posicionGlobo({ top: 740, left: 400, width: 100, height: 40 }, pantalla, globo).lado, 'arriba')
  // Elemento alto que ocupa casi toda la altura, a la izquierda: va a la derecha.
  assert.equal(posicionGlobo({ top: 20, left: 20, width: 200, height: 760 }, pantalla, globo).lado, 'derecha')
  // Elemento pegado al borde izquierdo: el globo se corre para no salirse.
  const p = posicionGlobo({ top: 100, left: 0, width: 40, height: 40 }, pantalla, globo)
  assert.ok(p.left >= 8 && p.left + globo.ancho <= pantalla.ancho - 8)
  // Pantalla chica donde nada entra: queda dentro de los márgenes igual.
  const chica = posicionGlobo(rect, { ancho: 200, alto: 120 }, globo)
  assert.ok(chica.top >= 8 && chica.left >= 8)
})
