# Servidor MCP (#6)

Permite consultar los rankings desde **Claude Desktop** (o cualquier cliente [MCP](https://modelcontextprotocol.io)) con las mismas 7 herramientas de solo lectura del agente de exploración ([`ai/herramientas.js`](../ai/herramientas.js)): períodos, catálogos, rankings, subactividades, calidad, excluidas y movimientos.

El servidor MCP **no calcula ni lee la base de datos**: cada herramienta es un GET a la API del motor. Por eso sigue funcionando igual si los datos pasan a otra fuente (por ejemplo Supabase).

Hay dos formas de conectarlo:

- **Remoto (#81), la más simple para la demo:** contra la app desplegada, pegando una URL. No hace falta clonar el repo ni instalar Node.
- **Local (stdio):** Claude Desktop lanza `index.js` en tu PC y consulta la API que le indiques.

## Uso remoto (app desplegada)

La URL del conector es la de cada sitio más `/api/mcp`. El perfil sale del sitio, no de la URL (#120):

| Sitio | URL | Perfil |
| :--- | :--- | :--- |
| Público | `https://sbp.juank.tech/api/mcp` | Público (sin movimientos) |
| Interno | `https://interno.sbp.juank.tech/api/mcp` con `Authorization: Bearer <MCP_TOKEN>` | Analista |

`MCP_TOKEN` va en el `.env` del server (Dokploy), nunca en el repo (R5). Sin token, el MCP interno responde 401.

- **Claude (web o Desktop):** **Settings → Connectors → Add custom connector**, pega la URL y guarda. En un chat, activa el conector y pregunta.
- **Claude Code:** `claude mcp add --transport http rankings-sbp https://sbp.juank.tech/api/mcp`, o el interno con `--header "Authorization: Bearer <MCP_TOKEN>"`.
- **Prueba rápida sin cliente:**
  ```bash
  curl -s -X POST "https://sbp.juank.tech/api/mcp" \
    -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  ```

Las herramientas son de solo lectura y con Público no se ofrece la de movimientos. `?perfil=publico|analista|admin` solo vale en llamadas directas al API desde la misma máquina (sin pasar por nginx), por ejemplo en pruebas locales.

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
