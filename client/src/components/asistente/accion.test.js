// Gráficos del chat (#108): elegir la acción y acomodar los datos de la API sin calcular cifras.
// Los valores de estas pruebas son de ejemplo (EJ-*): solo importa que pasen tal cual del API al gráfico.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bancosDelRanking,
  barrasCalidad,
  cambiosDeLider,
  filasMovimientos,
  lideres,
  nombreMes,
  posicionesPorPeriodo,
  reconciliaciones,
  subactividadesPorBanco,
  sugerenciasDeGraficos,
  ultimaAccion,
} from './accion.js'

const banco = (Posicion, Codigo_Banco, extra = {}) => ({ Posicion, Codigo_Banco, Banco: `Banco ${Codigo_Banco}`, Saldo_Actividad: 10 * Posicion, ...extra })

test('ultimaAccion toma la última respuesta con gráficos y conserva la anterior si la nueva no trae', () => {
  const informe = { tipo: 'informe', graficos: ['rankings', 'calidad'] }
  const mensajes = [
    { id: 1, rol: 'usuario', texto: 'dame el informe' },
    { id: 2, rol: 'asistente', datos: { accion: informe } },
    { id: 3, rol: 'usuario', texto: 'hola' },
    { id: 4, rol: 'asistente', datos: { accion: null } },
    { id: 5, rol: 'asistente', datos: { accion: { tipo: 'informe', graficos: [], avisos: ['sin datos'] } } },
  ]
  assert.deepEqual(ultimaAccion(mensajes), { id: 2, ...informe })
  assert.equal(ultimaAccion([]), null)
  assert.equal(ultimaAccion([{ id: 1, rol: 'error', error: {} }]), null)
})

test('nombreMes y sugerencias con los períodos cargados, según el perfil', () => {
  assert.equal(nombreMes('20260930'), 'septiembre')
  const periodos = [{ Fecha: '20260731' }, { Fecha: '20260831' }, { Fecha: '20260930' }]
  assert.deepEqual(sugerenciasDeGraficos('analista', periodos), [
    'Dame el informe de septiembre',
    'Ranking de construcción de agosto',
    'Compara julio y septiembre',
    '¿Cómo va el banco 108?',
  ])
  const publico = sugerenciasDeGraficos('publico', periodos)
  assert.ok(publico.every((s) => !/compara|informe/i.test(s)))
  assert.deepEqual(sugerenciasDeGraficos('analista', []), [])
})

test('rankings: bancos en orden de posición y líder de cada ranking', () => {
  const respuesta = {
    rankings: [
      { Ranking: 'HIPOTECARIO', bancos: [banco(2, 'EJ-B'), banco(1, 'EJ-A')] },
      { Ranking: 'CONSUMO', bancos: [banco(1, 'EJ-C'), banco(2, 'EJ-A')] },
    ],
  }
  assert.deepEqual(bancosDelRanking(respuesta, 'HIPOTECARIO').map((b) => b.Codigo_Banco), ['EJ-A', 'EJ-B'])
  assert.deepEqual(bancosDelRanking(respuesta, 'NO-EXISTE').map((b) => b.Codigo_Banco), ['EJ-A', 'EJ-B'])
  assert.deepEqual(lideres(respuesta).map((l) => [l.Ranking, l.lider.Codigo_Banco]), [['HIPOTECARIO', 'EJ-A'], ['CONSUMO', 'EJ-C']])
})

