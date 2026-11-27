// Agente de exploración (#3) y rutas de IA, contra la API real con un cliente de Claude simulado.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { crearApp } from '../../src/app.js';
import { crearAlmacen } from '../../src/datos/almacen.js';
import { crearObtenerMovimientos } from '../../src/routes/movimientos.js';
import { crearEjecutor, DEFINICIONES } from '../../src/ai/herramientas.js';
import { OPCIONES, NOMBRES_PERFIL } from '../../src/middleware/perfiles.js';
import { paqueteReal } from '../ayuda.js';

const REGLA = { min_cambio_posicion_abs: 2, cambio_lider: true, min_var_saldo_pct_abs: 10 };
const servidores = [];
after(() => servidores.forEach((s) => s.close()));

async function levantar(opcionesIA) {
  const { catalogos, periodos } = paqueteReal();
  const almacen = crearAlmacen(catalogos, periodos);
  const obtenerMovimientos = crearObtenerMovimientos(almacen, { obtenerRegla: () => REGLA });
  const servidor = crearApp({ almacen, obtenerMovimientos, opcionesIA }).listen(0, '127.0.0.1');
  servidores.push(servidor);
  await once(servidor, 'listening');
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  process.env.API_INTERNA = base; // en el despliegue es http://127.0.0.1:$PORT/api (#89)
  return base;
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
  assert.equal(cliente.llamadas[0].tools.length, 10); // 7 de consulta + guiar_usuario + mostrar_graficos (#108) + usar_pantalla (#121)
  assert.match(cliente.llamadas[0].system, /No calcules nada/);
});

test('si inventa un número, pide corregir; si corrige, responde verificado', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('consultar_calidad', { periodo: '20260930' }),
    responder('En total se excluyeron 123456789 filas.'),
    (params) => {
      assert.match(params.messages.at(-1).content, /123456789/); // se le indica qué número no existe
      // El usuario no ve el aviso: la respuesta nueva no debe decir "te reescribo" (evaluación del agente).
      assert.match(params.messages.at(-1).content, /No menciones esta corrección/);
      assert.match(params.messages.at(-1).content, /separador de miles/);
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

test('el prompt pide montos con separador de miles y negarse a recomendar sin repetir "te conviene"', async () => {
  const cliente = clienteGuionado([responder('No doy recomendaciones de bancos.')]);
  const base = await levantar({ cliente });
  await preguntar(base, { pregunta: '¿En qué banco me conviene sacar un préstamo?' }, 'publico');
  const sistema = cliente.llamadas[0].system;
  assert.match(sistema, /separador de miles/);
  assert.match(sistema, /no das recomendaciones/);
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
  assert.equal(nombres.length, 9); // 6 de consulta + guiar_usuario + mostrar_graficos (#108) + usar_pantalla (#121)
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
      return usarHerramienta('guiar_usuario', { pasos: [{ guia: 'global.menu-rankings', texto: 'Mientras tanto, consulta los rankings aquí.' }] })();
    },
    responder('Cargar un período es una opción del perfil Administrador.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo cargo un período?' }, 'publico');
  assert.deepEqual(cuerpo.guia.pasos, [{ ruta: null, guia: 'global.menu-rankings', texto: 'Mientras tanto, consulta los rankings aquí.' }]);
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

test('#89: un Host falso no desvía las consultas de las herramientas (SSRF)', async () => {
  const { request } = await import('node:http');
  // Servidor espía: si el agente le consultara, devolvería cifras falsas.
  const { createServer } = await import('node:http');
  let consultasAlEspia = 0;
  const espia = createServer((req, res) => {
    consultasAlEspia++;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ rankings: [{ Ranking: 'HIPOTECARIO', bancos: [{ Banco: 'Banco Falso', Saldo_Actividad: 999 }] }] }));
  }).listen(0, '127.0.0.1');
  servidores.push(espia);
  await once(espia, 'listening');

  const cliente = clienteGuionado([
    usarHerramienta('consultar_rankings', { periodo: '20260930', ranking: 'HIPOTECARIO' }),
    (params) => {
      const datos = ultimoResultado(params);
      return responder(`Lidera ${datos.rankings[0].bancos[0].Banco}.`)();
    },
  ]);
  const base = await levantar({ cliente });
  const { port } = new URL(base);
  const cuerpo = await new Promise((resolver, rechazar) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/api/ia/preguntar',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Perfil': 'analista', Host: `127.0.0.1:${espia.address().port}` },
      },
      (res) => {
        let texto = '';
        res.on('data', (c) => (texto += c));
        res.on('end', () => resolver(JSON.parse(texto)));
      },
    );
    req.on('error', rechazar);
    req.end(JSON.stringify({ pregunta: '¿Quién lidera HIPOTECARIO?' }));
  });
  assert.equal(consultasAlEspia, 0);
  assert.equal(cuerpo.consultas[0].ok, true);
  assert.doesNotMatch(cuerpo.respuesta, /Banco Falso/);
});

