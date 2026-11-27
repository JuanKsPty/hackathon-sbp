// Corre la evaluación del agente (#72): hace cada pregunta de casos.js a POST /api/ia/preguntar y
// califica la respuesta contra lo que devuelve la API en ese momento.
//
//   npm run eval:agente                      lista los casos y lo esperado (no llama a la IA, no cuesta)
//   npm run eval:agente -- --confirmar       evalúa de verdad (cada caso consume la API de IA)
//   ... --caso guia-carga-admin              solo ese caso
//   ... --categoria ranking                  solo esa categoría
//   ... --repeticiones 3                     repite cada caso (la IA no siempre responde igual)
//
// Por defecto levanta la API en memoria con los datos de data/ (usa ANTHROPIC_API_KEY y AI_MODEL).
// Con EVAL_API_URL=https://.../api evalúa una API ya desplegada (la IA la configura ese servidor).
// El reporte queda en storage/evals/ (fuera del repo).
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { CASOS } from './casos.js';
import { calificar } from './calificar.js';

const { values: opciones } = parseArgs({
  options: {
    confirmar: { type: 'boolean', default: false },
    caso: { type: 'string' },
    categoria: { type: 'string' },
    repeticiones: { type: 'string', default: '1' },
  },
});

const casos = CASOS.filter((c) => (!opciones.caso || c.id === opciones.caso) && (!opciones.categoria || c.categoria === opciones.categoria));
const repeticiones = Math.max(1, Number(opciones.repeticiones) || 1);
if (casos.length === 0) {
  console.error('Ningún caso coincide con el filtro.');
  process.exit(1);
}

// API: la desplegada (EVAL_API_URL) o una en memoria con los datos locales.
async function levantarApi() {
  if (process.env.EVAL_API_URL) return { base: process.env.EVAL_API_URL.replace(/\/$/, ''), cerrar: () => {} };
  const { almacenDesdeCarpeta } = await import('../../src/datos/almacen.js');
  const { crearApp } = await import('../../src/app.js');
  const { crearObtenerMovimientos } = await import('../../src/routes/movimientos.js');
  const carpeta = path.resolve(process.env.DATA_DIR ?? fileURLToPath(new URL('../../../data', import.meta.url)));
  const almacen = almacenDesdeCarpeta(carpeta);
  const servidor = crearApp({ almacen, obtenerMovimientos: crearObtenerMovimientos(almacen) }).listen(0);
  await once(servidor, 'listening');
  return { base: `http://127.0.0.1:${servidor.address().port}/api`, cerrar: () => servidor.close() };
}

const { base, cerrar } = await levantarApi();
const api = async (ruta, perfil = 'publico') => {
  const r = await fetch(base + ruta, { headers: { 'X-Perfil': perfil } });
  if (!r.ok) throw new Error(`${ruta} respondió ${r.status}`);
  return r.json();
};

try {
  if (!opciones.confirmar) {
    console.log(`${casos.length} casos (sin --confirmar no se llama a la IA):\n`);
    for (const caso of casos) {
      const esperado = await caso.esperado(api);
      console.log(`· [${caso.categoria}] ${caso.id} (${caso.perfil})\n  ${caso.pregunta}\n  esperado: ${JSON.stringify(resumir(esperado))}\n`);
    }
    console.log(`Para evaluar: npm run eval:agente -- --confirmar (${casos.length * repeticiones} preguntas a la IA).`);
  } else {
    const estado = await api('/ia/estado');
    if (!estado.ia_disponible) {
      console.error('La IA no está disponible en esa API (falta ANTHROPIC_API_KEY). No se evaluó nada.');
      process.exitCode = 1;
    } else {
      console.log(`Evaluando ${casos.length} casos × ${repeticiones} con ${estado.modelo} en ${base}\n`);
      const resultados = [];
      for (const caso of casos) {
        const esperado = await caso.esperado(api);
        for (let i = 0; i < repeticiones; i++) {
          const inicio = Date.now();
          const r = await fetch(`${base}/ia/preguntar`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'X-Perfil': caso.perfil },
            body: JSON.stringify({ pregunta: caso.pregunta }),
          });
          const respuesta = await r.json();
          const ms = Date.now() - inicio;
          const { ok, fallas } = calificar(respuesta, esperado);
          resultados.push({ id: caso.id, categoria: caso.categoria, perfil: caso.perfil, pregunta: caso.pregunta, ok, fallas, ms, respuesta });
          console.log(`${ok ? '✔' : '✖'} ${caso.id} (${(ms / 1000).toFixed(1)} s)${ok ? '' : `\n    ${fallas.join('\n    ')}`}`);
        }
      }
      imprimirResumen(resultados);
      await guardarReporte({ fecha: new Date().toISOString(), base, modelo: estado.modelo, repeticiones, resultados });
    }
  }
} finally {
  cerrar();
}

function resumir(esperado) {
  const corto = { ...esperado };
  if (corto.contiene) corto.contiene = corto.contiene.map((v) => (Array.isArray(v) ? v[0] : v));
  if (corto.noContiene?.length > 3) corto.noContiene = [...corto.noContiene.slice(0, 3), '…'];
  if (corto.contienePatron) corto.contienePatron = corto.contienePatron.map(String);
  return corto;
}

function imprimirResumen(resultados) {
  const pct = (n, d) => `${d ? Math.round((n / d) * 100) : 0}%`;
  const aprobados = resultados.filter((r) => r.ok).length;
  const verificadas = resultados.filter((r) => r.respuesta.verificada).length;
  const promedioMs = resultados.reduce((s, r) => s + r.ms, 0) / resultados.length;
  console.log(`\nAprobados: ${aprobados}/${resultados.length} (${pct(aprobados, resultados.length)})`);
  console.log(`Respuestas verificadas: ${pct(verificadas, resultados.length)} · tiempo promedio: ${(promedioMs / 1000).toFixed(1)} s`);
  const categorias = [...new Set(resultados.map((r) => r.categoria))];
  for (const c of categorias) {
    const deC = resultados.filter((r) => r.categoria === c);
    console.log(`  ${c}: ${deC.filter((r) => r.ok).length}/${deC.length}`);
  }
}

async function guardarReporte(reporte) {
  const { carpetaStorage } = await import('../../src/datos/storage.js');
  const carpeta = path.join(carpetaStorage(), 'evals');
  fs.mkdirSync(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `agente-${reporte.fecha.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(archivo, JSON.stringify(reporte, null, 2));
  console.log(`\nReporte: ${archivo}`);
}
