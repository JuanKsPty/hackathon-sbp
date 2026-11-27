// MCP remoto (#81): el mismo servidor MCP de src/mcp (#6), por HTTP en /api/mcp, para conectar
// Claude a la app desplegada pegando la URL como conector (sin clonar el repo ni instalar Node).
// Modo sin estado: cada POST crea su servidor y su transporte, así no se guardan sesiones en memoria.
// Las herramientas siguen siendo GET de solo lectura a la API, que se consulta por la red interna.
import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { crearServidorMcp } from '../mcp/servidor.js';
import { crearEjecutor } from '../ai/herramientas.js';
import { PERFILES } from '../middleware/perfiles.js';
import { ErrorApi } from './errores.js';

// API que consultan las herramientas: la del propio server (mismo contenedor), no la URL pública.
const apiInternaPorDefecto = () => process.env.MCP_API_INTERNA || `http://127.0.0.1:${process.env.PORT ?? 3001}/api`;

// El perfil va en la URL del conector (?perfil=analista) porque los clientes MCP no siempre permiten
// headers propios. Sin parámetro, el X-Perfil de la petición (por defecto publico).
function perfilDe(req) {
  const valor = req.query.perfil;
  if (valor === undefined) return req.perfil ?? 'publico';
  const perfil = String(valor).trim().toLowerCase();
  if (!PERFILES.includes(perfil)) {
    throw new ErrorApi(400, 'PARAMETRO_INVALIDO', `perfil debe ser ${PERFILES.join(', ')} (llegó "${valor}").`);
  }
  return perfil;
}

/** @param {{ apiInterna?: string }} [opciones] base de la API para las herramientas (para tests) */
export function rutasDeMcp({ apiInterna } = {}) {
  const rutas = Router();

  rutas.post('/mcp', async (req, res) => {
    const perfil = perfilDe(req);
    const servidor = crearServidorMcp({ ejecutar: crearEjecutor(apiInterna ?? apiInternaPorDefecto(), { perfil }), perfil });
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
