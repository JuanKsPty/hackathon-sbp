// Eventos hacia Zapier (#7): armado del evento con los datos reales y envío sin depender de Zapier.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearAlmacen } from '../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../src/routes/movimientos.js';
import { calidadDePeriodo, AVISO } from '../src/routes/formato.js';
import { leerOperaciones } from '../src/datos/bitacora.js';
import {
  REGLA_CASOS,
  casosDeCalidad,
  destinatarios,
  enviarEvento,
  eventoPeriodoPublicado,
  eventoSuscripcion,
  movimientosSignificativos,
  urlDeZapier,
} from '../src/automation/zapier.js';
import { paqueteReal } from './ayuda.js';

const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 };
const leerContrato = (archivo) =>
  JSON.parse(fs.readFileSync(new URL(`../../contracts/${archivo}`, import.meta.url), 'utf8'));

let catalogos;
let septiembre;
let comparacion;

before(() => {
  const paquete = paqueteReal();
  catalogos = paquete.catalogos;
  septiembre = paquete.periodos.find((p) => p.fecha === '20260930');
  const obtenerMovimientos = crearObtenerMovimientos(crearAlmacen(catalogos, paquete.periodos), { obtenerRegla: () => REGLA });
  comparacion = obtenerMovimientos({ desde: '20260831', hasta: '20260930' });
});

function publicadoDeSeptiembre() {
  return { fecha: '20260930', accion: 'NUEVO', comparacion, calidad: calidadDePeriodo(septiembre), periodo: septiembre };
}

const suscriptor = (cambios = {}) => ({ correo: 'equipo@ejemplo.com', bancos: [], rankings: [], activo: true, token: 't-1', ...cambios });

test('los casos de seguimiento cuentan exactamente las excluidas E1 y E4 de cada banco', () => {
  const casos = casosDeCalidad(septiembre, catalogos.bancos);
  const suma = (tipo) => casos.filter((c) => c.Tipo_Alerta === tipo).reduce((total, c) => total + c.Cantidad, 0);
  assert.deepEqual(REGLA_CASOS.motivos, ['E1', 'E4']);
  assert.equal(suma('E1_Duplicados'), septiembre.calidad.e1Duplicados);
  assert.equal(suma('E4_Actividad_No_Catalogada'), septiembre.calidad.e4ActividadNoCatalogada);
  assert.equal(new Set(casos.map((c) => c.Caso_ID)).size, casos.length);
  for (const caso of casos) {
    assert.match(caso.Caso_ID, /^20260930-1\d\d-E[14]$/);
    assert.equal(caso.Banco, catalogos.bancos.get(caso.Codigo_Banco));
  }
});

test('E2 (destino extranjero) no abre casos y el mínimo es configurable', () => {
  assert.equal(casosDeCalidad(septiembre, catalogos.bancos).some((c) => c.Tipo_Alerta === 'E2_Destino_Extranjero'), false);
  assert.deepEqual(casosDeCalidad(septiembre, catalogos.bancos, { motivos: ['E1'], minimo: 1000 }), []);
});

test('los movimientos significativos salen de la comparación del motor, con su frase de plantilla', () => {
  const movimientos = movimientosSignificativos(comparacion);
  const esperados = comparacion.rankings.flatMap((r) => r.movimientos.filter((m) => m.Significativo));
  assert.equal(movimientos.length, esperados.length);
  assert.ok(movimientos.length > 0);
  for (const m of movimientos) {
    assert.equal(typeof m.Ranking, 'string');
    assert.ok(m.Explicacion.includes(m.Banco));
  }
});

test('cada suscriptor recibe solo los bancos y rankings que sigue', () => {
  const movimientos = [
    { Ranking: 'COMERCIO', Codigo_Banco: '108' },
    { Ranking: 'CONSUMO', Codigo_Banco: '106' },
  ];
  const lista = destinatarios(
    [
      suscriptor({ correo: 'todo@ejemplo.com' }),
      suscriptor({ correo: 'banco@ejemplo.com', bancos: ['106'] }),
      suscriptor({ correo: 'ranking@ejemplo.com', rankings: ['COMERCIO'] }),
      suscriptor({ correo: 'baja@ejemplo.com', activo: false }),
    ],
    movimientos,
  );
  assert.deepEqual(
    lista.map((d) => [d.correo, d.movimientos.map((m) => m.Codigo_Banco)]),
    [
      ['todo@ejemplo.com', ['108', '106']],
      ['banco@ejemplo.com', ['106']],
      ['ranking@ejemplo.com', ['108']],
    ],
  );
  assert.match(lista[0].enlace_baja, /\/api\/suscripciones\/baja\?token=t-1$/);
});

test('periodo_publicado trae el resumen de calidad, los líderes, los destinatarios y los casos', () => {
  const evento = eventoPeriodoPublicado(publicadoDeSeptiembre(), {
    archivo: 'AT03_sintetico_202609.csv',
    catalogos,
    suscriptores: [suscriptor()],
  });
  assert.equal(evento.evento, 'periodo_publicado');
  assert.equal(evento.periodo, '20260930');
  assert.equal(evento.periodo_anterior, '20260831');
  assert.equal(evento.aviso, AVISO);
  assert.equal(evento.resumen.Universo_Local_Valido, septiembre.calidad.universoValido);
  assert.equal(evento.resumen.Saldo_Total_Valido, septiembre.calidad.saldoTotalValido / 100);
  assert.equal(evento.lideres.length, catalogos.macroactividades.length);
  assert.equal(evento.destinatarios.length, 1);
  assert.equal(evento.destinatarios[0].movimientos.length, evento.movimientos_significativos.length);
  assert.ok(evento.casos.length > 0);
  // Tiene los mismos campos que el ejemplo del contrato.
  assert.deepEqual(Object.keys(evento).sort(), Object.keys(leerContrato('evento-periodo-publicado.json')).sort());
});

