// Punto de entrada del servidor MCP por stdio (lo lanza el cliente MCP, por ejemplo Claude Desktop).
// Requiere la API corriendo (npm start). Variables opcionales:
//   MCP_API_URL por defecto http://localhost:3001/api
//   MCP_PERFIL  publico (por defecto), analista o admin: se manda en X-Perfil (#28)
// Importante: stdout es el canal del protocolo; los mensajes de diagnóstico van por stderr.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { crearServidorMcp } from './servidor.js';
import { crearEjecutor } from '../ai/herramientas.js';
import { PERFILES } from '../middleware/perfiles.js';

const apiUrl = (process.env.MCP_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const perfil = (process.env.MCP_PERFIL || 'publico').trim().toLowerCase();
if (!PERFILES.includes(perfil)) {
  console.error(`MCP_PERFIL debe ser ${PERFILES.join(', ')} (llegó "${process.env.MCP_PERFIL}").`);
  process.exit(1);
}

const servidor = crearServidorMcp({ ejecutar: crearEjecutor(apiUrl, { perfil }), perfil });
await servidor.connect(new StdioServerTransport());
console.error(`Servidor MCP de rankings listo · API: ${apiUrl} · perfil: ${perfil}`);