test('subactividades: una fila por banco con el saldo tal cual del API', () => {
  const respuesta = {
    subactividades: [
      { Ranking: 'CONSUMO', Subactividad: 'Tarjeta', Codigo_Banco: 'EJ-A', Saldo: 12.34 },
      { Ranking: 'CONSUMO', Subactividad: 'Automovil', Codigo_Banco: 'EJ-A', Saldo: 5.6 },
      { Ranking: 'CONSUMO', Subactividad: 'Tarjeta', Codigo_Banco: 'EJ-B', Saldo: 7.89 },
      { Ranking: 'HIPOTECARIO', Subactividad: 'Vivienda propia', Codigo_Banco: 'EJ-A', Saldo: 99 },
    ],
  }
  const { subactividades, datos } = subactividadesPorBanco(respuesta, [banco(1, 'EJ-A'), banco(2, 'EJ-B')], 'CONSUMO')
  assert.deepEqual(subactividades, [{ clave: 's0', nombre: 'Tarjeta' }, { clave: 's1', nombre: 'Automovil' }])
  assert.deepEqual(datos, [
    { codigo: 'EJ-A', nombre: '1. Banco EJ-A', s0: 12.34, s1: 5.6 },
    { codigo: 'EJ-B', nombre: '2. Banco EJ-B', s0: 7.89 },
  ])
})

test('movimientos: por ranking en orden de posición actual, o de un banco en cada ranking', () => {
  const mov = (Codigo_Banco, Posicion_actual, Cambio_Posicion) => ({ Codigo_Banco, Banco: `Banco ${Codigo_Banco}`, Posicion_actual, Cambio_Posicion })
  const respuesta = {
    rankings: [
      { Ranking: 'COMERCIO', Cambio_Lider: true, Lider_anterior: { Banco: 'Banco EJ-B' }, Lider_actual: { Banco: 'Banco EJ-A' }, movimientos: [mov('EJ-B', 2, -1), mov('EJ-A', 1, 1)] },
      { Ranking: 'CONSUMO', Cambio_Lider: false, movimientos: [mov('EJ-A', 3, 0)] },
    ],
  }
  assert.deepEqual(filasMovimientos(respuesta, { ranking: 'COMERCIO' }).map((m) => [m.etiqueta, m.Cambio_Posicion]), [
    ['1. Banco EJ-A', 1],
    ['2. Banco EJ-B', -1],
  ])
  assert.deepEqual(filasMovimientos(respuesta, { banco: 'EJ-A' }).map((m) => [m.etiqueta, m.Cambio_Posicion]), [
    ['COMERCIO', 1],
    ['CONSUMO', 0],
  ])
  assert.deepEqual(cambiosDeLider(respuesta), [{ Ranking: 'COMERCIO', anterior: { Banco: 'Banco EJ-B' }, actual: { Banco: 'Banco EJ-A' } }])
})

test('posiciones de un banco por período, una columna por ranking', () => {
  const respuestas = [
    { periodo: '20260731', rankings: [{ Ranking: 'HIPOTECARIO', bancos: [{ Posicion: 4 }] }, { Ranking: 'CONSUMO', bancos: [] }] },
    { periodo: '20260831', rankings: [{ Ranking: 'HIPOTECARIO', bancos: [{ Posicion: 3 }] }, { Ranking: 'CONSUMO', bancos: [{ Posicion: 7 }] }] },
  ]
  assert.deepEqual(posicionesPorPeriodo(respuestas), [
    { periodo: '20260731', HIPOTECARIO: 4, CONSUMO: null },
    { periodo: '20260831', HIPOTECARIO: 3, CONSUMO: 7 },
  ])
})

test('calidad: E1–E4 y reconciliaciones tal cual del API', () => {
  const periodo = {
    E1_Duplicados: 11,
    E2_Destino_Extranjero: 22,
    E3_Saldo_No_Positivo: 33,
    E4_Actividad_No_Catalogada: 44,
    Reconciliaciones: { R1: { ok: true }, R2: { ok: false }, R3: { ok: true }, Unicidad: { ok: true } },
  }
  assert.deepEqual(barrasCalidad(periodo).map((b) => [b.clave, b.valor]), [['E1', 11], ['E2', 22], ['E3', 33], ['E4', 44]])
  assert.deepEqual(reconciliaciones(periodo), [
    { clave: 'R1', ok: true },
    { clave: 'R2', ok: false },
    { clave: 'R3', ok: true },
    { clave: 'Unicidad', ok: true },
  ])
  assert.deepEqual(barrasCalidad(null), [])
})