test('el primer período (sin comparación) toma los líderes de los rankings del motor', () => {
  const evento = eventoPeriodoPublicado({ ...publicadoDeSeptiembre(), comparacion: null }, { catalogos });
  assert.equal(evento.periodo_anterior, null);
  assert.deepEqual(evento.movimientos_significativos, []);
  const hipotecario = septiembre.rankings.find((r) => r.ranking === 'HIPOTECARIO');
  assert.equal(evento.lideres.find((l) => l.Ranking === 'HIPOTECARIO').Codigo_Banco, hipotecario.filas[0].codigoBanco);
});

test('suscripcion_actualizada tiene los campos del contrato', () => {
  const evento = eventoSuscripcion(suscriptor({ bancos: ['104'] }), 'alta');
  assert.equal(evento.evento, 'suscripcion_actualizada');
  assert.deepEqual(Object.keys(evento).sort(), Object.keys(leerContrato('evento-suscripcion-actualizada.json')).sort());
});

test('en las pruebas nunca se usa la URL real de Zapier', () => {
  assert.equal(urlDeZapier(), '');
});

test('sin URL el evento queda PENDIENTE y no se llama a la red', async () => {
  let llamadas = 0;
  const resultado = await enviarEvento(eventoSuscripcion(suscriptor(), 'alta'), {
    url: '',
    fetchFn: async () => {
      llamadas += 1;
    },
  });
  assert.equal(resultado.estado, 'PENDIENTE');
  assert.equal(llamadas, 0);
});

test('con URL se envía el JSON por POST y queda ENVIADO en la bitácora, sin URL ni correos', async () => {
  const evento = eventoSuscripcion(suscriptor(), 'alta');
  let pedido;
  const resultado = await enviarEvento(evento, {
    url: 'https://hooks.ejemplo/secreto',
    fetchFn: async (url, opciones) => {
      pedido = { url, ...opciones };
      return { ok: true, status: 200 };
    },
  });
  assert.equal(resultado.estado, 'ENVIADO');
  assert.equal(pedido.method, 'POST');
  assert.deepEqual(JSON.parse(pedido.body), evento);
  const [registro] = leerOperaciones().filter((o) => o.operacion === 'evento_zapier');
  assert.equal(registro.resultado, 'exito');
  assert.ok(registro.detalle.includes(evento.id_evento));
  assert.equal(registro.detalle.includes('secreto'), false);
  assert.equal(registro.detalle.includes('@'), false);
});

test('un error de Zapier queda ERROR y una falla de red o de tiempo queda PENDIENTE', async () => {
  const evento = eventoSuscripcion(suscriptor(), 'baja');
  const conError = await enviarEvento(evento, { url: 'https://x', fetchFn: async () => ({ ok: false, status: 500 }) });
  assert.equal(conError.estado, 'ERROR');

  const sinRed = await enviarEvento(evento, {
    url: 'https://x',
    fetchFn: async () => {
      throw new TypeError('fetch failed');
    },
  });
  assert.equal(sinRed.estado, 'PENDIENTE');

  const lento = await enviarEvento(evento, {
    url: 'https://x',
    tiempoMaximoMs: 20,
    fetchFn: (url, { signal }) =>
      new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
  });
  assert.equal(lento.estado, 'PENDIENTE');
});

test('enviado_en va en hora de Panamá (UTC-5)', async () => {
  const { ahoraEnPanama } = await import('../src/automation/zapier.js');
  assert.equal(ahoraEnPanama(new Date('2026-11-27T16:43:04.213Z')), '2026-11-27T11:43:04.213-05:00');
  assert.match(eventoSuscripcion(suscriptor(), 'alta').enviado_en, /-05:00$/);
});

test('los enlaces de los correos usan APP_URL; sin ella, localhost para desarrollo', async () => {
  const { enlaceDeBaja, enlaceDeConfirmacion } = await import('../src/automation/zapier.js');
  const anterior = process.env.APP_URL;
  try {
    process.env.APP_URL = 'https://radar.ejemplo.com/';
    assert.equal(enlaceDeBaja('t 1'), 'https://radar.ejemplo.com/api/suscripciones/baja?token=t%201');
    assert.equal(enlaceDeConfirmacion('c-2'), 'https://radar.ejemplo.com/api/suscripciones/confirmar?token=c-2');
    delete process.env.APP_URL;
    assert.match(enlaceDeBaja('t-1'), /^http:\/\/localhost:\d+\/api\/suscripciones\/baja\?token=t-1$/);
  } finally {
    if (anterior === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = anterior;
  }
});

test('confirmacion_suscripcion trae el enlace de confirmación y los campos del contrato', async () => {
  const { eventoConfirmacion } = await import('../src/automation/zapier.js');
  const evento = eventoConfirmacion({
    correo: 'equipo@ejemplo.com',
    confirmacion: { token: 'c-9', bancos: ['104'], rankings: [], solicitado_en: '2026-11-27T15:00:00Z' },
  });
  assert.equal(evento.evento, 'confirmacion_suscripcion');
  assert.match(evento.enlace_confirmacion, /\/api\/suscripciones\/confirmar\?token=c-9$/);
  assert.deepEqual(evento.bancos, ['104']);
  assert.deepEqual(Object.keys(evento).sort(), Object.keys(leerContrato('evento-confirmacion-suscripcion.json')).sort());
});
