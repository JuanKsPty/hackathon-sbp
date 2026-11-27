// Ejecutor de acciones (#122). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearRegistro } from './registro.js'
import { ejecutarAcciones, deshacerAcciones } from './ejecutor.js'

// Página simulada: la ruta cambia al navegar y los controles de /rankings se registran al "montarse".
function escenario() {
  const registro = crearRegistro()
  let ruta = '/'
  const log = []
  const tabla = { orden: { columna: 'Posicion', orden: 'asc' }, resaltada: null }
  let ranking = 'HIPOTECARIO'
  const montarRankings = () => {
    registro.registrar('rankings.selector-ranking', {
      elegir: (v) => { ranking = v; log.push(`ranking=${v}`) },
      estado: () => ranking,
      restaurar: (v) => { ranking = v; log.push(`restaura ranking=${v}`) },
    })
    registro.registrar('rankings.tabla', {
      ordenar: (columna, orden) => { tabla.orden = { columna, orden }; log.push(`ordena ${columna} ${orden}`) },
      resaltar: (fila) => { tabla.resaltada = fila; log.push(`resalta ${fila}`) },
      estado: () => ({ ...tabla }),
      restaurar: (e) => { Object.assign(tabla, e); log.push('restaura tabla') },
    })
  }
  const navegar = (r) => {
    ruta = r
    log.push(`navega ${r}`)
    if (r === '/rankings') setTimeout(montarRankings, 5)
  }
  return { registro, navegar, rutaActual: () => ruta, log, tabla, ranking: () => ranking }
}

const ACCIONES = [
  { tipo: 'ir', ruta: '/rankings' },
  { tipo: 'elegir', control: 'rankings.selector-ranking', ruta: '/rankings', valor: 'COMERCIO' },
  { tipo: 'ordenar', control: 'rankings.tabla', ruta: '/rankings', columna: 'Operaciones_Validas', orden: 'desc' },
  { tipo: 'resaltar', control: 'rankings.tabla', ruta: '/rankings', fila: '104' },
]

test('aplica las acciones en orden, esperando a que la página registre sus controles', async () => {
  const e = escenario()
  const r = await ejecutarAcciones(ACCIONES, e)
  assert.deepEqual(e.log, ['navega /rankings', 'ranking=COMERCIO', 'ordena Operaciones_Validas desc', 'resalta 104'])
  assert.equal(r.aplicadas.length, 4)
  assert.deepEqual(r.fallidas, [])
  assert.equal(r.deshacer.rutaInicial, '/')
  assert.deepEqual(r.deshacer.estados.map((s) => s.control), ['rankings.selector-ranking', 'rankings.tabla'])
})

test('deshacer restaura cada control y vuelve a la página inicial', async () => {
  const e = escenario()
  const { deshacer } = await ejecutarAcciones(ACCIONES, e)
  e.log.length = 0
  deshacerAcciones(deshacer, e)
  assert.equal(e.ranking(), 'HIPOTECARIO')
  assert.deepEqual(e.tabla.orden, { columna: 'Posicion', orden: 'asc' })
  assert.equal(e.tabla.resaltada, null)
  assert.deepEqual(e.log, ['restaura tabla', 'restaura ranking=HIPOTECARIO', 'navega /'])
})

test('un control que no aparece queda en fallidas y sigue con el resto', async () => {
  const e = escenario()
  const r = await ejecutarAcciones(
    [...ACCIONES.slice(0, 2), { tipo: 'elegir', control: 'rankings.filtro-banco', ruta: '/rankings', valor: '104' }, ACCIONES[3]],
    { ...e, timeout: 30 },
  )
  assert.deepEqual(r.fallidas.map((f) => [f.accion.control, f.motivo]), [['rankings.filtro-banco', 'no-encontrado']])
  assert.equal(e.tabla.resaltada, '104')
})

test('antesDe se espera antes de cada acción (para animar el cursor) y se puede cancelar', async () => {
  const e = escenario()
  const vistos = []
  const control = new AbortController()
  const r = await ejecutarAcciones(ACCIONES, {
    ...e,
    signal: control.signal,
    antesDe: async (accion) => {
      vistos.push(accion.tipo)
      if (accion.tipo === 'ordenar') control.abort()
    },
  })
  assert.deepEqual(vistos, ['ir', 'elegir', 'ordenar'])
  assert.equal(e.tabla.orden.columna, 'Posicion') // cancelado antes de ordenar
  assert.equal(r.aplicadas.length, 2)
})

