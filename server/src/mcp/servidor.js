// Servidor MCP (#6): expone las mismas herramientas de solo lectura del agente de exploración
// (ai/herramientas.js) para consultar los rankings desde Claude Desktop u otro cliente MCP.
// Cada herramienta es un GET a la API del motor: este servidor no calcula ni lee la base de datos.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { definicionesPara } from '../ai/herramientas.js';

const INSTRUCCIONES = `Rankings de crédito bancario de la Hackathon SBP 2026 con datos 100% ficticios (12 bancos sintéticos).
Las herramientas devuelven resultados de un motor de cálculo determinista: cita los valores tal como vienen, sin recalcularlos.
Indica siempre el período (AAAAMMDD) y que los datos son ficticios y no constituyen una opinión formal de la SBP.`;

/**
 * @param {object} deps
 * @param {(nombre: string, entrada: object) => Promise<{ ok, datos?, error? }>} deps.ejecutar ejecutor de herramientas
 * @param {string} [deps.perfil] perfil con el que consulta (#28): solo se listan sus herramientas
 */
export function crearServidorMcp({ ejecutar, perfil = 'publico' }) {
  const servidor = new Server(
    { name: 'rankings-credito-sbp', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: INSTRUCCIONES },
  );

  servidor.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: definicionesPara(perfil).map(({ name, description, input_schema }) => ({
      name,
      description,
      inputSchema: input_schema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    })),
  }));

  servidor.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      const salida = await ejecutar(params.name, params.arguments ?? {});
      if (!salida.ok) return { content: [{ type: 'text', text: salida.error }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(salida.datos) }] };
    } catch (error) {
      // Por ejemplo, la API no está levantada.
      return { content: [{ type: 'text', text: `No se pudo consultar la API: ${error.message}` }], isError: true };
    }
  });

  return servidor;
}
