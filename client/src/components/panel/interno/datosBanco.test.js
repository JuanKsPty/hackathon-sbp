import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cambiosDeLider,
  composicionPorCorte,
  cortesDeBanco,
  cortesDelBanco,
  cortesDelSistema,
  datosDescomposicion,
  movimientosSignificativos,
  rankingsLiderados,
  respuestaDe,
  riesgoDelBanco,
  serieDelBanco,
} from './datosBanco.js'

// Respuestas de prueba con la forma del API. Valores ilustrativos, no del motor.
const PERIODOS = [{ Fecha: '20260930' }, { Fecha: '20260731' }, { Fecha: '20260831' }]

const productos = (periodo, banco) => ({ periodo, banco })
const detalle = (cartera, operaciones, rankings) => ({
  Codigo_Banco: '103',
  Banco: 'Banco Capital',
  Total_Cartera_Local_Valida: cartera,
  Operaciones_Validas: operaciones,
  rankings,
})
const PRODUCTOS = [
  productos('20260930', detalle(30, 3, [{ Ranking: 'CONSUMO', Posicion: 1, Saldo_Actividad: 20 }, { Ranking: 'HIPOTECARIO', Posicion: 4, Saldo_Actividad: 10 }])),
  productos('todos', detalle(99, 9, [])),
  productos('20260831', detalle(20, 2, [{ Ranking: 'CONSUMO', Posicion: 2, Saldo_Actividad: 15 }, { Ranking: 'HIPOTECARIO', Posicion: 3, Saldo_Actividad: 5 }])),
]

test('los cortes del banco son los cargados hasta el elegido, más el acumulado si se eligió', () => {
  assert.deepEqual(cortesDelBanco(PERIODOS, '20260831'), ['20260731', '20260831'])
  assert.deepEqual(cortesDelBanco(PERIODOS, 'todos'), ['20260731', '20260831', '20260930', 'todos'])
  assert.deepEqual(cortesDelBanco(PERIODOS, null), [])
})

test('respuestaDe busca la respuesta del corte o del acumulado', () => {
  assert.equal(respuestaDe(PRODUCTOS, 'todos').banco.Total_Cartera_Local_Valida, 99)
  assert.equal(respuestaDe(PRODUCTOS, '20260731'), null)
  assert.equal(respuestaDe(null, '20260930'), null)
})

test('la serie del banco va por corte real, ordenada y sin el acumulado', () => {
  assert.deepEqual(serieDelBanco(PRODUCTOS), [
    { Fecha: '20260831', Total_Cartera_Local_Valida: 20, Operaciones_Validas: 2 },
    { Fecha: '20260930', Total_Cartera_Local_Valida: 30, Operaciones_Validas: 3 },
  ])
  // Si el API aún no manda el bloque `banco`, los valores quedan en null (no se inventan).
  assert.deepEqual(serieDelBanco([{ periodo: '20260930' }]), [{ Fecha: '20260930', Total_Cartera_Local_Valida: null, Operaciones_Validas: null }])
})

test('la composición del banco usa Saldo_Actividad de cada ranking en cada corte', () => {
  assert.deepEqual(composicionPorCorte(cortesDeBanco(PRODUCTOS)), [
    { ranking: 'CONSUMO', c20260831: 15, c20260930: 20 },
    { ranking: 'HIPOTECARIO', c20260831: 5, c20260930: 10 },
  ])
})

test('la composición del sistema usa Total_Ranking y el orden del último corte', () => {
  const indicadores = [
    { periodo: '20260831', concentracion: [{ Ranking: 'CONSUMO', Total_Ranking: 100 }] },
    { periodo: '20260930', concentracion: [{ Ranking: 'HIPOTECARIO', Total_Ranking: 70 }, { Ranking: 'CONSUMO', Total_Ranking: 120 }] },
  ]
  assert.deepEqual(composicionPorCorte(cortesDelSistema(indicadores)), [
    { ranking: 'HIPOTECARIO', c20260831: null, c20260930: 70 },
    { ranking: 'CONSUMO', c20260831: 100, c20260930: 120 },
  ])
  assert.deepEqual(composicionPorCorte(cortesDelSistema(null)), [])
})

test('rankingsLiderados lista los rankings donde el banco va primero', () => {
  assert.deepEqual(rankingsLiderados(PRODUCTOS[0].banco), ['CONSUMO'])
  assert.deepEqual(rankingsLiderados(null), [])
})