test('antesDe se llama antes de navegar (el cursor toca el menú), también si la navegación es implícita', async () => {
  const e = escenario()
  const orden = []
  await ejecutarAcciones(ACCIONES.slice(1, 2), {
    ...e,
    antesDe: async (accion) => {
      orden.push(`${accion.tipo}:${e.rutaActual()}`)
    },
  })
  // La acción "elegir" es de /rankings: primero un "ir" implícito (todavía en /), después elegir (ya en /rankings).
  assert.deepEqual(orden, ['ir:/', 'elegir:/rankings'])
})

test('no navega dos veces si el router todavía no informó la ruta nueva', async () => {
  const e = escenario()
  // Router "lento": la ruta que informa no cambia durante la ejecución.
  const navegaciones = []
  await ejecutarAcciones(ACCIONES, {
    ...e,
    rutaActual: () => '/',
    navegar: (r) => { navegaciones.push(r); e.navegar(r) },
  })
  assert.deepEqual(navegaciones, ['/rankings'])
})

test('elegir un valor que ya está elegido se salta (sin antesDe ni handler)', async () => {
  const registro = crearRegistro()
  const llamadas = []
  registro.registrar('global.selector-periodo', { actual: () => '20260930', elegir: (v) => llamadas.push(`elegir ${v}`) })
  const vistos = []
  await ejecutarAcciones(
    [{ tipo: 'elegir', control: 'global.selector-periodo', ruta: null, valor: '20260930' }, { tipo: 'elegir', control: 'global.selector-periodo', ruta: null, valor: '20260831' }],
    { registro, navegar: () => {}, rutaActual: () => '/', antesDe: async (a) => vistos.push(a.valor) },
  )
  assert.deepEqual(vistos, ['20260831'])
  assert.deepEqual(llamadas, ['elegir 20260831'])
})

test('ordenar por el orden que ya tiene se salta', async () => {
  const registro = crearRegistro()
  const llamadas = []
  registro.registrar('rankings.tabla', {
    ordenActual: () => ({ columna: 'Posicion', orden: 'asc' }),
    ordenar: (c, o) => llamadas.push(`${c} ${o}`),
  })
  await ejecutarAcciones(
    [
      { tipo: 'ordenar', control: 'rankings.tabla', ruta: null, columna: 'Posicion', orden: 'asc' },
      { tipo: 'ordenar', control: 'rankings.tabla', ruta: null, columna: 'Ponderacion_Pct', orden: 'desc' },
    ],
    { registro, navegar: () => {}, rutaActual: () => '/' },
  )
  assert.deepEqual(llamadas, ['Ponderacion_Pct desc'])
})

test('señalar no necesita un control registrado: lleva el cursor y no falla', async () => {
  const e = escenario()
  const vistos = []
  const r = await ejecutarAcciones(
    [{ tipo: 'ir', ruta: '/admin', texto: 'Entra a Administración.' }, { tipo: 'señalar', control: 'admin.subir-archivo', ruta: '/admin', texto: 'Aquí.' }],
    { ...e, timeout: 30, antesDe: async (accion) => vistos.push(`${accion.tipo}:${accion.control ?? accion.ruta}`) },
  )
  assert.deepEqual(r.fallidas, [])
  assert.deepEqual(r.aplicadas.map((a) => a.tipo), ['ir', 'señalar'])
  assert.deepEqual(vistos, ['ir:/admin', 'señalar:admin.subir-archivo'])
})

test('señalar un elemento que nunca aparece queda en fallidas', async () => {
  const e = escenario()
  const r = await ejecutarAcciones(
    [{ tipo: 'señalar', control: 'admin.subir-archivo', ruta: '/', texto: 'Aquí.' }],
    { ...e, timeout: 30, antesDe: async () => false },
  )
  assert.deepEqual(r.aplicadas, [])
  assert.deepEqual(r.fallidas.map((f) => [f.accion.control, f.motivo]), [['admin.subir-archivo', 'no-encontrado']])
})