test('#90: un fallo de red o una respuesta que no es JSON vuelve como error de herramienta', async () => {
  const caida = await crearEjecutor('http://127.0.0.1:9/api')('listar_periodos', {});
  assert.equal(caida.ok, false);
  assert.match(caida.error, /No se pudo consultar la API/);

  const noJson = await crearEjecutor('http://x/api', { fetchImpl: async () => new Response('<html>502</html>', { status: 502 }) })('listar_periodos', {});
  assert.equal(noJson.ok, false);
  assert.match(noJson.error, /No se pudo consultar la API/);
});

test('#90: si una herramienta falla, el agente sigue y responde', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('listar_periodos', {}),
    (params) => {
      const resultado = params.messages.at(-1).content[0];
      assert.equal(resultado.is_error, true);
      return responder('No pude consultar los períodos en este momento.')();
    },
  ]);
  const base = await levantar({ cliente });
  process.env.API_INTERNA = 'http://127.0.0.1:9/api'; // API interna caída
  const { cuerpo } = await preguntar(base, { pregunta: '¿Qué períodos hay?' });
  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.verificada, true);
  assert.equal(cuerpo.consultas[0].ok, false);
});

test('#86: una guía con números del catálogo ("entregable 4", "E1–E4") se acepta sin consultar datos', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('guiar_usuario', {
      pasos: [
        { guia: 'global.menu-reportes', texto: 'Entra a Reportes desde el menú.' },
        { guia: 'reportes.descarga-calidad', texto: 'Descarga el entregable 4: la calidad E1–E4.' },
      ],
    }),
    responder('Te muestro dónde descargar el entregable 4, el reporte de calidad de los datos.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Dónde descargo el reporte de calidad de los datos?' }, 'analista');
  assert.equal(cuerpo.verificada, true);
  assert.match(cuerpo.respuesta, /entregable 4/);
  assert.deepEqual(cuerpo.guia.pasos.map((p) => p.guia), ['global.menu-reportes', 'reportes.descarga-calidad']);
  assert.deepEqual(cuerpo.consultas, []); // no consultó datos: los números salen solo del catálogo
});

test('#86: un número suelto de la descripción del catálogo se acepta solo en el elemento que lo trae', async () => {
  // "Selector de los 6 rankings": el 6 es del catálogo de rankings.selector-ranking, no un dato del motor.
  const conSuElemento = clienteGuionado([
    usarHerramienta('guiar_usuario', { pasos: [{ guia: 'rankings.selector-ranking', texto: 'Elige uno de los 6 rankings.' }] }),
    responder('Te muestro dónde elegir el ranking.'),
  ]);
  const { cuerpo: aceptada } = await preguntar(await levantar({ cliente: conSuElemento }), { pregunta: '¿Dónde cambio de ranking?' }, 'publico');
  assert.equal(aceptada.verificada, true);
  assert.equal(aceptada.guia.pasos[0].guia, 'rankings.selector-ranking');

  // El mismo 6 en un paso que señala otro elemento (rankings.tabla no lo trae): se descarta.
  const conOtroElemento = clienteGuionado([
    usarHerramienta('guiar_usuario', { pasos: [{ guia: 'rankings.tabla', texto: 'Elige uno de los 6 rankings.' }] }),
    responder('Listo.'),
    responder('Listo.'),
  ]);
  const { cuerpo: descartada } = await preguntar(await levantar({ cliente: conOtroElemento }), { pregunta: '¿Dónde veo la tabla?' }, 'publico');
  assert.equal(descartada.verificada, false);
  assert.equal(descartada.guia, null);
});

