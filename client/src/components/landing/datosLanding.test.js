import assert from 'node:assert/strict'
import { test } from 'node:test'
import { composicionCartera, contarBancos, lideresDelCorte, saldoPorSubactividad } from './datosLanding.js'

const banco = (Codigo_Banco, Posicion, Saldo_Actividad) => ({
  Codigo_Banco,
  Banco: `Banco ${Codigo_Banco}`,
  Posicion,
  Saldo_Actividad,
  Ponderacion_Pct: 1,
  Operaciones_Validas: Saldo_Actividad > 0 ? 1 : 0,
})

const septiembre = [
  { Ranking: 'HIPOTECARIO', bancos: [banco('101', 2, 1350000), banco('104', 1, 1400000), banco('102', 3, 1290000), banco('112', 4, 0)] },
  { Ranking: 'CONSUMO', bancos: [banco('101', 1, 505), banco('102', 2, 401)] },
]

test('lideresDelCorte toma la posición 1 de cada ranking', () => {
  const [hipotecario, consumo] = lideresDelCorte(septiembre)
  assert.equal(hipotecario.ranking, 'HIPOTECARIO')
  assert.equal(hipotecario.lider.Codigo_Banco, '104')
  assert.equal(consumo.lider.Codigo_Banco, '101')
  assert.deepEqual(lideresDelCorte(undefined), [])
})

test('contarBancos cuenta cada banco una vez', () => {
  assert.equal(contarBancos(septiembre), 4)
  assert.equal(contarBancos(undefined), 0)
})

test('composicionCartera ordena las macroactividades por saldo y da su participación', () => {
  const filas = composicionCartera([
    { Ranking: 'CONSUMO', Total_Ranking: 25 },
    { Ranking: 'HIPOTECARIO', Total_Ranking: 75 },
  ])
  assert.deepEqual(filas, [
    { ranking: 'HIPOTECARIO', saldo: 75, pct: 75 },
    { ranking: 'CONSUMO', saldo: 25, pct: 25 },
  ])
  assert.deepEqual(composicionCartera(undefined), [])
})

test('saldoPorSubactividad suma los bancos de cada subactividad', () => {
  const filas = saldoPorSubactividad([
    { Subactividad: 'Tarjeta', Saldo: 200.1 },
    { Subactividad: 'Automovil', Saldo: 300 },
    { Subactividad: 'Tarjeta', Saldo: 200.2 },
  ])
  assert.deepEqual(filas, [
    { subactividad: 'Tarjeta', saldo: 400.3 },
    { subactividad: 'Automovil', saldo: 300 },
  ])
})

