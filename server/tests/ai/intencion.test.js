// Intérprete de intención del chat (#108): de la pregunta a los gráficos que se muestran.
// La IA y las reglas solo interpretan (tipo, período, ranking, banco); no hay cifras del motor aquí.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../../src/app.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../../src/routes/movimientos.js';
import {
  contextoDe,
  definicionGraficos,
  interpretarPregunta,
  normalizar,
  nombrePeriodo,
  validarAccion,
  NOMBRE_HERRAMIENTA_GRAFICOS,
  TIPOS,
} from '../../src/ai/intencion.js';
import { paqueteReal } from '../ayuda.js';

const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 };

// Contexto con los períodos y catálogos reales (los tres AT03 del paquete).
function almacenReal() {
  const { catalogos, periodos } = paqueteReal();
  return crearAlmacen(catalogos, periodos);
}
const contexto = contextoDe(almacenReal());
const [JUL, AGO, SEP] = contexto.fechas;

// Lo esencial de una acción, para comparar.
const resumen = (a) =>
  a && { tipo: a.tipo, periodo: a.periodo, periodo_anterior: a.periodo_anterior, ranking: a.ranking, banco: a.banco, graficos: a.graficos };

test('el contexto sale del almacén: períodos cargados, 6 rankings y 12 bancos', () => {
  assert.deepEqual([JUL, AGO, SEP].map((f) => f.slice(4, 6)), ['07', '08', '09']);
  assert.equal(contexto.rankings.length, 6);
  assert.equal(contexto.bancos.size, 12);
  assert.equal(contexto.bancos.get('108'), 'Banco Capital');
});

test('normaliza la pregunta y nombra los períodos', () => {
  assert.equal(normalizar('¿Cómo va el Banco 108?'), 'como va el banco 108');
  assert.equal(normalizar('Ranking de CONSTRUCCIÓN, agosto'), 'ranking de construccion agosto');
  assert.equal(nombrePeriodo('20260930'), 'septiembre de 2026');
});

test('"dame el informe de septiembre": rankings, movimientos contra agosto y calidad', () => {
  const accion = interpretarPregunta('dame el informe de septiembre', contexto, 'analista');
  assert.deepEqual(resumen(accion), {
    tipo: 'informe',
    periodo: SEP,
    periodo_anterior: AGO,
    ranking: null,
    banco: null,
    graficos: ['rankings', 'movimientos', 'calidad'],
  });
  assert.equal(accion.origen, 'reglas');
  assert.equal(accion.titulo, 'Informe de septiembre de 2026');
  assert.deepEqual(accion.avisos, []);
  assert.match(accion.resumen, /^Este es el informe de septiembre de 2026 \(\d{8}\)/);
});

test('variantes de la pregunta', () => {
  const casos = [
    ['ranking de construcción de agosto', { tipo: 'ranking', periodo: AGO, periodo_anterior: null, ranking: 'CONSTRUCCION', banco: null, graficos: ['rankings', 'subactividades'] }],
    ['Compara julio y septiembre', { tipo: 'comparar', periodo: SEP, periodo_anterior: JUL, ranking: null, banco: null, graficos: ['movimientos'] }],
    ['cómo va el banco 108', { tipo: 'banco', periodo: SEP, periodo_anterior: AGO, ranking: null, banco: '108', graficos: ['banco', 'movimientos'] }],
    ['¿Cómo va Banco del Canal?', { tipo: 'banco', periodo: SEP, periodo_anterior: AGO, ranking: null, banco: '106', graficos: ['banco', 'movimientos'] }],
    ['¿Quién lidera HIPOTECARIO en septiembre?', { tipo: 'ranking', periodo: SEP, periodo_anterior: null, ranking: 'HIPOTECARIO', banco: null, graficos: ['rankings', 'subactividades'] }],
    ['¿Cuál es el top 5 de CONSUMO?', { tipo: 'ranking', periodo: SEP, periodo_anterior: null, ranking: 'CONSUMO', banco: null, graficos: ['rankings', 'subactividades'] }],
    ['¿Cuántas filas se excluyeron y por qué motivo?', { tipo: 'calidad', periodo: SEP, periodo_anterior: null, ranking: null, banco: null, graficos: ['calidad'] }],
    ['¿Qué bancos subieron más posiciones respecto al período anterior?', { tipo: 'comparar', periodo: SEP, periodo_anterior: AGO, ranking: null, banco: null, graficos: ['movimientos'] }],
    ['movimientos de comercio en agosto', { tipo: 'movimientos', periodo: AGO, periodo_anterior: JUL, ranking: 'COMERCIO', banco: null, graficos: ['movimientos'] }],
    [`informe ${SEP} de agro`, { tipo: 'informe', periodo: SEP, periodo_anterior: AGO, ranking: 'AGROPECUARIO', banco: null, graficos: ['rankings', 'movimientos', 'calidad'] }],
    ['¿qué pasó en el último período?', { tipo: 'informe', periodo: SEP, periodo_anterior: AGO, ranking: null, banco: null, graficos: ['rankings', 'movimientos', 'calidad'] }],
  ];
  for (const [pregunta, esperado] of casos) {
    assert.deepEqual(resumen(interpretarPregunta(pregunta, contexto, 'analista')), esperado, pregunta);
  }
});