test('#86 (B2): un número que escribe el usuario no cuenta como verificado', async () => {
  const cliente = clienteGuionado([
    responder('Sí, el saldo es 999,999.99.'),
    responder('Sí, el saldo es 999,999.99.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Es cierto que el saldo es 999,999.99?' });
  assert.equal(cuerpo.verificada, false);
  assert.equal(cuerpo.respuesta, null);
  assert.match(cuerpo.motivo, /números verificados/);
  // Se le pidió corregir citando solo lo que está en los resultados.
  assert.match(cliente.llamadas[1].messages.at(-1).content, /999,999\.99/);
});

test('#86 (B2): el número del usuario sí se puede citar si el motor también lo trae', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('listar_periodos', {}),
    (params) => {
      const total = ultimoResultado(params).periodos[0].Universo_Local_Valido;
      return responder(`El universo local válido es de ${total} filas.`)();
    },
  ]);
  const base = await levantar({ cliente });
  const periodos = await (await fetch(`${base}/periodos`)).json();
  const valor = periodos.periodos[0].Universo_Local_Valido;
  const { cuerpo } = await preguntar(base, { pregunta: `¿Es cierto que el universo local válido es de ${valor} filas?` });
  assert.equal(cuerpo.verificada, true);
});

test('#86 (B5): un rechazo de la IA no es "IA no disponible"', async () => {
  const cliente = clienteGuionado([() => ({ stop_reason: 'refusal', content: [] })]);
  const base = await levantar({ cliente });
  const { status, cuerpo } = await preguntar(base, { pregunta: 'Pregunta que la IA no contesta' });
  assert.equal(status, 200);
  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.respuesta, null);
  assert.equal(cuerpo.verificada, false);
  assert.equal(cuerpo.guia, null);
  assert.match(cuerpo.motivo, /^La IA no responde ese tipo de preguntas/);
  assert.doesNotMatch(cuerpo.motivo, /no disponible/);
});

test('#86 (B5): un rechazo después de consultar conserva las consultas hechas', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('listar_periodos', {}),
    () => ({ stop_reason: 'refusal', content: [] }),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Qué períodos hay?' });
  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.respuesta, null);
  assert.deepEqual(cuerpo.consultas.map((c) => c.herramienta), ['listar_periodos']);
});

test('#86 (B5): si la respuesta se corta por max_tokens, la IA sigue disponible', async () => {
  const cliente = clienteGuionado([() => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'El ranking' }] })]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: 'Cuéntame todo' });
  assert.equal(cuerpo.ia_disponible, true);
  assert.equal(cuerpo.respuesta, null);
  assert.match(cuerpo.motivo, /demasiado larga/);
});

test('#86 (B5): un stop_reason desconocido sigue siendo un fallo de la IA', async () => {
  const cliente = clienteGuionado([() => ({ stop_reason: 'pause_turn', content: [] })]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: 'Hola' });
  assert.equal(cuerpo.ia_disponible, false);
});

test('#86 (C4): el modelo recibe las herramientas con los rankings y bancos del catálogo cargado', async () => {
  const cliente = clienteGuionado([responder('Puedo consultar los rankings.')]);
  const base = await levantar({ cliente });
  await preguntar(base, { pregunta: '¿Qué puedes consultar?' });
  const catalogos = await (await fetch(`${base}/catalogos`)).json();
  const rankings = cliente.llamadas[0].tools.find((t) => t.name === 'consultar_rankings').input_schema.properties.ranking.description;
  for (const { Ranking } of catalogos.rankings) assert.ok(rankings.includes(Ranking), Ranking);
});

test('#86: los códigos (E1, SB21, AT03) en la respuesta no hacen que se descarte', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('consultar_calidad', { periodo: '20260731' }),
    (params) => {
      const periodo = ultimoResultado(params).periodos[0];
      return responder(`En julio (20260731) se excluyeron ${periodo.E1_Duplicados} préstamos duplicados (E1) del AT03; la regla SB21 no cambia ese conteo. Ver el entregable 4.`)();
    },
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuántos préstamos duplicados se excluyeron en julio?' }, 'publico');
  assert.equal(cuerpo.verificada, true);
  assert.match(cuerpo.respuesta, /\(E1\)/);
  assert.equal(cliente.llamadas.length, 2); // sin pedir corrección
});

