# Servidor MCP (#6)

Permite consultar los rankings desde **Claude Desktop** (o cualquier cliente [MCP](https://modelcontextprotocol.io)) con las mismas 7 herramientas de solo lectura del agente de exploración ([`ai/herramientas.js`](../ai/herramientas.js)): períodos, catálogos, rankings, subactividades, calidad, excluidas y movimientos.

El servidor MCP **no calcula ni lee la base de datos**: cada herramienta es un GET a la API del motor. Por eso sigue funcionando igual si los datos pasan a otra fuente (por ejemplo Supabase).

Hay dos formas de conectarlo:

- **Remoto (#81), la más simple para la demo:** contra la app desplegada, pegando una URL. No hace falta clonar el repo ni instalar Node.
- **Local (stdio):** Claude Desktop lanza `index.js` en tu PC y consulta la API que le indiques.

## Uso remoto (app desplegada)

La URL del conector es la de la app más `/api/mcp`, con el perfil como parámetro:

```
https://<dominio-de-la-app>/api/mcp?perfil=analista
```

- **Claude (web o Desktop):** **Settings → Connectors → Add custom connector**, pega la URL y guarda. En un chat, activa el conector y pregunta.
- **Claude Code:** `claude mcp add --transport http rankings-sbp "https://<dominio>/api/mcp?perfil=analista"`
- **Prueba rápida sin cliente:**
  ```bash
  curl -s -X POST "https://<dominio>/api/mcp?perfil=analista" \
    -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  ```

`perfil` es `publico` (por defecto), `analista` o `admin`. Es el mismo modo de perfiles de la app (sin contraseña): las herramientas son de solo lectura y con `publico` no se ofrece la de movimientos.

Cómo funciona: [`routes/mcp.js`](../routes/mcp.js) atiende cada POST sin guardar sesiones (modo sin estado) y las herramientas consultan la API del mismo contenedor (`http://127.0.0.1:$PORT/api`; se cambia con `MCP_API_INTERNA`). Pasa por el proxy `/api/` del client, así que no hace falta exponer otro puerto en Dokploy.

## Uso local (stdio)

1. Levanta la API: `cd server && npm start` (queda en `http://localhost:3001/api`).
2. En Claude Desktop: **Settings → Developer → Edit Config** y agrega (con la ruta absoluta de tu clon):

```json
{
  "mcpServers": {
    "rankings-sbp": {
      "command": "node",
      "args": ["C:/ruta/a/hackathon-sbp/server/src/mcp/index.js"],
      "env": { "MCP_API_URL": "http://localhost:3001/api", "MCP_PERFIL": "analista" }
    }
  }
}
```

3. Reinicia Claude Desktop y pregunta, por ejemplo: *"¿Quién lidera COMERCIO en septiembre y qué cambió respecto de agosto?"*

`MCP_PERFIL` (`publico` por defecto, `analista` o `admin`) es el perfil con el que consulta: con `publico` no se ofrece la herramienta de movimientos, que es de Analista y Admin.

También se puede lanzar a mano con `npm run mcp` (usa stdio; los mensajes de diagnóstico salen por stderr).

## Archivos

- [`servidor.js`](servidor.js): `crearServidorMcp({ ejecutar })`, que registra las herramientas (marcadas como solo lectura) y las instrucciones para el modelo: datos ficticios, citar sin recalcular e indicar el período.
- [`index.js`](index.js): punto de entrada por stdio. Variables opcionales: `MCP_API_URL` y `MCP_PERFIL` (no se usa `API_URL` porque en el `.env` raíz es el destino del proxy del client, sin `/api`).
- [`routes/mcp.js`](../routes/mcp.js): el MCP remoto en `/api/mcp`.
- Tests: [`tests/mcp.test.js`](../../tests/mcp.test.js) (en memoria y por stdio) y [`tests/mcp-remoto.test.js`](../../tests/mcp-remoto.test.js) (por HTTP), contra la API real.