const MOVIMIENTOS = {
  rankings: [
    {
      Ranking: 'CONSUMO',
      Cambio_Lider: true,
      Lider_anterior: { Codigo_Banco: '101' },
      Lider_actual: { Codigo_Banco: '103' },
      movimientos: [
        { Codigo_Banco: '103', Cambio_Posicion: 1, Var_Saldo_Pct: 5, Significativo: true },
        { Codigo_Banco: '101', Cambio_Posicion: -1, Var_Saldo_Pct: -2, Significativo: true },
        { Codigo_Banco: '105', Cambio_Posicion: 0, Var_Saldo_Pct: 0, Significativo: false },
      ],
    },
    {
      Ranking: 'HIPOTECARIO',
      Cambio_Lider: true,
      Lider_anterior: { Codigo_Banco: '104' },
      Lider_actual: { Codigo_Banco: '107' },
      movimientos: [{ Codigo_Banco: '107', Cambio_Posicion: 3, Var_Saldo_Pct: 1, Significativo: true }],
    },
  ],
}

test('movimientosSignificativos ordena por cambio de posición y filtra por banco', () => {
  const todos = movimientosSignificativos(MOVIMIENTOS)
  assert.deepEqual(
    todos.map((m) => `${m.Ranking}-${m.Codigo_Banco}`),
    ['HIPOTECARIO-107', 'CONSUMO-103', 'CONSUMO-101'],
  )
  assert.deepEqual(
    movimientosSignificativos(MOVIMIENTOS, '103').map((m) => `${m.Ranking}-${m.Codigo_Banco}`),
    ['CONSUMO-103'],
  )
  assert.deepEqual(movimientosSignificativos(MOVIMIENTOS, '112'), [])
  assert.deepEqual(movimientosSignificativos(null, '103'), [])
})

test('cambiosDeLider con banco deja solo los rankings donde ganó o perdió el primer lugar', () => {
  assert.equal(cambiosDeLider(MOVIMIENTOS).length, 2)
  assert.deepEqual(cambiosDeLider(MOVIMIENTOS, '101').map((r) => r.Ranking), ['CONSUMO'])
  assert.deepEqual(cambiosDeLider(MOVIMIENTOS, '112'), [])
})

const pieza = (saldo, operaciones) => ({ Saldo: saldo, Operaciones: operaciones })
const fila = (ranking, codigo, banco, var_saldo) => ({
  Ranking: ranking,
  Codigo_Banco: codigo,
  Banco: banco,
  Var_Saldo: var_saldo,
  Nuevos: pieza(var_saldo, 1),
  Salen: pieza(0, 0),
  Amortizacion: pieza(0, 2),
})
const DESCOMPOSICION = [
  fila('CONSUMO', '101', 'Banco Istmo', 5),
  fila('CONSUMO', '103', 'Banco Capital', 9),
  fila('HIPOTECARIO', '101', 'Banco Istmo', -3),
  fila('HIPOTECARIO', '103', 'Banco Capital', 4),
]

test('sin banco, la descomposición son los bancos del ranking de mayor a menor variación', () => {
  const datos = datosDescomposicion(DESCOMPOSICION, { ranking: 'CONSUMO' })
  assert.deepEqual(datos.map((d) => d.etiqueta), ['Banco Capital', 'Banco Istmo'])
  assert.deepEqual(datos[0], {
    etiqueta: 'Banco Capital',
    Nuevos: 9,
    Salen: 0,
    Amortizacion: 0,
    Var_Saldo: 9,
    operaciones: { Nuevos: 1, Salen: 0, Amortizacion: 2 },
  })
})

test('con banco, la descomposición es ese banco en cada ranking, en el orden del API', () => {
  const datos = datosDescomposicion(DESCOMPOSICION, { ranking: 'CONSUMO', banco: '103' })
  assert.deepEqual(datos.map((d) => [d.etiqueta, d.Var_Saldo]), [['CONSUMO', 9], ['HIPOTECARIO', 4]])
  assert.deepEqual(datosDescomposicion(DESCOMPOSICION, { banco: '112' }), [])
})

test('riesgoDelBanco toma la morosidad y los vencimientos del banco', () => {
  const indicadores = {
    morosidad: { bancos: [{ Codigo_Banco: '103', Pct_Saldo_En_Mora: 2.5 }] },
    vencimientos: { bancos: [{ Codigo_Banco: '103', Monto_Por_Vencer: 80 }] },
  }
  assert.deepEqual(riesgoDelBanco(indicadores, '103'), {
    mora: { Codigo_Banco: '103', Pct_Saldo_En_Mora: 2.5 },
    vencimientos: { Codigo_Banco: '103', Monto_Por_Vencer: 80 },
  })
  assert.equal(riesgoDelBanco(indicadores, '112'), null)
  assert.equal(riesgoDelBanco(indicadores, null), null)
})