// El prompt le dice a la IA qué opciones tiene el perfil de quien pregunta y cuáles son de otros (#86, #72).
async function promptPara(perfil) {
  const cliente = clienteGuionado([responder('Listo.')]);
  const base = await levantar({ cliente });
  await preguntar(base, { pregunta: '¿Qué puedo hacer en la app?' }, perfil);
  return cliente.llamadas[0].system;
}

test('prompt de Público: menciona al Analista y al Administrador para lo que no tiene, sin hablar del sitio interno', async () => {
  const sistema = await promptPara('publico');
  assert.match(sistema, /usa la consulta pública, sin inicio de sesión, con el perfil Público/);
  assert.doesNotMatch(sistema, /sitio interno|dos sitios/);
  assert.doesNotMatch(sistema, /selector de perfil/);
  const ajenas = sistema.split('Opciones que su perfil no tiene: ')[1].split('\n')[0];
  // Comparar períodos es del Analista (y del Administrador); cargar un período, solo del Administrador.
  assert.match(ajenas, /Comparar períodos \(solo Analista o Administrador\)/);
  assert.match(ajenas, /Cargar o actualizar un período \(solo Administrador\)/);
  // Y la instrucción: decir qué perfil la tiene, no armar un sustituto ni decir que la app no lo tiene.
  assert.match(sistema, /dile qué perfil tiene esa opción y que no forma parte de la consulta pública/);
  assert.match(sistema, /No menciones otros sitios/);
  assert.match(sistema, /no digas que la app no lo tiene/);
  assert.match(sistema, /Nunca armes una comparación por tu cuenta/);
});

test('prompt de Analista: lo del Administrador se usa entrando al sitio interno con esa cuenta', async () => {
  const sistema = await promptPara('analista');
  assert.match(sistema, /el perfil Analista\. Hay dos sitios/);
  assert.match(sistema, /entrar al sitio interno con una cuenta de ese perfil/);
});

test('el prompt sale de OPCIONES: cada opción aparece en el de cada perfil, como propia o ajena', async () => {
  for (const perfil of Object.keys(NOMBRES_PERFIL)) {
    const sistema = await promptPara(perfil);
    const [propias, ajenas = ''] = sistema.split('Opciones que su perfil no tiene: ');
    for (const { nombre, perfiles } of OPCIONES) {
      const donde = perfiles.includes(perfil) ? propias : ajenas;
      assert.ok(donde.includes(nombre), `${nombre} (${perfil})`);
    }
  }
});

test('prompt de Analista: lo del Administrador es ajeno y comparar períodos es propio; el Administrador no tiene opciones ajenas', async () => {
  const analista = await promptPara('analista');
  const ajenas = analista.split('Opciones que su perfil no tiene: ')[1].split('\n')[0];
  assert.match(ajenas, /Cargar o actualizar un período \(solo Administrador\)/);
  assert.doesNotMatch(ajenas, /Comparar períodos/);
  const admin = await promptPara('admin');
  assert.doesNotMatch(admin, /Opciones que su perfil no tiene/);
  assert.match(admin, /el perfil Administrador/);
});

// ---- Acciones de pantalla (#121) ----
const PANTALLA_OK = {
  modo: 'ejecutar',
  acciones: [
    { tipo: 'ir', ruta: '/rankings' },
    { tipo: 'ordenar', control: 'rankings.tabla', columna: 'Operaciones_Validas', orden: 'desc' },
    { tipo: 'resaltar', control: 'rankings.tabla', fila: '104' },
  ],
};

test('#121: ejecutar devuelve la pantalla validada, con la ruta del catálogo', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('usar_pantalla', PANTALLA_OK),
    (params) => {
      assert.match(params.messages.at(-1).content[0].content, /Pantalla lista \(ejecutar, 3 acciones\)/);
      return responder('Te dejé el ranking ordenado por operaciones y resalté al banco con más.')();
    },
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuál es el banco con más operaciones?' }, 'publico');
  assert.equal(cuerpo.verificada, true);
  assert.equal(cuerpo.pantalla.modo, 'ejecutar');
  assert.deepEqual(cuerpo.pantalla.acciones.map((a) => [a.tipo, a.ruta]), [['ir', '/rankings'], ['ordenar', '/rankings'], ['resaltar', '/rankings']]);
  // La herramienta se ofrece con los controles del perfil.
  const herramienta = cliente.llamadas[0].tools.find((t) => t.name === 'usar_pantalla');
  assert.ok(herramienta);
  assert.ok(!herramienta.input_schema.properties.acciones.items.properties.control.enum.includes('admin.bitacora'));
});

