// URL de la API que consultan las herramientas de la IA (agente #3 y MCP remoto #81).
// Siempre la del propio server (mismo proceso o contenedor), nunca una armada con datos de la
// petición: con el header Host, cualquiera podría redirigir las consultas a otro servidor y la IA
// presentaría esas cifras como verificadas (SSRF, issue #89). Se lee en cada uso para que los tests
// y el despliegue puedan fijarla con API_INTERNA (o MCP_API_INTERNA, el nombre anterior).
export function urlApiInterna() {
  const configurada = process.env.API_INTERNA || process.env.MCP_API_INTERNA;
  return (configurada || `http://127.0.0.1:${process.env.PORT ?? 3001}/api`).replace(/\/$/, '');
}