test('el banco "cómo va" trae todos los períodos hasta el pedido', () => {
  const accion = interpretarPregunta('cómo va el banco 108 en agosto', contexto, 'analista');
  assert.deepEqual(accion.periodos, [JUL, AGO]);
  assert.equal(accion.banco_nombre, 'Banco Capital');
  assert.equal(accion.titulo, 'Banco Capital (108) hasta agosto de 2026');
});

test('sin gráficos: preguntas de cómo usar la app, saludos y sin contexto', () => {
  for (const pregunta of ['¿Cómo descargo el reporte de rankings?', '¿Dónde cambio el perfil?', 'hola', '¿qué puedes hacer?']) {
    assert.equal(interpretarPregunta(pregunta, contexto, 'analista'), null, pregunta);
  }
  assert.equal(interpretarPregunta('informe de septiembre', { fechas: [], rankings: [], bancos: new Map() }), null);
});

test('un mes sin datos no se cambia por otro: solo el aviso', () => {
  const accion = interpretarPregunta('dame el informe de junio', contexto, 'analista');
  assert.deepEqual(accion.graficos, []);
  assert.equal(accion.periodo, null);
  assert.deepEqual(accion.avisos, ['No hay un período cargado de junio.']);
  assert.match(accion.resumen, /Períodos disponibles/);
});

test('el primer período no tiene movimientos: se omiten con un aviso', () => {
  const accion = interpretarPregunta('informe de julio', contexto, 'analista');
  assert.deepEqual(accion.graficos, ['rankings', 'calidad']);
  assert.equal(accion.periodo_anterior, null);
  assert.match(accion.avisos[0], /No hay un período cargado anterior/);
});

test('perfiles: Público ve rankings y calidad; los movimientos quedan para Analista y Administrador', () => {
  const publico = interpretarPregunta('dame el informe de septiembre', contexto, 'publico');
  assert.deepEqual(publico.graficos, ['rankings', 'calidad']);
  assert.equal(publico.periodo_anterior, null);
  assert.deepEqual(publico.avisos, ['Movimientos entre períodos: solo para los perfiles Analista y Administrador.']);

  const comparar = interpretarPregunta('compara julio y septiembre', contexto, 'publico');
  assert.deepEqual(comparar.graficos, []);
  assert.equal(comparar.avisos.length, 1);

  const banco = interpretarPregunta('cómo va el banco 108', contexto, 'publico');
  assert.deepEqual(banco.graficos, ['banco']);

  // Administrador ve lo mismo que Analista.
  assert.deepEqual(
    resumen(interpretarPregunta('dame el informe de septiembre', contexto, 'admin')),
    resumen(interpretarPregunta('dame el informe de septiembre', contexto, 'analista')),
  );
});

