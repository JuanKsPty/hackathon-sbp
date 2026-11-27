// Punto de entrada del servidor MCP por stdio (lo lanza el cliente MCP, por ejemplo Claude Desktop).
// Requiere la API corriendo (npm start). Variable opcional: API_URL (por defecto http://localhost:3001/api).
// Importante: stdout es el canal del protocolo; los mensajes de diagnóstico van por stderr.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { crearServidorMcp } from './servidor.js';
import { crearEjecutor } from '../ai/herramientas.js';

const apiUrl = (process.env.API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

const servidor = crearServidorMcp({ ejecutar: crearEjecutor(apiUrl) });
await servidor.connect(new StdioServerTransport());
console.error(`Servidor MCP de rankings listo · API: ${apiUrl}`);
