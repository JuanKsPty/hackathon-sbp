# Servidor MCP (#6)

Permite consultar los rankings desde **Claude Desktop** (o cualquier cliente [MCP](https://modelcontextprotocol.io)) con las mismas 7 herramientas de solo lectura del agente de exploración ([`ai/herramientas.js`](../ai/herramientas.js)): períodos, catálogos, rankings, subactividades, calidad, excluidas y movimientos.

El servidor MCP **no calcula ni lee la base de datos**: cada herramienta es un GET a la API del motor. Por eso sigue funcionando igual si los datos pasan a otra fuente (por ejemplo Supabase).

## Uso

1. Levanta la API: `cd server && npm start` (queda en `http://localhost:3001/api`).
2. En Claude Desktop: **Settings → Developer → Edit Config** y agrega (con la ruta absoluta de tu clon):

```json
{
  "mcpServers": {
    "rankings-sbp": {
      "command": "node",
      "args": ["C:/ruta/a/hackathon-sbp/server/src/mcp/index.js"],
      "env": { "API_URL": "http://localhost:3001/api" }
    }
  }
}
```

3. Reinicia Claude Desktop y pregunta, por ejemplo: *"¿Quién lidera COMERCIO en septiembre y qué cambió respecto de agosto?"*

También se puede lanzar a mano con `npm run mcp` (usa stdio; los mensajes de diagnóstico salen por stderr).

## Archivos

- [`servidor.js`](servidor.js): `crearServidorMcp({ ejecutar })`, que registra las herramientas (marcadas como solo lectura) y las instrucciones para el modelo: datos ficticios, citar sin recalcular e indicar el período.
- [`index.js`](index.js): punto de entrada por stdio. Variable opcional: `API_URL`.
- Tests: [`tests/mcp.test.js`](../../tests/mcp.test.js), en memoria y por stdio contra la API real.
