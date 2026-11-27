// Prueba de humo contra una app levantada o desplegada (#85): revisa que lo esencial responda.
// Uso:  BASE_URL=https://mi-app.ejemplo npm run humo      (por defecto http://localhost:3001)
// BASE_URL es la raíz de la app; si termina en /api también sirve. No modifica datos: solo hace
// GET y un "initialize" de MCP, que no guarda nada. Sale con código 1 si algún control falla.
import { pathToFileURL } from 'node:url';

const ESPERA_MS = 20000;

// Cada control recibe la base de la API (…/api) y lanza un Error si algo no está bien.
export const CONTROLES = [
  {
    nombre: 'GET /api/salud responde ok y tiene períodos cargados',
    revisar: async (api) => {
      const cuerpo = await pedirJson(`${api}/salud`);
      exigir(cuerpo.ok === true, 'ok no es true');
      exigir(Array.isArray(cuerpo.periodos) && cuerpo.periodos.length > 0, 'no hay períodos cargados');
      return `períodos: ${cuerpo.periodos.join(', ')}`;
    },
  },
  {
    nombre: 'GET /api/rankings trae 6 rankings con 12 bancos cada uno',
    revisar: async (api) => {
      const cuerpo = await pedirJson(`${api}/rankings`);
      exigir(cuerpo.rankings?.length === 6, `llegaron ${cuerpo.rankings?.length} rankings`);
      exigir(cuerpo.rankings.every((r) => r.bancos.length === 12), 'algún ranking no tiene 12 bancos');
      exigir(typeof cuerpo.aviso === 'string' && cuerpo.aviso !== '', 'falta el aviso de datos ficticios');
      return `período ${cuerpo.periodo}`;
    },
  },
  {
    nombre: 'GET /api/calidad: la cascada y las reconciliaciones cuadran',
    revisar: async (api) => {
      const { periodos } = await pedirJson(`${api}/calidad`);
      exigir(periodos?.length > 0, 'no hay períodos');
      for (const p of periodos) {
        exigir(p.Cascada_Cuadra === true, `la cascada de ${p.Fecha} no cuadra`);
        const descuadres = Object.entries(p.Reconciliaciones).filter(([, r]) => !r.ok).map(([nombre]) => nombre);
        exigir(descuadres.length === 0, `${p.Fecha} tiene descuadres en ${descuadres.join(', ')}`);
      }
      return `${periodos.length} períodos revisados`;
    },
  },
  {
    nombre: 'GET /api/docs muestra la documentación (Swagger UI)',
    revisar: async (api) => {
      const respuesta = await pedir(`${api}/docs/`);
      exigir(respuesta.status === 200, `respondió ${respuesta.status}`);
      exigir((respuesta.headers.get('content-type') ?? '').includes('text/html'), 'no respondió HTML');
      const openapi = await pedirJson(`${api}/openapi.json`);
      exigir(typeof openapi.openapi === 'string', '/api/openapi.json no es un documento OpenAPI');
      return `OpenAPI ${openapi.openapi}`;
    },
  },
  {
    nombre: 'POST /api/mcp responde al initialize del protocolo MCP',
    revisar: async (api) => {
      const respuesta = await pedir(`${api}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'humo', version: '1.0.0' } },
        }),
      });
      exigir(respuesta.status === 200, `respondió ${respuesta.status}`);
      const cuerpo = await respuesta.json();
      exigir(cuerpo.result?.serverInfo?.name, 'la respuesta no trae serverInfo');
      return `servidor ${cuerpo.result.serverInfo.name}`;
    },
  },
  {
    nombre: 'El perfil Público recibe 403 en lo que no le corresponde',
    revisar: async (api) => {
      for (const ruta of ['/bitacora', '/movimientos']) {
        const respuesta = await pedir(`${api}${ruta}`, { headers: { 'X-Perfil': 'publico' } });
        exigir(respuesta.status === 403, `GET /api${ruta} respondió ${respuesta.status}`);
        const cuerpo = await respuesta.json();
        exigir(cuerpo.error?.codigo === 'PERFIL_NO_AUTORIZADO', `GET /api${ruta}: código ${cuerpo.error?.codigo}`);
      }
      return '403 PERFIL_NO_AUTORIZADO en /api/bitacora y /api/movimientos';
    },
  },
];

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

async function pedir(url, opciones = {}) {
  return fetch(url, { ...opciones, signal: AbortSignal.timeout(ESPERA_MS) });
}

async function pedirJson(url) {
  const respuesta = await pedir(url);
  exigir(respuesta.status === 200, `${url} respondió ${respuesta.status}`);
  return respuesta.json();
}

// "https://app.ejemplo/" o "https://app.ejemplo/api" -> "https://app.ejemplo/api"
export function baseDeLaApi(baseUrl) {
  const raiz = String(baseUrl).trim().replace(/\/+$/, '').replace(/\/api$/, '');
  return `${raiz}/api`;
}

// Corre todos los controles y devuelve [{ nombre, ok, detalle }]. No se detiene en el primer fallo.
export async function correrHumo(baseUrl) {
  const api = baseDeLaApi(baseUrl);
  const resultados = [];
  for (const { nombre, revisar } of CONTROLES) {
    try {
      resultados.push({ nombre, ok: true, detalle: await revisar(api) });
    } catch (error) {
      const detalle = error.name === 'TimeoutError' ? `sin respuesta en ${ESPERA_MS / 1000} s` : error.message;
      resultados.push({ nombre, ok: false, detalle });
    }
  }
  return resultados;
}

async function principal() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  console.log(`Prueba de humo contra ${baseDeLaApi(baseUrl)}\n`);
  const resultados = await correrHumo(baseUrl);
  for (const { nombre, ok, detalle } of resultados) {
    console.log(`${ok ? '✔' : '✖'} ${nombre}${detalle ? ` · ${detalle}` : ''}`);
  }
  const fallidos = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - fallidos} de ${resultados.length} controles OK`);
  if (fallidos > 0) process.exitCode = 1;
}

// Solo corre cuando se ejecuta como script (npm run humo), no cuando lo importa una prueba.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await principal();
