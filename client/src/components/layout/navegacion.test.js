import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SECCIONES, seccionesVisibles } from './navegacion.js'

const rutas = (puede) => seccionesVisibles(puede).map((s) => s.ruta)
const conOpciones = (...opciones) => (opcion) => opciones.includes(opcion)

test('sin opciones (cargando o API caída) quedan solo las secciones públicas', () => {
  assert.deepEqual(rutas(() => false), ['/', '/rankings', '/reportes', '/calidad', '/verificacion'])
})

test('Analista ve Comparar períodos pero no Administración', () => {
  const resultado = rutas(conOpciones('consultar_rankings', 'descargar', 'comparar_periodos', 'reportes_personalizados'))
  assert.ok(resultado.includes('/comparar'))
  assert.ok(!resultado.includes('/admin'))
})

test('Administrador ve todas las secciones, en el orden del menú', () => {
  const puede = conOpciones('comparar_periodos', 'cargar_periodo')
  assert.deepEqual(rutas(puede), SECCIONES.map((s) => s.ruta))
})

test('cada sección restringida pide una opción y todas llevan data-guia', () => {
  assert.equal(SECCIONES.find((s) => s.ruta === '/comparar').opcion, 'comparar_periodos')
  assert.equal(SECCIONES.find((s) => s.ruta === '/admin').opcion, 'cargar_periodo')
  assert.ok(SECCIONES.every((s) => s.guia?.startsWith('global.menu-')))
})

test('el sitio público llama Inicio a la ruta / y conserva su data-guia', () => {
  const publico = seccionesVisibles(() => false, { interno: false })
  assert.deepEqual(publico.map((s) => s.ruta), ['/', '/rankings', '/reportes', '/calidad', '/verificacion'])
  assert.equal(publico[0].nombre, 'Inicio')
  assert.equal(publico[0].guia, 'global.menu-panel')
  assert.equal(seccionesVisibles(() => false)[0].nombre, 'Panel')
})
