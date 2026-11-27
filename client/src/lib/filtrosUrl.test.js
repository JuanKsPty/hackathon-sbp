import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidirPeriodo, escribirFiltros, leerFiltros } from './filtrosUrl.js'

// Catálogo de prueba con la forma de GET /api/catalogos y GET /api/periodos (sin cifras).
const CATALOGO = {
  periodos: ['20260731', '20260831', '20260930'],
  rankings: [
    { Ranking: 'HIPOTECARIO', Subactividades: ['Vivienda propia', 'Local comercial'] },
    { Ranking: 'CONSUMO', Subactividades: ['Credito personal', 'Automovil', 'Tarjeta'] },
  ],
  bancos: [{ Codigo_Banco: '101' }, { Codigo_Banco: '108' }],
}

const leer = (query) => leerFiltros(new URLSearchParams(query), CATALOGO)

test('lee los cuatro filtros válidos de la URL', () => {
  assert.deepEqual(leer('periodo=20260831&ranking=CONSUMO&banco=108&subactividad=Tarjeta'), {
    periodo: '20260831',
    ranking: 'CONSUMO',
    banco: '108',
    subactividad: 'Tarjeta',
  })
})

test('sin parámetros, todos los filtros quedan en su valor por defecto', () => {
  assert.deepEqual(leer(''), { periodo: null, ranking: null, banco: null, subactividad: null })
})

test('ignora valores que no existen en el catálogo', () => {
  assert.deepEqual(leer('periodo=20261031&ranking=VIVIENDA&banco=999&subactividad=Tarjeta'), {
    periodo: null,
    ranking: null,
    banco: null,
    subactividad: null,
  })
})

test('el ranking acepta minúsculas y la subactividad debe ser de ese ranking', () => {
  assert.deepEqual(leer('ranking=consumo&subactividad=Tarjeta').ranking, 'CONSUMO')
  assert.equal(leer('ranking=HIPOTECARIO&subactividad=Tarjeta').subactividad, null)
  assert.equal(leer('ranking=HIPOTECARIO&subactividad=Vivienda%20propia').subactividad, 'Vivienda propia')
})

test('sin ranking en la URL, la subactividad se valida contra el ranking por defecto (el primero)', () => {
  assert.equal(leer('subactividad=Local%20comercial').subactividad, 'Local comercial')
  assert.equal(leer('subactividad=Tarjeta').subactividad, null)
})

test('decidirPeriodo: un enlace abierto cambia el encabezado a su período', () => {
  assert.deepEqual(decidirPeriodo({ periodoUrl: '20260731', periodoGlobal: '20260930', periodoGlobalAnterior: null }), {
    tipo: 'encabezado',
    periodo: '20260731',
  })
})

test('decidirPeriodo: si el usuario elige otro período en el encabezado, la URL lo sigue', () => {
  assert.deepEqual(decidirPeriodo({ periodoUrl: '20260731', periodoGlobal: '20260831', periodoGlobalAnterior: '20260731' }), {
    tipo: 'url',
    periodo: '20260831',
  })
})

test('decidirPeriodo: si la URL cambia con la página abierta (atrás, un Link o el agente), manda la URL', () => {
  assert.deepEqual(decidirPeriodo({ periodoUrl: '20260930', periodoGlobal: '20260831', periodoGlobalAnterior: '20260831' }), {
    tipo: 'encabezado',
    periodo: '20260930',
  })
})

test('decidirPeriodo: sin período válido en la URL se escribe el del encabezado', () => {
  assert.deepEqual(decidirPeriodo({ periodoUrl: null, periodoGlobal: '20260930', periodoGlobalAnterior: null }), {
    tipo: 'url',
    periodo: '20260930',
  })
})

test('decidirPeriodo: ya sincronizados o sin períodos cargados, no hace nada', () => {
  assert.equal(decidirPeriodo({ periodoUrl: '20260831', periodoGlobal: '20260831', periodoGlobalAnterior: '20260831' }), null)
  // Justo después de que el encabezado siguió a un enlace.
  assert.equal(decidirPeriodo({ periodoUrl: '20260731', periodoGlobal: '20260731', periodoGlobalAnterior: '20260930' }), null)
  assert.equal(decidirPeriodo({ periodoUrl: '20260731', periodoGlobal: null, periodoGlobalAnterior: null }), null)
})

test('los códigos de banco se comparan como texto (con sus ceros)', () => {
  assert.equal(leer('banco=101').banco, '101')
  assert.equal(leer('banco=0101').banco, null)
})

test('escribirFiltros omite los vacíos y lo que escribe se vuelve a leer igual', () => {
  const filtros = { periodo: '20260930', ranking: 'HIPOTECARIO', banco: null, subactividad: 'Vivienda propia' }
  const query = escribirFiltros(filtros)
  assert.equal(query.has('banco'), false)
  assert.deepEqual(leerFiltros(query, CATALOGO), filtros)
})
