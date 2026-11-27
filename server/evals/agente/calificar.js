// Califica una respuesta del agente contra lo esperado de un caso (casos.js).
// Devuelve { ok, fallas: string[] }. Las comparaciones de texto no distinguen mayúsculas.

import { extraerNumeros } from '../../src/ai/verificador.js';

const normalizar = (texto) => String(texto ?? '').toLowerCase();

// Una opción es numérica si es solo un número (con o sin separador de miles): '20', '1,234.56'.
const NUMERICA = /^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/;
const FECHA = /^\d{8}$/;
const aNumero = (opcion) => Number(String(opcion).replaceAll(',', ''));

// Los números se comparan como números, no como texto (#91): '20' no aparece en '18 (20260731)'.
// Las fechas AAAAMMDD no cuentan como número, salvo que se busque justo una fecha.
function numerosDelTexto(texto) {
  return extraerNumeros(texto).map((n) => ({ ...n, esFecha: FECHA.test(n.texto) }));
}
function aparece(texto, numeros, opcion) {
  if (!NUMERICA.test(String(opcion))) return texto.includes(normalizar(opcion));
  const buscado = aNumero(opcion);
  const esFecha = FECHA.test(String(opcion));
  return numeros.some((n) => n.valor === buscado && (esFecha || !n.esFecha));
}

export function calificar(respuesta, esperado) {
  const fallas = [];
  const texto = normalizar([respuesta.respuesta, ...(respuesta.guia?.pasos ?? []).map((p) => p.texto)].join('\n'));
  const numeros = numerosDelTexto(texto);
  const usadas = (respuesta.consultas ?? []).map((c) => c.herramienta);
  const guia = (respuesta.guia?.pasos ?? []).map((p) => p.guia);

  if (!respuesta.ia_disponible) fallas.push(`IA no disponible: ${respuesta.motivo}`);
  if (!respuesta.verificada) fallas.push(`respuesta no verificada: ${respuesta.motivo}`);

  for (const valor of esperado.contiene ?? []) {
    const opciones = Array.isArray(valor) ? valor : [valor];
    if (!opciones.some((o) => aparece(texto, numeros, o))) fallas.push(`falta "${opciones[0]}"`);
  }
  if (esperado.contieneAlguno && !esperado.contieneAlguno.some((o) => texto.includes(normalizar(o)))) {
    fallas.push(`falta alguno de: ${esperado.contieneAlguno.join(' | ')}`);
  }
  // Patrones: el número junto a su palabra (por ejemplo, '4 posiciones' y no '4.º lugar').
  for (const patron of esperado.contienePatron ?? []) {
    if (!patron.test(texto)) fallas.push(`falta el patrón ${patron}`);
  }
  for (const prohibido of esperado.noContiene ?? []) {
    if (aparece(texto, numeros, prohibido)) fallas.push(`no debía decir "${prohibido}"`);
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
