import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SECCIONES, SECCIONES_PUBLICO, rutaEnElSitio, seccionesVisibles } from './navegacion.js'

const rutas = (puede, sitio = { interno: true }) => seccionesVisibles(puede, sitio).map((s) => s.ruta)
const conOpciones = (...opciones) => (opcion) => opciones.includes(opcion)

test('interno sin opciones (cargando o API caída) quedan solo las secciones públicas', () => {
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

test('el menú del sitio público empieza en el Panel (/panel) y nunca muestra secciones de Analista ni de Administrador', () => {
  const todas = () => true
  assert.deepEqual(rutas(todas, { interno: false }), ['/panel', '/rankings', '/reportes', '/calidad', '/verificacion'])
  assert.equal(seccionesVisibles(todas, { interno: false })[0].nombre, 'Panel')
  assert.equal(SECCIONES_PUBLICO[0].guia, 'global.menu-panel')
  assert.ok(SECCIONES_PUBLICO.every((s) => !s.opcion && s.guia?.startsWith('global.menu-')))
})

test('rutaEnElSitio: en el público / (Panel del catálogo) es /panel; en el interno no cambia', () => {
  assert.equal(rutaEnElSitio('/', { interno: false }), '/panel')
  assert.equal(rutaEnElSitio('/rankings', { interno: false }), '/rankings')
  assert.equal(rutaEnElSitio('/', { interno: true }), '/')
  assert.equal(rutaEnElSitio(null, { interno: false }), null)
})