test('#121: una acción inválida vuelve como error y la IA puede corregirla', async () => {
  const cliente = clienteGuionado([
    usarHerramienta('usar_pantalla', { modo: 'ejecutar', acciones: [{ tipo: 'resaltar', control: 'rankings.tabla', fila: '999' }] }),
    (params) => {
      const resultado = params.messages.at(-1).content[0];
      assert.equal(resultado.is_error, true);
      assert.match(resultado.content, /Acción 1: rankings\.tabla: el banco "999" no existe/);
      return usarHerramienta('usar_pantalla', PANTALLA_OK)();
    },
    responder('Listo, quedó resaltado.'),
  ]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuál es el banco con más operaciones?' });
  assert.equal(cuerpo.pantalla.acciones.length, 3);
});

test('#121: un número inventado en el texto de una acción descarta la pantalla de la IA (quedan las reglas)', async () => {
  const conCifra = { modo: 'demostrar', acciones: [{ tipo: 'resaltar', control: 'rankings.tabla', fila: '104', texto: 'Tiene 987654 operaciones.' }] };
  const cliente = clienteGuionado([usarHerramienta('usar_pantalla', conCifra), responder('Listo.'), responder('Listo.')]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo veo el banco con más operaciones?' });
  assert.equal(cuerpo.verificada, false);
  // La pantalla de la IA se descartó; la de reglas no trae textos de la IA.
  assert.ok(cuerpo.pantalla.acciones.every((a) => !a.texto.includes('987654')));
});

test('#121: sin IA, las reglas dejan la pantalla lista', async () => {
  const base = await levantar({ apiKey: '' });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cuál es el banco con más operaciones en comercio?' });
  assert.equal(cuerpo.ia_disponible, false);
  assert.equal(cuerpo.pantalla.modo, 'ejecutar');
  assert.equal(cuerpo.pantalla.acciones.at(-1).tipo, 'resaltar');
  const otra = await preguntar(base, { pregunta: 'Hola' });
  assert.equal(otra.cuerpo.pantalla, null);
});

test('#121: las instrucciones explican cuándo ejecutar y cuándo demostrar', async () => {
  const cliente = clienteGuionado([responder('Hola.')]);
  const base = await levantar({ cliente });
  await preguntar(base, { pregunta: 'Hola' });
  assert.match(cliente.llamadas[0].system, /usar_pantalla en modo "ejecutar"/);
  assert.match(cliente.llamadas[0].system, /usar_pantalla en modo "demostrar"/);
});

test('respuestas directas: effort low y la instrucción de responder en una o dos frases', async () => {
  const cliente = clienteGuionado([responder('Hola.')])
  const base = await levantar({ cliente })
  await preguntar(base, { pregunta: 'Hola' })
  assert.equal(cliente.llamadas[0].output_config.effort, 'low')
  assert.match(cliente.llamadas[0].system, /Responde directo, en una sola frase y solo con lo que se pregunta/)
})

test('#121: si la pantalla de la IA queda a medias (no resalta nada), mandan las reglas', async () => {
  const aMedias = { modo: 'demostrar', acciones: [{ tipo: 'ir', ruta: '/rankings' }, { tipo: 'elegir', control: 'rankings.selector-ranking', valor: 'COMERCIO' }] };
  const cliente = clienteGuionado([usarHerramienta('usar_pantalla', aMedias), responder('Banco Solidez (112) lidera COMERCIO en 20260930.')]);
  const base = await levantar({ cliente });
  const { cuerpo } = await preguntar(base, { pregunta: '¿Cómo veo quién lidera COMERCIO?' });
  assert.equal(cuerpo.pantalla.acciones.at(-1).tipo, 'resaltar');
  assert.ok(cuerpo.pantalla.acciones.some((a) => a.tipo === 'elegir' && a.valor === 'COMERCIO'));
});
