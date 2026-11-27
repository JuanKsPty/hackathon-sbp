import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SECCIONES, SECCIONES_PUBLICO, rutaDisponible, seccionesVisibles } from './navegacion.js'

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

test('el sitio público abre en Inicio y nunca muestra secciones de Analista ni de Administrador', () => {
  const todas = () => true
  // Calidad de datos y Verificación del jurado solo están en el sitio interno.
  assert.deepEqual(rutas(todas, { interno: false }), ['/', '/rankings', '/reportes'])
  assert.equal(seccionesVisibles(todas, { interno: false })[0].nombre, 'Inicio')
  assert.equal(SECCIONES_PUBLICO[0].guia, 'global.menu-panel')
  assert.ok(SECCIONES_PUBLICO.every((s) => !s.opcion && s.guia?.startsWith('global.menu-')))
})

test('rutaDisponible: Calidad y Verificación no existen en el sitio público, sí en el interno', () => {
  assert.equal(rutaDisponible('/calidad', { interno: false }), false)
  assert.equal(rutaDisponible('/calidad?periodo=20260930', { interno: false }), false)
  assert.equal(rutaDisponible('/verificacion', { interno: false }), false)
  assert.equal(rutaDisponible('/rankings', { interno: false }), true)
  assert.equal(rutaDisponible('/calidad', { interno: true }), true)
  assert.equal(rutaDisponible('/verificacion', { interno: true }), true)
})