test('la IA y las reglas producen la misma acción', () => {
  const pares = [
    ['dame el informe de septiembre', { tipo: 'informe', periodo: SEP }],
    ['ranking de construcción de agosto', { tipo: 'ranking', periodo: AGO, ranking: 'CONSTRUCCION' }],
    ['compara julio y septiembre', { tipo: 'comparar', periodo: SEP, periodo_anterior: JUL }],
    ['cómo va el banco 108', { tipo: 'banco', banco: '108' }],
  ];
  for (const perfil of ['analista', 'publico']) {
    for (const [pregunta, entrada] of pares) {
      const reglas = interpretarPregunta(pregunta, contexto, perfil);
      const ia = validarAccion(entrada, contexto, perfil);
      assert.equal(ia.ok, true, pregunta);
      assert.equal(ia.accion.origen, 'ia');
      assert.deepEqual({ ...ia.accion, origen: 'reglas' }, reglas, `${perfil}: ${pregunta}`);
    }
  }
});

test('validarAccion rechaza lo que no está en los catálogos ni en los períodos cargados', () => {
  const casos = [
    [{ tipo: 'pronostico' }, /tipo debe ser uno de/],
    [{ tipo: 'informe', periodo: '20261031' }, /no está cargado/],
    [{ tipo: 'ranking', ranking: 'TURISMO' }, /ranking "TURISMO" no existe/],
    [{ tipo: 'banco' }, /hace falta el código del banco/],
    [{ tipo: 'banco', banco: '999' }, /banco "999" no existe/],
    [{ tipo: 'comparar', periodo: AGO, periodo_anterior: SEP }, /debe ser anterior/],
    [null, /tipo debe ser uno de/],
  ];
  for (const [entrada, error] of casos) {
    const r = validarAccion(entrada, contexto, 'analista');
    assert.equal(r.ok, false, JSON.stringify(entrada));
    assert.match(r.errores.join('\n'), error);
  }
  // null o vacío cuenta como no indicado.
  const r = validarAccion({ tipo: 'informe', periodo: null, ranking: '', banco: null }, contexto, 'analista');
  assert.equal(r.ok, true);
  assert.equal(r.accion.periodo, SEP);
});

test('la herramienta mostrar_graficos solo admite valores del catálogo y períodos cargados', () => {
  const definicion = definicionGraficos(contexto);
  assert.equal(definicion.name, NOMBRE_HERRAMIENTA_GRAFICOS);
  const { properties, required, additionalProperties } = definicion.input_schema;
  assert.deepEqual(required, ['tipo']);
  assert.equal(additionalProperties, false);
  assert.deepEqual(properties.tipo.enum, TIPOS);
  assert.deepEqual(properties.periodo.enum, contexto.fechas);
  assert.deepEqual(properties.ranking.enum, contexto.rankings);
  assert.deepEqual(properties.banco.enum, [...contexto.bancos.keys()]);
});

// ---------- Por la API: POST /api/ia/preguntar ----------

const servidores = [];
after(() => servidores.forEach((s) => s.close()));

async function levantar(opcionesIA) {
  const almacen = almacenReal();
  const obtenerMovimientos = crearObtenerMovimientos(almacen, { obtenerRegla: () => REGLA });
  const servidor = crearApp({ almacen, obtenerMovimientos, opcionesIA, limiteIA: { maximo: 1000 } }).listen(0, '127.0.0.1');
  servidores.push(servidor);
  await once(servidor, 'listening');
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  process.env.API_INTERNA = base;
  return base;
}

