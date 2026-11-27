import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escribirVista, leerVista } from './vista.js'

// Forma de las respuestas de /api/periodos y /api/catalogos (contracts/), con valores de ejemplo.
const DISPONIBLES = {
  periodos: [{ Fecha: '20260731' }, { Fecha: '20260831' }],
  rankings: [
    { Ranking: 'HIPOTECARIO', Subactividades: ['Vivienda propia', 'Local comercial'] },
    { Ranking: 'CONSUMO', Subactividades: ['Credito personal', 'Automovil', 'Tarjeta'] },
  ],
  bancos: [{ Codigo_Banco: '101' }, { Codigo_Banco: '106' }],
}

const leer = (query) => leerVista(new URLSearchParams(query), DISPONIBLES)

test('una URL válida devuelve la misma vista', () => {
  assert.deepEqual(leer('periodo=20260831&ranking=CONSUMO&banco=106&subactividad=Tarjeta'), {
    periodo: '20260831',
    ranking: 'CONSUMO',
    banco: '106',
    subactividad: 'Tarjeta',
  })
})

test('los valores inválidos se ignoran', () => {
  assert.deepEqual(leer('periodo=2026-08&ranking=VIVIENDA&banco=999&subactividad=Tarjeta'), {
    periodo: null,
    ranking: null,
    banco: null,
    subactividad: null, // Tarjeta no es de HIPOTECARIO, el ranking por defecto
  })
  assert.deepEqual(leer(''), { periodo: null, ranking: null, banco: null, subactividad: null })
})

test('la subactividad tiene que ser del ranking de la vista', () => {
  assert.equal(leer('ranking=HIPOTECARIO&subactividad=Tarjeta').subactividad, null)
  assert.equal(leer('ranking=CONSUMO&subactividad=Credito personal').subactividad, 'Credito personal')
  assert.equal(leer('subactividad=Local comercial').subactividad, 'Local comercial') // ranking por defecto
})

test('escribirVista omite los filtros vacíos y se puede volver a leer', () => {
  const vista = { periodo: '20260731', ranking: 'CONSUMO', banco: null, subactividad: 'Credito personal' }
  const parametros = escribirVista(vista)
  assert.equal(parametros.has('banco'), false)
  assert.equal(parametros.toString(), 'periodo=20260731&ranking=CONSUMO&subactividad=Credito+personal')
  assert.deepEqual(leerVista(new URLSearchParams(parametros.toString()), DISPONIBLES), vista)
})
