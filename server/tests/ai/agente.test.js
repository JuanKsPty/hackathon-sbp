// Agente de exploración (#3) y rutas de IA, contra la API real con un cliente de Claude simulado.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../../src/app.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../../src/routes/movimientos.js';
import { crearEjecutor, DEFINICIONES } from '../../src/ai/herramientas.js';
import { paqueteReal } from '../ayuda.js';

const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 };
const servidores = [];
after(() => servidores.forEach((s) => s.close()));

async function levantar(opcionesIA) {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const obtenerMovimientos = crearObtenerMovimientos(almacen, { obtenerRegla: () => REGLA });
  const servidor = crearApp({ almacen, obtenerMovimientos, opcionesIA }).listen(0);
  servidores.push(servidor);
  await once(servidor, 'listening');
  return `http://127.0.0.1:${servidor.address().port}/api`;
}

async function preguntar(base, cuerpo, perfil = 'analista') {
  const r = await fetch(`${base}/ia/preguntar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Perfil': perfil },
    body: JSON.stringify(cuerpo),
  });
  return { status: r.status, cuerpo: await r.json() };
}

// Cliente simulado: cada paso recibe los parámetros de la llamada y devuelve la respuesta de Claude.
function clienteGuionado(pasos) {
  const llamadas = [];
  return {
    llamadas,
    beta: {
      messages: {
        create: async (params) => {
          llamadas.push(structuredClone(params));
          const paso = pasos[llamadas.length - 1];
          if (!paso) throw new Error('El guion no tiene más pasos');
          return paso(params);
        },
      },
    },
  };
}

const usarHerramienta = (name, input) => () => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: `tu_${name}`, name, input }],
});
const responder = (texto) => () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: texto }] });

// Último resultado de herramienta que recibió el modelo.
function ultimoResultado(params) {
  const bloques = params.messages.at(-1).content;
  return JSON.parse(bloques.find((b) => b.type === 'tool_result').content);
}

test('las definiciones de herramientas son de solo lectura y sin campos internos', () => {
  assert.equal(DEFINICIONES.length, 7);
  for (const d of DEFINICIONES) {
    assert.deepEqual(Object.keys(d), ['name', 'description', 'input_schema']);
    assert.equal(d.input_schema.additionalProperties, false);
  }
});

test('sin API key: estado, pregunta y explicaciones responden sin IA', async () => {
  const base = await levantar({ apiKey: '' });
  assert.deepEqual(await (await fetch(`${base}/ia/estado`)).json(), { ia_disponible: false, modelo: null });

  const { status, cuerpo } = await preguntar(base, { pregunta: '¿Quién lidera HIPOTECARIO?' });
  assert.equal(status, 200);
  assert.equal(cuerpo.ia_disponible, false);
  assert.match(cuerpo.motivo, /IA no disponible/);
  assert.equal(cuerpo.respuesta, null);
  assert.match(cuerpo.aviso, /Datos ficticios/);

  const explicacion = await (await fetch(`${base}/explicaciones`, { headers: { 'X-Perfil': 'analista' } })).json();
  assert.equal(explicacion.periodo_anterior, '20260831');
  assert.equal(explicacion.periodo_actual, '20260930');
  assert.equal(explicacion.ia_disponible, false);
  assert.ok(explicacion.items.length > 0);
  assert.ok(explicacion.items.some((i) => i.texto.startsWith('Banco Solidez pasa a liderar COMERCIO')));
});

test('valida la pregunta', async () => {
  const base = await levantar({ apiKey: '' });
  for (const cuerpo of [{}, { pregunta: '   ' }, { pregunta: 'x'.repeat(501) }, { pregunta: 'hola', historial: [{ rol: 'otro', texto: 'x' }] }]) {
    const r = await preguntar(base, cuerpo);
    assert.equal(r.status, 400);
    assert.equal(r.cuerpo.error.codigo, 'PARAMETRO_INVALIDO');
  }
});

test('responde consultando el motor y verifica los números', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('consultar_rankings', { periodo: '20260930', ranking: 'HIPOTECARIO' }),
    (params) => {
      const lider = ultimoResultado(params).rankings[0].bancos[0];
      const saldo = lider.Saldo_Actividad.toLocaleString('en-US', { minimumFractionDigits: 2 });
      return responder(`En septiembre de 2026 (20260930) lidera HIPOTECARIO ${lider.Banco}, con un saldo de ${saldo} y una ponderación de ${lider.Ponderacion_Pct}%.`)();
    },
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Quién lidera HIPOTECARIO?' });

  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.verificada, true);
  assert.match(cuerpo.respuesta, /lidera HIPOTECARIO Banco/);
  assert.match(cuerpo.etiqueta, /los cálculos provienen del motor determinista/);
  assert.deepEqual(cuerpo.consultas, [{
    herramienta: 'consultar_rankings',
    entrada: { periodo: '20260930', ranking: 'HIPOTECARIO' },
    ok: true,
    ruta: '/rankings?periodo=20260930&ranking=HIPOTECARIO',
  }]);
  // El modelo recibe las 7 herramientas y la instrucción de no calcular.
  assert.equal(cliente.llamadas[0].tools.length, 8); // 7 de consulta + guiar_usuario
  assert.match(cliente.llamadas[0].system, /No calcules nada/);
});

test('si inventa un número, pide corregir; si corrige, responde verificado', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('consultar_calidad', { periodo: '20260930' }),
    responder('En total se excluyeron 123456789 filas.'),
    (params) => {
      assert.match(params.messages.at(-1).content, /123456789/); // se le indica qué número no existe
      const calidad = params.messages
        .flatMap((m) => (Array.isArray(m.content) ? m.content : []))
        .filter((b) => b.type === 'tool_result')
        .map((b) => JSON.parse(b.content))[0].periodos[0];
      return responder(`En 20260930 el universo local válido es de ${calidad.Universo_Local_Valido} filas.`)();
    },
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuántas filas quedaron válidas en septiembre?' });
  assert.equal(cuerpo.verificada, true);
  assert.match(cuerpo.respuesta, /universo local válido/);
});

test('si insiste en números que no están en el motor, no muestra la respuesta', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('listar_periodos', {}),
    responder('El sistema creció 987654%.'),
    responder('El sistema creció 555555%.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuánto creció el sistema?' });
  assert.equal(cuerpo.verificada, false);
  assert.equal(cuerpo.respuesta, null);
  assert.match(cuerpo.motivo, /números verificados/);
});

test('un parámetro inválido vuelve al modelo como error de herramienta', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('consultar_rankings', { ranking: 'VIVIENDA' }),
    (params) => {
      const resultado = params.messages.at(-1).content[0];
      assert.equal(resultado.is_error, true);
      assert.match(resultado.content, /VIVIENDA/);
      return responder('Ese ranking no existe; los disponibles son HIPOTECARIO, CONSTRUCCION, INDUSTRIA, AGROPECUARIO, COMERCIO y CONSUMO.')();
    },
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: 'Ranking de vivienda' });
  assert.equal(cuerpo.verificada, true);
  assert.equal(cuerpo.consultas[0].ok, false);
});

test('perfil Público: sin herramienta de movimientos y sin explicaciones (403)', async () => {
  const cliente = clienteGuionado([responder('Puedo consultar rankings, subactividades y calidad.')]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Qué puedes consultar?' }, 'publico');
  assert.equal(cuerpo.verificada, true);
  const nombres = cliente.llamadas[0].tools.map((t) => t.name);
  assert.equal(nombres.length, 7); // 6 de consulta + guiar_usuario
  assert.ok(!nombres.includes('consultar_movimientos'));

  const explicacion = await fetch(`${base}/explicaciones`);
  assert.equal(explicacion.status, 403);
  // El ejecutor manda el perfil: Público recibe 403 en movimientos aunque lo pida.
  const salida = await crearEjecutor(base, { perfil: 'publico' })('consultar_movimientos', {});
  assert.equal(salida.ok, false);
});

test('si la IA falla, la ruta responde 200 con IA no disponible', async () => {
  const cliente = { beta: { messages: { create: async () => { throw new Error('sin red'); } } } };
  const base = await levantar({ cliente });
  const { status, cuerpo } = await preguntar(base, { pregunta: 'Hola' });
  assert.equal(status, 200);
  assert.equal(cuerpo.ia_disponible, false);
});

test('las excluidas se recortan a una muestra y conservan el total', async () => {
  const base = await levantar({ apiKey: '' });
  const salida = await crearEjecutor(base)('consultar_excluidas', { periodo: '20260930' });
  assert.equal(salida.ok, true);
  assert.equal(salida.datos.excluidas.length, 20);
  assert.equal(salida.datos.excluidas_mostradas, 20);
  assert.ok(salida.datos.total > 20);
});

test('guía: devuelve los pasos validados con la ruta del catálogo', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('guiar_usuario', {
      pasos: [
        { guia: 'global.menu-rankings', texto: 'Entra a Rankings desde el menú.' },
        { guia: 'rankings.selector-ranking', texto: 'Elige COMERCIO.' },
        { guia: 'rankings.tabla', texto: 'Aquí ves la posición de cada banco.' },
      ],
    }),
    responder('Te muestro cómo ver el ranking de COMERCIO en tres pasos.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo veo el ranking de comercio?' }, 'publico');
  assert.equal(cuerpo.verificada, true);
  assert.deepEqual(cuerpo.guia.pasos.map((p) => [p.ruta, p.guia]), [
    [null, 'global.menu-rankings'],
    ['/rankings', 'rankings.selector-ranking'],
    ['/rankings', 'rankings.tabla'],
  ]);
  assert.deepEqual(cuerpo.consultas, []); // la guía no consulta la API
  const guiar = cliente.llamadas[0].tools.find((t) => t.name === 'guiar_usuario');
  assert.ok(!guiar.input_schema.properties.pasos.items.properties.guia.enum.includes('admin.subir-archivo'));
});

test('guía: si señala algo que el perfil no ve, vuelve como error y corrige', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('guiar_usuario', { pasos: [{ guia: 'admin.subir-archivo', texto: 'Sube el archivo.' }] }),
    (params) => {
      const resultado = params.messages.at(-1).content[0];
      assert.equal(resultado.is_error, true);
      assert.match(resultado.content, /no está disponible para el perfil publico/);
      return usarHerramienta('guiar_usuario', { pasos: [{ guia: 'global.selector-perfil', texto: 'Cambia al perfil Administrador.' }] })();
    },
    responder('Cargar un período es una opción del perfil Administrador.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo cargo un período?' }, 'publico');
  assert.deepEqual(cuerpo.guia.pasos, [{ ruta: null, guia: 'global.selector-perfil', texto: 'Cambia al perfil Administrador.' }]);
});

test('guía: un número inventado en los pasos invalida la respuesta', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('guiar_usuario', { pasos: [{ guia: 'rankings.tabla', texto: 'El líder tiene 987654321 de saldo.' }] }),
    responder('Listo.'),
    responder('Listo.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Dónde veo el saldo?' });
  assert.equal(cuerpo.verificada, false);
  assert.equal(cuerpo.guia, null);
});

test('GET /api/ia/guia lista los elementos del perfil', async () => {
  const base = await levantar({ apiKey: '' });
  const publico = await (await fetch(`${base}/ia/guia`)).json();
  const admin = await (await fetch(`${base}/ia/guia`, { headers: { 'X-Perfil': 'admin' } })).json();
  assert.equal(publico.perfil, 'publico');
  assert.ok(publico.elementos.some((e) => e.guia === 'rankings.tabla' && e.ruta === '/rankings'));
  assert.ok(!publico.elementos.some((e) => e.guia.startsWith('admin.')));
  assert.ok(admin.elementos.some((e) => e.guia === 'admin.bitacora'));
  assert.deepEqual(Object.keys(admin.elementos[0]), ['guia', 'ruta', 'descripcion']);
});

test('si la IA falla, la respuesta trae guia: null', async () => {
  const cliente = { beta: { messages: { create: async () => { throw new Error('sin red'); } } } };
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo veo los rankings?' });
  assert.equal(cuerpo.guia, null);
});