async function preguntar(base, pregunta, perfil = 'analista') {
  const r = await fetch(`${base}/ia/preguntar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Perfil': perfil },
    body: JSON.stringify({ pregunta }),
  });
  assert.equal(r.status, 200);
  return r.json();
}

function clienteGuionado(pasos) {
  const llamadas = [];
  return {
    llamadas,
    beta: {
      messages: {
        create: async (params) => {
          llamadas.push(structuredClone(params));
          return pasos[llamadas.length - 1](params);
        },
      },
    },
  };
}
const usar = (name, input) => () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `tu_${name}`, name, input }] });
const responder = (text) => () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });

test('API sin key: la acción sale de las reglas y respeta el perfil', async () => {
  const base = await levantar({ apiKey: '' });

  const analista = await preguntar(base, 'dame el informe de septiembre');
  assert.equal(analista.ia_disponible, false);
  assert.equal(analista.respuesta, null); // sin IA no hay texto redactado por IA
  assert.match(analista.aviso, /Datos ficticios/);
  assert.equal(analista.accion.origen, 'reglas');
  assert.deepEqual(analista.accion.graficos, ['rankings', 'movimientos', 'calidad']);
  assert.equal(analista.accion.periodo, SEP);

  const publico = await preguntar(base, 'dame el informe de septiembre', 'publico');
  assert.deepEqual(publico.accion.graficos, ['rankings', 'calidad']);

  // Los gráficos se piden a la API con el mismo perfil: lo que la acción muestra, la API lo entrega.
  const movimientos = await fetch(`${base}/movimientos?desde=${AGO}&hasta=${SEP}`, { headers: { 'X-Perfil': 'publico' } });
  assert.equal(movimientos.status, 403);

  const comoHacer = await preguntar(base, '¿Cómo descargo el reporte de rankings?');
  assert.equal(comoHacer.accion, null);
});

test('API con IA: la acción la propone la IA con mostrar_graficos y se verifica', async () => {
  const cliente = clienteGuionado([
    usar(NOMBRE_HERRAMIENTA_GRAFICOS, { tipo: 'informe', periodo: SEP }),
    (params) => {
      const resultado = JSON.parse(params.messages.at(-1).content[0].content);
      assert.deepEqual(resultado.graficos, ['rankings', 'movimientos', 'calidad']);
      return responder(`Te muestro el informe de septiembre de 2026 (${SEP}).`)();
    },
  ]);
  const base = await levantar({ cliente });
  const cuerpo = await preguntar(base, 'dame el informe de septiembre');
  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.verificada, true); // el período de la acción cuenta como dato consultado
  assert.equal(cuerpo.accion.origen, 'ia');
  assert.deepEqual(resumen(cuerpo.accion), resumen(interpretarPregunta('dame el informe de septiembre', contexto, 'analista')));
  assert.ok(cliente.llamadas[0].tools.some((t) => t.name === NOMBRE_HERRAMIENTA_GRAFICOS));
});

test('API con IA: una entrada inválida vuelve a la IA como error y no se muestra', async () => {
  const cliente = clienteGuionado([
    usar(NOMBRE_HERRAMIENTA_GRAFICOS, { tipo: 'informe', periodo: '20261231' }),
    (params) => {
      const bloque = params.messages.at(-1).content[0];
      assert.equal(bloque.is_error, true);
      assert.match(bloque.content, /no está cargado/);
      return responder('No hay datos de ese período.')();
    },
  ]);
  const base = await levantar({ cliente });
  const cuerpo = await preguntar(base, 'hola');
  assert.equal(cuerpo.accion, null); // ni la IA ni las reglas proponen gráficos
});

test('API con IA: si la IA no pide gráficos, las reglas los ponen; si guía, no', async () => {
  const sinGraficos = clienteGuionado([responder('Lidera Banco Pacifico.')]);
  const cuerpo = await preguntar(await levantar({ cliente: sinGraficos }), 'ranking de construcción de agosto');
  assert.equal(cuerpo.accion.origen, 'reglas');
  assert.equal(cuerpo.accion.ranking, 'CONSTRUCCION');

  const conGuia = clienteGuionado([
    usar('guiar_usuario', { pasos: [{ guia: 'rankings.selector-ranking', texto: 'Elige el ranking aquí.' }] }),
    responder('Te muestro dónde elegir el ranking.'),
  ]);
  const guiada = await preguntar(await levantar({ cliente: conGuia }), 'ranking de construcción de agosto');
  assert.equal(guiada.guia.pasos.length, 1);
  assert.equal(guiada.accion, null);
});

test('API: si la IA falla, las reglas siguen mostrando los gráficos', async () => {
  const cliente = { beta: { messages: { create: async () => { throw new Error('key vencida'); } } } };
  const cuerpo = await preguntar(await levantar({ cliente }), 'compara julio y septiembre');
  assert.equal(cuerpo.ia_disponible, false);
  assert.deepEqual(resumen(cuerpo.accion), {
    tipo: 'comparar',
    periodo: SEP,
    periodo_anterior: JUL,
    ranking: null,
    banco: null,
    graficos: ['movimientos'],
  });
});
