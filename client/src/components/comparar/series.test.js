// Series del gráfico de posiciones y comparación de 2 bancos (#61). Corre con: npm test (en client/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armarComparacionBancos, armarSerieDePosiciones, elegirParDeBancos, tendenciaDePosiciones } from './series.js'

const banco = (Codigo_Banco, Banco, Posicion, Saldo_Actividad = 100, Ponderacion_Pct = 10) => ({
  Posicion,
  Codigo_Banco,
  Banco,
  Saldo_Actividad,
  Total_Cartera_Local_Valida: 1000,
  Ponderacion_Pct,
  Operaciones_Validas: 5,
})

const respuesta = (periodo, rankings) => ({ periodo, rankings })

test('armarSerieDePosiciones: un punto por período, ordenado, con la posición de cada banco', () => {
  const respuestas = [
    respuesta('20260930', [{ Ranking: 'CONSUMO', bancos: [banco('102', 'Banco B', 1), banco('101', 'Banco A', 2)] }]),
    respuesta('20260731', [{ Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 1), banco('102', 'Banco B', 2)] }]),
  ]
  const { puntos, bancos, maxPosicion } = armarSerieDePosiciones(respuestas, 'CONSUMO')
  assert.deepEqual(puntos, [
    { periodo: '20260731', 101: 1, 102: 2 },
    { periodo: '20260930', 101: 2, 102: 1 },
  ])
  assert.deepEqual(bancos.map((b) => [b.codigo, b.nombre, b.posicionFinal]), [
    ['102', 'Banco B', 1],
    ['101', 'Banco A', 2],
  ])
  assert.equal(maxPosicion, 2)
})

test('armarSerieDePosiciones: toma solo el ranking pedido', () => {
  const respuestas = [
    respuesta('20260731', [
      { Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 4)] },
      { Ranking: 'COMERCIO', bancos: [banco('101', 'Banco A', 9)] },
    ]),
  ]
  const { puntos, maxPosicion } = armarSerieDePosiciones(respuestas, 'COMERCIO')
  assert.deepEqual(puntos, [{ periodo: '20260731', 101: 9 }])
  assert.equal(maxPosicion, 9)
})

test('armarSerieDePosiciones: un banco ausente del último período va al final de la lista', () => {
  const respuestas = [
    respuesta('20260731', [{ Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 1), banco('103', 'Banco Z', 2), banco('102', 'Banco B', 3)] }]),
    respuesta('20260831', [{ Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 1), banco('102', 'Banco B', 2)] }]),
  ]
  const { puntos, bancos } = armarSerieDePosiciones(respuestas, 'CONSUMO')
  assert.equal(puntos[1][103], undefined)
  assert.deepEqual(bancos.map((b) => b.codigo), ['101', '102', '103'])
  assert.equal(bancos.at(-1).posicionFinal, null)
})

test('armarSerieDePosiciones: sin respuestas o sin el ranking devuelve una serie vacía', () => {
  assert.deepEqual(armarSerieDePosiciones([], 'CONSUMO'), { puntos: [], bancos: [], maxPosicion: 0 })
  assert.deepEqual(armarSerieDePosiciones(undefined, 'CONSUMO'), { puntos: [], bancos: [], maxPosicion: 0 })
  const { puntos, bancos } = armarSerieDePosiciones([respuesta('20260731', [])], 'CONSUMO')
  assert.deepEqual(puntos, [{ periodo: '20260731' }])
  assert.deepEqual(bancos, [])
})

test('tendenciaDePosiciones: el número menor es mejor posición', () => {
  assert.equal(tendenciaDePosiciones(5, 3), 'sube')
  assert.equal(tendenciaDePosiciones(3, 5), 'baja')
  assert.equal(tendenciaDePosiciones(4, 4), 'igual')
  assert.equal(tendenciaDePosiciones(null, 4), 'sin_dato')
  assert.equal(tendenciaDePosiciones(4, undefined), 'sin_dato')
})

test('armarComparacionBancos: una fila por ranking con los dos bancos en cada período', () => {
  const desde = respuesta('20260731', [
    { Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 3, 300, 30), banco('102', 'Banco B', 1, 500, 50)] },
    { Ranking: 'COMERCIO', bancos: [banco('101', 'Banco A', 2), banco('102', 'Banco B', 4)] },
  ])
  const hasta = respuesta('20260930', [
    { Ranking: 'CONSUMO', bancos: [banco('101', 'Banco A', 1, 700, 70), banco('102', 'Banco B', 2, 600, 60)] },
    { Ranking: 'COMERCIO', bancos: [banco('101', 'Banco A', 2), banco('103', 'Banco C', 1)] },
  ])
  const filas = armarComparacionBancos(desde, hasta, ['101', '102'])
  assert.deepEqual(filas.map((f) => f.Ranking), ['CONSUMO', 'COMERCIO'])

  const [consumoA, consumoB] = filas[0].bancos
  assert.deepEqual(consumoA.desde, { Posicion: 3, Saldo_Actividad: 300, Ponderacion_Pct: 30 })
  assert.deepEqual(consumoA.hasta, { Posicion: 1, Saldo_Actividad: 700, Ponderacion_Pct: 70 })
  assert.equal(consumoA.tendencia, 'sube')
  assert.equal(consumoB.tendencia, 'baja')

  const comercioB = filas[1].bancos[1]
  assert.notEqual(comercioB.desde, null)
  assert.equal(comercioB.hasta, null)
  assert.equal(comercioB.tendencia, 'sin_dato')
})

test('armarComparacionBancos: sin respuestas no hay filas', () => {
  assert.deepEqual(armarComparacionBancos(null, null, ['101', '102']), [])
})

test('elegirParDeBancos: sin elección usa los candidatos, sin repetir banco', () => {
  const validos = ['101', '102', '103']
  assert.deepEqual(elegirParDeBancos({ candidatos: ['103', '101'], validos }), { a: '103', b: '101' })
  assert.deepEqual(elegirParDeBancos({ candidatos: ['103', '103', '101'], validos }), { a: '103', b: '101' })
})

test('elegirParDeBancos: respeta lo elegido y completa lo que falta', () => {
  const validos = ['101', '102', '103']
  // el usuario elige B igual al primer candidato: A toma el siguiente
  assert.deepEqual(elegirParDeBancos({ elegidoB: '103', candidatos: ['103', '101'], validos }), { a: '101', b: '103' })
  assert.deepEqual(elegirParDeBancos({ elegidoA: '102', candidatos: ['102', '101'], validos }), { a: '102', b: '101' })
  assert.deepEqual(elegirParDeBancos({ elegidoA: '101', elegidoB: '102', candidatos: ['103'], validos }), { a: '101', b: '102' })
})

test('elegirParDeBancos: ignora bancos que ya no están en el catálogo y tolera listas cortas', () => {
  assert.deepEqual(elegirParDeBancos({ elegidoA: '999', candidatos: ['101', '102'], validos: ['101', '102'] }), { a: '101', b: '102' })
  assert.deepEqual(elegirParDeBancos({ candidatos: ['101'], validos: ['101'] }), { a: '101', b: null })
  assert.deepEqual(elegirParDeBancos({}), { a: null, b: null })
})
