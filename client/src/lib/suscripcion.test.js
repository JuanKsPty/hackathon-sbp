import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, MENSAJE_API_NO_DISPONIBLE } from '../api/errores.js'
import {
  alternarElegido,
  conEspera,
  cuerpoSuscripcion,
  etiquetaSeleccion,
  LARGO_MAXIMO_CORREO,
  mensajeDeSuscripcion,
  MENSAJE_CORREO_INVALIDO,
  validarCorreo,
} from './suscripcion.js'

test('acepta correos con la forma algo@dominio.ext, con espacios alrededor', () => {
  assert.equal(validarCorreo('analista@banco.com.pa'), null)
  assert.equal(validarCorreo('  nombre.apellido+sbp@ejemplo.com  '), null)
})

test('un correo vacío pide escribirlo', () => {
  assert.match(validarCorreo(''), /Escribe tu correo/)
  assert.match(validarCorreo('   '), /Escribe tu correo/)
  assert.match(validarCorreo(undefined), /Escribe tu correo/)
})

test('rechaza correos sin arroba, sin dominio, con espacios o demasiado largos', () => {
  for (const malo of ['nombre', 'nombre@', '@ejemplo.com', 'nombre@ejemplo', 'nom bre@ejemplo.com', 'a@@b.com']) {
    assert.equal(validarCorreo(malo), MENSAJE_CORREO_INVALIDO, malo)
  }
  const largo = `${'a'.repeat(LARGO_MAXIMO_CORREO)}@ejemplo.com`
  assert.equal(validarCorreo(largo), MENSAJE_CORREO_INVALIDO)
})

test('el cuerpo lleva el correo sin espacios y las listas sin repetidos', () => {
  assert.deepEqual(cuerpoSuscripcion({ correo: '  yo@ejemplo.com ', bancos: ['101', '102', '101'], rankings: ['CONSUMO'] }), {
    correo: 'yo@ejemplo.com',
    bancos: ['101', '102'],
    rankings: ['CONSUMO'],
  })
})

test('sin filtros, el cuerpo manda listas vacías (todos)', () => {
  assert.deepEqual(cuerpoSuscripcion({ correo: 'yo@ejemplo.com' }), { correo: 'yo@ejemplo.com', bancos: [], rankings: [] })
  assert.deepEqual(cuerpoSuscripcion({ correo: 'yo@ejemplo.com', bancos: null, rankings: undefined }), {
    correo: 'yo@ejemplo.com',
    bancos: [],
    rankings: [],
  })
})

test('marcar y desmarcar conserva el orden del catálogo', () => {
  const opciones = ['101', '102', '103']
  const uno = alternarElegido([], opciones, '103', true)
  assert.deepEqual(uno, ['103'])
  const dos = alternarElegido(uno, opciones, '101', true)
  assert.deepEqual(dos, ['101', '103'])
  assert.deepEqual(alternarElegido(dos, opciones, '103', false), ['101'])
  assert.deepEqual(alternarElegido(['101'], opciones, '101', false), [])
})

test('la etiqueta de cada filtro dice todos mientras no haya marcas', () => {
  assert.equal(etiquetaSeleccion(0), 'todos')
  assert.equal(etiquetaSeleccion(1), '1 elegido')
  assert.equal(etiquetaSeleccion(3), '3 elegidos')
})

test('un 429 del server con sus segundos pasa tal cual', () => {
  const error = new ApiError({ status: 429, codigo: 'DEMASIADOS_PEDIDOS', mensaje: 'Espera 42 segundos y vuelve a intentar.' })
  assert.equal(conEspera(error, '42'), error)
})

test('un 429 sin segundos en el mensaje los toma de Retry-After', () => {
  const error = new ApiError({ status: 429, codigo: 'DEMASIADOS_PEDIDOS', mensaje: 'Ya enviamos un correo.' })
  const con = conEspera(error, '30')
  assert.equal(con.status, 429)
  assert.equal(con.codigo, 'DEMASIADOS_PEDIDOS')
  assert.equal(con.mensaje, 'Ya enviamos un correo. Espera 30 segundos y vuelve a intentar.')
})

test('un 429 de un proxy sin el formato común también explica la espera', () => {
  const sinFormato = new ApiError({ status: 429, codigo: 'RESPUESTA_INESPERADA', mensaje: 'El API respondió 429 sin el formato de error esperado.' })
  assert.equal(conEspera(sinFormato, '1').mensaje, 'Hiciste muchas solicitudes seguidas. Espera 1 segundo y vuelve a intentar.')
  assert.equal(conEspera(sinFormato, null).mensaje, 'Hiciste muchas solicitudes seguidas. Espera unos minutos y vuelve a intentar.')
  // Retry-After también puede ser una fecha HTTP: no se interpreta como segundos.
  assert.match(conEspera(sinFormato, 'Wed, 21 Oct 2026 07:28:00 GMT').mensaje, /Espera unos minutos/)
})

test('los errores que no son 429 no se tocan', () => {
  const invalido = new ApiError({ status: 400, codigo: 'PARAMETRO_INVALIDO', mensaje: 'Escribe un correo válido.' })
  assert.equal(conEspera(invalido, '30'), invalido)
  assert.equal(conEspera(null, '30'), null)
})

test('el mensaje para la persona sale del server, salvo si el API no responde', () => {
  const invalido = new ApiError({ status: 400, codigo: 'PARAMETRO_INVALIDO', mensaje: 'Los bancos no existe(n) en el catálogo: 999.' })
  assert.equal(mensajeDeSuscripcion(invalido), 'Los bancos no existe(n) en el catálogo: 999.')

  const caida = new ApiError({ status: 0, codigo: 'API_NO_DISPONIBLE', mensaje: MENSAJE_API_NO_DISPONIBLE })
  assert.match(mensajeDeSuscripcion(caida), /No hay conexión con el servidor/)
  assert.doesNotMatch(mensajeDeSuscripcion(caida), /npm run dev/)

  assert.match(mensajeDeSuscripcion(new Error('boom')), /boom/)
  assert.match(mensajeDeSuscripcion(undefined), /No se pudo enviar la solicitud/)
})
