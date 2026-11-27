// Califica una respuesta del agente contra lo esperado de un caso (casos.js).
// Devuelve { ok, fallas: string[] }. Las comparaciones de texto no distinguen mayúsculas.

const normalizar = (texto) => String(texto ?? '').toLowerCase();

export function calificar(respuesta, esperado) {
  const fallas = [];
  const texto = normalizar([respuesta.respuesta, ...(respuesta.guia?.pasos ?? []).map((p) => p.texto)].join('\n'));
  const usadas = (respuesta.consultas ?? []).map((c) => c.herramienta);
  const guia = (respuesta.guia?.pasos ?? []).map((p) => p.guia);

  if (!respuesta.ia_disponible) fallas.push(`IA no disponible: ${respuesta.motivo}`);
  if (!respuesta.verificada) fallas.push(`respuesta no verificada: ${respuesta.motivo}`);

  for (const valor of esperado.contiene ?? []) {
    const opciones = Array.isArray(valor) ? valor : [valor];
    if (!opciones.some((o) => texto.includes(normalizar(o)))) fallas.push(`falta "${opciones[0]}"`);
  }
  if (esperado.contieneAlguno && !esperado.contieneAlguno.some((o) => texto.includes(normalizar(o)))) {
    fallas.push(`falta alguno de: ${esperado.contieneAlguno.join(' | ')}`);
  }
  for (const prohibido of esperado.noContiene ?? []) {
    if (texto.includes(normalizar(prohibido))) fallas.push(`no debía decir "${prohibido}"`);
  }
  for (const h of esperado.herramientas ?? []) {
    if (!usadas.includes(h)) fallas.push(`no usó ${h}`);
  }
  for (const h of esperado.sinHerramientas ?? []) {
    if (usadas.includes(h)) fallas.push(`no debía usar ${h}`);
  }
  for (const g of esperado.guia ?? []) {
    if (!guia.includes(g)) fallas.push(`la guía no señala ${g}`);
  }
  for (const g of esperado.sinGuia ?? []) {
    if (guia.includes(g)) fallas.push(`la guía no debía señalar ${g}`);
  }
  return { ok: fallas.length === 0, fallas };
}
