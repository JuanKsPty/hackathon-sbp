import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  compararRankings,
  contarBancos,
  contarSignificativos,
  lideresDelCorte,
  movimientosPrincipales,
  urlSitioInterno,
  variacionPct,
} from './datosLanding.js'

const banco = (Codigo_Banco, Posicion, Saldo_Actividad, extra = {}) => ({
  Codigo_Banco,
  Banco: `Banco ${Codigo_Banco}`,
  Posicion,
  Saldo_Actividad,
  Ponderacion_Pct: 1,
  Operaciones_Validas: Saldo_Actividad > 0 ? 1 : 0,
  ...extra,
})

// Agosto: 101 lidera HIPOTECARIO. Septiembre: 104 sube del 3.º al 1.º y crece 12 %.
const agosto = [
  { Ranking: 'HIPOTECARIO', bancos: [banco('101', 1, 1380000), banco('102', 2, 1300000), banco('104', 3, 1250000), banco('112', 4, 0)] },
  { Ranking: 'CONSUMO', bancos: [banco('101', 1, 500), banco('102', 2, 400)] },
]
const septiembre = [
  { Ranking: 'HIPOTECARIO', bancos: [banco('104', 1, 1400000), banco('101', 2, 1350000), banco('102', 3, 1290000), banco('112', 4, 0)] },
  { Ranking: 'CONSUMO', bancos: [banco('101', 1, 505), banco('102', 2, 401)] },
]
const regla = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 }

test('variacionPct: 4 decimales, half-up y null sin base, como el server', () => {
  assert.equal(variacionPct(1400000, 1250000), 12)
  assert.equal(variacionPct(1350000, 1380000), -2.1739)
  assert.equal(variacionPct(10, 0), null)
  assert.equal(variacionPct(5, 5), 0)
})

test('compararRankings marca los significativos con los motivos de la regla', () => {
  const [hipotecario, consumo] = compararRankings(septiembre, agosto, regla)
  assert.equal(hipotecario.Cambio_Lider, true)
  assert.deepEqual(hipotecario.Lider_anterior, { Codigo_Banco: '101', Banco: 'Banco 101' })
  const pacifico = hipotecario.movimientos.find((m) => m.Codigo_Banco === '104')
  assert.deepEqual(pacifico.Motivos, ['cambio_posicion', 'cambio_lider', 'var_saldo_pct'])
  assert.equal(pacifico.Cambio_Posicion, 2)
  assert.equal(pacifico.Var_Saldo, 150000)
  const istmo = hipotecario.movimientos.find((m) => m.Codigo_Banco === '101')
  assert.deepEqual(istmo.Motivos, ['cambio_lider'])
  // Sin cambio de posición ni saldo: no es significativo (y 0 % no cuenta).
  assert.equal(hipotecario.movimientos.find((m) => m.Codigo_Banco === '112').Significativo, false)
  assert.equal(consumo.Cambio_Lider, false)
  assert.equal(contarSignificativos([hipotecario, consumo]), 2)
})

test('movimientosPrincipales pone primero los cambios de líder y respeta el límite', () => {
  const principales = movimientosPrincipales(compararRankings(septiembre, agosto, regla), 1)
  assert.equal(principales.length, 1)
  assert.equal(principales[0].Codigo_Banco, '104')
  assert.equal(principales[0].Ranking, 'HIPOTECARIO')
})

test('lideresDelCorte dice de qué posición viene cada líder y quién lideraba antes', () => {
  const [hipotecario, consumo] = lideresDelCorte(septiembre, agosto)
  assert.equal(hipotecario.lider.Codigo_Banco, '104')
  assert.deepEqual(hipotecario.antes, { posicionAnterior: 3, liderAnterior: 'Banco 101' })
  assert.deepEqual(consumo.antes, { posicionAnterior: 1, liderAnterior: null })
  // Primer período cargado: no hay con qué comparar.
  assert.equal(lideresDelCorte(septiembre, null)[0].antes, null)
})

test('contarBancos cuenta cada banco una vez', () => {
  assert.equal(contarBancos(septiembre), 4)
  assert.equal(contarBancos(undefined), 0)
})

test('urlSitioInterno: subdominio en producción y puerto vecino en local', () => {
  assert.equal(urlSitioInterno({ protocol: 'https:', hostname: 'sbp.juank.tech', port: '' }), 'https://interno.sbp.juank.tech/')
  assert.equal(urlSitioInterno({ protocol: 'http:', hostname: 'localhost', port: '5173' }), 'http://localhost:5174/')
  assert.equal(urlSitioInterno({ protocol: 'http:', hostname: 'localhost', port: '8080' }), 'http://localhost:8081/')
  assert.equal(urlSitioInterno({ protocol: 'http:', hostname: 'localhost', port: '4173' }), 'http://localhost:4174/')
  assert.equal(urlSitioInterno({ hostname: 'sbp.juank.tech' }, 'https://otro.example/'), 'https://otro.example/')
})
