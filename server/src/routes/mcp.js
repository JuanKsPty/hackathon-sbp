// MCP remoto (#81): el mismo servidor MCP de src/mcp (#6), por HTTP en /api/mcp, para conectar
// Claude a la app desplegada pegando la URL como conector (sin clonar el repo ni instalar Node).
// Modo sin estado: cada POST crea su servidor y su transporte, así no se guardan sesiones en memoria.
// Las herramientas siguen siendo GET de solo lectura a la API, que se consulta por la red interna.
import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { crearServidorMcp } from '../mcp/servidor.js';
import { crearEjecutor } from '../ai/herramientas.js';
import { urlApiInterna } from '../ai/apiInterna.js';
import { PERFILES } from '../middleware/perfiles.js';
import { ErrorApi } from './errores.js';

// API que consultan las herramientas: la del propio server (mismo contenedor), no la URL pública.
const apiInternaPorDefecto = urlApiInterna;

// En los sitios desplegados el perfil sale del sitio: el público siempre es Público y el interno exige
// Authorization: Bearer MCP_TOKEN (perfil Analista). ?perfil= solo vale en llamadas directas al API
// (sin X-Sitio, desde la misma máquina), por ejemplo en pruebas locales.
function perfilDe(req) {
  // En los sitios (nginx) el perfil sale de la sesión o del token MCP, nunca de la URL.
  if (req.sitio === 'publico' || req.sitio === 'interno') return req.perfil ?? 'publico';
  const valor = req.query.perfil;
  if (valor === undefined) return req.perfil ?? 'publico';
  const perfil = String(valor).trim().toLowerCase();
  if (!PERFILES.includes(perfil)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `perfil debe ser ${PERFILES.join(', ')} (llegó "${valor}").`);
  }
  return perfil;
}

/** @param {{ apiInterna?: string, almacen?: object }} [opciones] base de la API para las herramientas (para tests) y almacén, de cuyo catálogo salen las descripciones */
export function rutasDeMcp({ apiInterna, almacen } = {}) {
  const rutas = Router();

  rutas.post('/mcp', async (req, res) => {
    const perfil = perfilDe(req);
    const servidor = crearServidorMcp({ ejecutar: crearEjecutor(apiInterna ?? apiInternaPorDefecto(), { perfil }), perfil, catalogos: almacen?.catalogos });
    const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      transporte.close();
      servidor.close();
    });
    await servidor.connect(transporte);
    await transporte.handleRequest(req, res, req.body);
  });

  // Sin estado no hay stream de notificaciones (GET) ni sesiones que cerrar (DELETE).
  const noPermitido = (req, res) =>
    res.status(405).set('Allow', 'POST').json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Método no permitido: este servidor MCP solo acepta POST (modo sin estado).' },
      id: null,
    });
  rutas.get('/mcp', noPermitido);
  rutas.delete('/mcp', noPermitido);

  return rutas;
}
